"use client";

import { PowerSyncContext } from "@powersync/react";
import { PowerSyncDatabase } from "@powersync/web";
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

// PowerSync runs on the client only: mount this only in the browser, after
// the session is known (never during server rendering).
export function PowerSyncProvider({ children }: { children: ReactNode }) {
  const [database] = useState(getDb);

  useEffect(() => {
    void database.connect(new SupabaseConnector());

    const { data } = supabase.auth.onAuthStateChange((event) => {
      // Signing out clears the copy on the phone (F8).
      if (event === "SIGNED_OUT") void database.disconnectAndClear();
    });
    return () => data.subscription.unsubscribe();
  }, [database]);

  return <PowerSyncContext.Provider value={database}>{children}</PowerSyncContext.Provider>;
}
