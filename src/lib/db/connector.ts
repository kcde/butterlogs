import * as Sentry from "@sentry/nextjs";
import {
  type AbstractPowerSyncDatabase,
  type CrudEntry,
  type PowerSyncBackendConnector,
  UpdateType,
} from "@powersync/web";
import { supabase } from "@/lib/supabase";

// Postgres errors that will fail every retry: data exceptions (22),
// constraint violations (23) and RLS denials (42501). PRD §6: drop the change
// so the queue never jams, and report it.
const PERMANENT_ERROR_CODES = [/^22...$/, /^23...$/, /^42501$/];

export class SupabaseConnector implements PowerSyncBackendConnector {
  async fetchCredentials() {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error || !session) {
      throw new Error("Not signed in");
    }
    return {
      endpoint: process.env.NEXT_PUBLIC_POWERSYNC_URL!,
      token: session.access_token,
    };
  }

  // Uploads go through supabase-js with her session, so RLS applies.
  async uploadData(database: AbstractPowerSyncDatabase) {
    const transaction = await database.getNextCrudTransaction();
    if (!transaction) return;

    let lastOp: CrudEntry | null = null;
    try {
      for (const op of transaction.crud) {
        lastOp = op;
        const table = supabase.from(op.table);
        const result =
          op.op === UpdateType.PUT
            ? await table.upsert({ ...op.opData, id: op.id })
            : op.op === UpdateType.PATCH
              ? await table.update(op.opData!).eq("id", op.id)
              : await table.delete().eq("id", op.id);
        if (result.error) throw result.error;
      }
      await transaction.complete();
    } catch (error) {
      const code = (error as { code?: unknown }).code;
      if (typeof code === "string" && PERMANENT_ERROR_CODES.some((re) => re.test(code))) {
        Sentry.captureException(error, {
          tags: { upload: "rejected" },
          extra: { table: lastOp?.table, op: lastOp?.op },
        });
        await transaction.complete();
      } else {
        // Temporary (offline, server busy): PowerSync retries.
        throw error;
      }
    }
  }
}
