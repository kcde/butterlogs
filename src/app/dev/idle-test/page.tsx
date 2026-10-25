"use client";

import { useEffect, useState } from "react";

// TEMPORARY (fix-idle-crash): starts only the parts named in ?with= ("db" for
// the PowerSync database, "auth" for the Supabase client) and counts the
// seconds since the page loaded, so a refresh shows as the count going back to
// 0. Remove before merging.
export default function IdleTestPage() {
  const [notes, setNotes] = useState<string[]>([]);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const note = (line: string) => setNotes((lines) => [...lines, line]);
    const wanted = (new URLSearchParams(location.search).get("with") ?? "").split(",");
    void Promise.resolve().then(() => {
      note(`Loaded at ${new Date().toLocaleTimeString()}`);
      if (!wanted.includes("db") && !wanted.includes("auth")) note("Nothing else started");
    });

    if (wanted.includes("db")) {
      void (async () => {
        const { PowerSyncDatabase } = await import("@powersync/web");
        const { AppSchema } = await import("@/lib/db/schema");
        // Its own file, so it never touches the app's database.
        const db = new PowerSyncDatabase({ schema: AppSchema, database: { dbFilename: "idle-test.db" } });
        await db.init();
        await db.get("SELECT count(*) AS n FROM businesses");
        note("Database open");
      })().catch((error) => note(`Database failed: ${String(error)}`));
    }

    if (wanted.includes("auth")) {
      void (async () => {
        const { supabase } = await import("@/lib/supabase");
        const { data } = await supabase.auth.getSession();
        note(data.session ? "Supabase client running, signed in" : "Supabase client running, signed out");
      })().catch((error) => note(`Supabase failed: ${String(error)}`));
    }
  }, []);

  return (
    <main style={{ padding: "var(--space-6) var(--space-4)", color: "var(--ink)" }}>
      <h1 style={{ font: "var(--type-title)" }}>Idle test</h1>
      <p style={{ font: "var(--type-big-number)", fontVariantNumeric: "tabular-nums" }}>{seconds}s</p>
      <ul>
        {notes.map((line, index) => (
          <li key={index}>{line}</li>
        ))}
      </ul>
    </main>
  );
}
