"use client";

import { useQuery } from "@powersync/react";
import type { AbstractPowerSyncDatabase } from "@powersync/web";
import type { OverheadItem } from "./schema";

export type OverheadItemRow = OverheadItem & { id: string };

const LIST = "SELECT * FROM overhead_items WHERE business_id = ? AND deleted_at IS NULL ORDER BY position, name";

/** Her overhead items in her order, deleted ones left out (PRD F2). */
export function useOverheadItems(businessId: string) {
  return useQuery<OverheadItemRow>(LIST, [businessId]).data;
}

/** Adds an item at the end of her list, from the new-recipe flow (agreed 27 Oct). Returns its id. */
export async function addOverheadItem(
  db: AbstractPowerSyncDatabase,
  { businessId, name, now = new Date() }: { businessId: string; name: string; now?: Date },
) {
  const id = crypto.randomUUID();
  const timestamp = now.toISOString();
  await db.writeTransaction(async (tx) => {
    const { last } = await tx.get<{ last: number | null }>(
      "SELECT MAX(position) AS last FROM overhead_items WHERE business_id = ?",
      [businessId],
    );
    await tx.execute(
      "INSERT INTO overhead_items (id, business_id, name, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      [id, businessId, name.trim(), (last ?? 0) + 1, timestamp, timestamp],
    );
  });
  return id;
}
