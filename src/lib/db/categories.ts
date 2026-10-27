"use client";

import { useQuery } from "@powersync/react";
import type { AbstractPowerSyncDatabase } from "@powersync/web";
import type { Category } from "./schema";

export type CategoryRow = Category & { id: string };

const LIST = "SELECT * FROM categories WHERE business_id = ? ORDER BY position, name";

/** Her categories in her order (PRD F4). */
export function useCategories(businessId: string) {
  return useQuery<CategoryRow>(LIST, [businessId]).data;
}

/** Adds a category at the end of her list (the picker's "New category"). Returns its id. */
export async function addCategory(
  db: AbstractPowerSyncDatabase,
  { businessId, name, now = new Date() }: { businessId: string; name: string; now?: Date },
) {
  const id = crypto.randomUUID();
  const timestamp = now.toISOString();
  await db.writeTransaction(async (tx) => {
    const { last } = await tx.get<{ last: number | null }>(
      "SELECT MAX(position) AS last FROM categories WHERE business_id = ?",
      [businessId],
    );
    await tx.execute(
      "INSERT INTO categories (id, business_id, name, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      [id, businessId, name.trim(), (last ?? 0) + 1, timestamp, timestamp],
    );
  });
  return id;
}
