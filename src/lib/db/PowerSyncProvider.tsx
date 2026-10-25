"use client";

import { PowerSyncContext } from "@powersync/react";
import { PowerSyncDatabase } from "@powersync/web";
import * as Sentry from "@sentry/nextjs";
import { type ReactNode, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { SupabaseConnector } from "./connector";
import { AppSchema } from "./schema";

let db: PowerSyncDatabase | null = null;

// One database per browser.
function getDb() {
  db ??= new PowerSyncDatabase({
    schema: AppSchema,
    database: { dbFilename: "butterlogs.db" },
  });
  return db;
}

// TEMPORARY (fix-idle-crash): `?nosync=1` turns syncing off on this phone
// (the database still opens) until `?nosync=0`, to test whether syncing is
// what refreshes the page while it sits idle. Remove before merging.
function syncTurnedOff() {
  try {
    const param = new URLSearchParams(location.search).get("nosync");
    if (param === "1") localStorage.setItem("debug-nosync", "1");
    if (param === "0") localStorage.removeItem("debug-nosync");
    return localStorage.getItem("debug-nosync") === "1";
  } catch {
    return false;
  }
}

// PowerSync runs on the client only: mount this only in the browser, after
// the session is known (never during server rendering).
export function PowerSyncProvider({ children }: { children: ReactNode }) {
  const [database] = useState(getDb);

  useEffect(() => {
    const connector = new SupabaseConnector();
    const sync = !syncTurnedOff();
    Sentry.setTag("nosync", !sync);
    const connect = () => {
      if (sync) void database.connect(connector);
    };
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

  return <PowerSyncContext.Provider value={database}>{children}</PowerSyncContext.Provider>;
}
