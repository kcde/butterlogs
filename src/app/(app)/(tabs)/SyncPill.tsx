"use client";

import { SyncStatus } from "@/components/SyncStatus";
import { useSyncState } from "@/lib/db/useSyncState";

// The sync pill at the top of tab screens (PRD F8). Tapping it opens the sync
// sheet from M8; until then it only shows the state.
export function SyncPill() {
  const { state, pendingCount } = useSyncState();
  return <SyncStatus state={state} pendingCount={pendingCount} />;
}
