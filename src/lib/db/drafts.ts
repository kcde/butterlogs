"use client";

import { useQuery } from "@powersync/react";
import type { AbstractPowerSyncDatabase } from "@powersync/web";
import type { RecipeDraft } from "@/lib/recipes";
import type { RecipeDraftRow } from "./schema";

export type DraftRow = RecipeDraftRow & { id: string };

/** The step she was on: 1 Basics, 2 Ingredients, 3 Overhead & price. */
export type Step = 1 | 2 | 3;

const LIST = "SELECT * FROM recipe_drafts WHERE business_id = ?";

/** Her unfinished recipes on this phone (agreed 27 Oct). */
export function useDrafts(businessId: string) {
  return useQuery<DraftRow>(LIST, [businessId]);
}

/** One draft's form and step, or null if it's gone (saved or discarded). */
export async function loadDraft(db: AbstractPowerSyncDatabase, id: string) {
  const row = await db.getOptional<DraftRow>("SELECT * FROM recipe_drafts WHERE id = ?", [id]);
  if (!row?.form) return null;
  return { draft: JSON.parse(row.form) as RecipeDraft, step: (row.step ?? 1) as Step };
}

/** Keeps the draft as it is now, adding it the first time. Local only: nothing is uploaded. */
export async function saveDraft(
  db: AbstractPowerSyncDatabase,
  { id, businessId, draft, step, now = new Date() }: {
    id: string;
    businessId: string;
    draft: RecipeDraft;
    step: Step;
    now?: Date;
  },
) {
  const timestamp = now.toISOString();
  const values = [draft.name.trim(), draft.categoryId, step, JSON.stringify(draft), timestamp];
  await db.writeTransaction(async (tx) => {
    // PowerSync tables are views, so ask first rather than trusting rowsAffected.
    const existing = await tx.getOptional("SELECT 1 FROM recipe_drafts WHERE id = ?", [id]);
    if (existing) {
      await tx.execute(
        "UPDATE recipe_drafts SET name = ?, category_id = ?, step = ?, form = ?, updated_at = ? WHERE id = ?",
        [...values, id],
      );
      return;
    }
    await tx.execute(
      `INSERT INTO recipe_drafts (name, category_id, step, form, updated_at, id, business_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [...values, id, businessId, timestamp],
    );
  });
}

/** Throws the draft away (× → Discard). */
export async function deleteDraft(db: AbstractPowerSyncDatabase, id: string) {
  await db.execute("DELETE FROM recipe_drafts WHERE id = ?", [id]);
}
