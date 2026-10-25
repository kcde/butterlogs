"use client";

import { PowerSyncContext } from "@powersync/react";
import { PowerSyncDatabase, WASQLiteVFS } from "@powersync/web";
import * as Sentry from "@sentry/nextjs";
import { type ReactNode, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { SupabaseConnector } from "./connector";
import { AppSchema } from "./schema";
import { openPreferringOpfs } from "./storage";

let opening: Promise<PowerSyncDatabase> | null = null;

// One database per browser, in OPFS where the phone allows it (see storage.ts:
// the default IndexedDB storage makes iOS 26 reload the page while idle).
function openDb() {
  opening ??= openPreferringOpfs({
    create: (storage) =>
      new PowerSyncDatabase({
        schema: AppSchema,
        database: {
          dbFilename: "butterlogs.db",
          vfs: storage === "opfs" ? WASQLiteVFS.OPFSCoopSyncVFS : WASQLiteVFS.IDBBatchAtomicVFS,
        },
      }),
    init: (db) => db.init(),
    close: (db) => db.close(),
    onFallback: (error) => Sentry.captureException(error, { tags: { storage: "opfs-failed" } }),
  }).then(
    ({ db, storage }) => {
      Sentry.setTag("storage", storage);
      return db;
    },
    (error: unknown) => {
      // Neither storage opened: let the next mount try again.
      opening = null;
      throw error;
    },
  );
  return opening;
}

// PowerSync runs on the client only: mount this only in the browser, after
// the session is known (never during server rendering).
export function PowerSyncProvider({ children }: { children: ReactNode }) {
  const [database, setDatabase] = useState<PowerSyncDatabase | null>(null);

  useEffect(() => {
    let current = true;
    openDb().then(
      (db) => {
        if (current) setDatabase(db);
      },
      (error: unknown) => Sentry.captureException(error, { tags: { storage: "open-failed" } }),
    );
    return () => {
      current = false;
    };
  }, []);

  useEffect(() => {
    if (!database) return;
    const connector = new SupabaseConnector();
    const connect = () => void database.connect(connector);
    connect();

    // Back online: reconnect now (which also uploads waiting changes) instead
    // of waiting for PowerSync's retry loop.
    window.addEventListener("online", connect);

    const { data } = supabase.auth.onAuthStateChange((event) => {
      // Signing out clears the copy on the phone (F8).
      if (event === "SIGNED_OUT") void database.disconnectAndClear();
    });
    return () => {
      window.removeEventListener("online", connect);
      data.subscription.unsubscribe();
    };
  }, [database]);

  // Blank while the database opens (normally well under a second).
  if (!database) return null;
  return <PowerSyncContext.Provider value={database}>{children}</PowerSyncContext.Provider>;
}
