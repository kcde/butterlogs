"use client";

import { usePowerSync, useQuery, useStatus } from "@powersync/react";
import { useEffect, useState } from "react";
import type { Business } from "./schema";

export type BusinessRow = Business & { id: string };

const QUERY = `
  SELECT businesses.* FROM businesses
  JOIN business_members ON business_members.business_id = businesses.id
  WHERE business_members.user_id = ?
  LIMIT 1`;

/**
 * The signed-in user's business, from the phone's copy.
 * - 'ready': she has one.
 * - 'none': the first sync has finished and she has none yet (send her to Setup).
 * - 'loading': not known yet (first sync still running).
 */
export function useBusiness(userId: string) {
  const db = usePowerSync();
  const { hasSynced } = useStatus();
  const { data, isLoading } = useQuery<BusinessRow>(QUERY, [userId]);
  const business = data[0] ?? null;
  const [checked, setChecked] = useState<{ userId: string; none: boolean } | null>(null);

  // When the first sync completes, the watched query can still hold its old
  // (empty) result for a moment. Ask the database directly before saying
  // she has no business, so she's never bounced to Setup by mistake.
  const mayHaveNone = !business && !isLoading && !!hasSynced;
  useEffect(() => {
    if (!mayHaveNone) return;
    let current = true;
    void db.getOptional(QUERY, [userId]).then((row) => {
      if (current) setChecked({ userId, none: row === null });
    });
    return () => {
      current = false;
    };
  }, [mayHaveNone, db, userId]);
  const confirmedNone = mayHaveNone && checked?.userId === userId && checked.none;

  if (business) return { state: "ready" as const, business };
  if (confirmedNone) return { state: "none" as const, business: null };
  return { state: "loading" as const, business: null };
}
