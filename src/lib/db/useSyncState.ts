"use client";

import { usePowerSync, useStatus } from "@powersync/react";
import { useEffect, useState } from "react";

export type SyncState = "synced" | "pending" | "offline";

/**
 * What the sync pill shows (PRD F8): changes waiting to upload come first,
 * then "Offline" when the phone or PowerSync is offline, otherwise "All synced".
 */
export function useSyncState(): { state: SyncState; pendingCount: number } {
  const status = useStatus();
  const pendingCount = useUploadQueueCount();
  const online = useOnline();

  if (pendingCount > 0) return { state: "pending", pendingCount };
  if (!online || (!status.connected && !status.connecting)) return { state: "offline", pendingCount };
  return { state: "synced", pendingCount };
}

// How many local changes haven't reached the server yet.
function useUploadQueueCount() {
  const db = usePowerSync();
  const [count, setCount] = useState(0);
  useEffect(() => {
    let current = true;
    const tick = () =>
      void db.getUploadQueueStats().then((stats) => {
        if (current) setCount(stats.count);
      });
    tick();
    const timer = setInterval(tick, 1000);
    return () => {
      current = false;
      clearInterval(timer);
    };
  }, [db]);
  return count;
}

function useOnline() {
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}
