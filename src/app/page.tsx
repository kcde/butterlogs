"use client";

import { usePowerSync, useQuery, useStatus } from "@powersync/react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { PowerSyncProvider } from "@/lib/db/PowerSyncProvider";
import type { Ingredient } from "@/lib/db/schema";
import { supabase } from "@/lib/supabase";
import styles from "./spike.module.css";

// M1 spike: an ingredient list that works offline. The real screens come in M5–M6.
export default function Home() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Reads the stored session, so this works offline.
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) setUserId(data.session.user.id);
      else router.replace("/login");
    });
  }, [router]);

  if (!userId) return null;
  return (
    <PowerSyncProvider>
      <Ingredients userId={userId} />
    </PowerSyncProvider>
  );
}

function Ingredients({ userId }: { userId: string }) {
  const db = usePowerSync();
  const status = useStatus();
  const { data: ingredients } = useQuery<Ingredient & { id: string }>(
    "SELECT * FROM ingredients ORDER BY created_at DESC",
  );
  const waiting = useUploadQueueCount();

  async function onAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const price = String(form.get("price"));
    const size = String(form.get("size"));
    await db.execute(
      `INSERT INTO ingredients (id, owner_id, name, unit, pack_price_minor, pack_size, pack_size_unit, created_at)
       VALUES (uuid(), ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        String(form.get("name")),
        String(form.get("unit")),
        // Empty price = missing; ₦0 is a real price. Stored in kobo.
        price === "" ? null : Math.round(Number(price) * 100),
        size === "" ? null : Number(size),
        String(form.get("unit")),
        new Date().toISOString(),
      ],
    );
    formElement.reset();
  }

  return (
    <main className={styles.page}>
      <h1>Ingredients</h1>
      <p className={styles.status}>
        {status.connected ? "Online" : "Offline"} · {waiting} waiting to upload
        {status.lastSyncedAt && ` · last synced ${status.lastSyncedAt.toLocaleTimeString()}`}
      </p>

      <form className={styles.form} onSubmit={onAdd}>
        <input name="name" placeholder="Name (e.g. Flour)" required />
        <div className={styles.row}>
          <input name="price" type="number" inputMode="decimal" min="0" step="any" placeholder="Pack price ₦" />
          <input name="size" type="number" inputMode="decimal" min="0" step="any" placeholder="Pack size" />
          <select name="unit" defaultValue="g">
            <option>g</option>
            <option>kg</option>
            <option>ml</option>
            <option>l</option>
            <option>pcs</option>
          </select>
        </div>
        <button type="submit">Add ingredient</button>
      </form>

      <ul className={styles.list}>
        {ingredients.map((ingredient) => (
          <li key={ingredient.id}>
            {ingredient.name} ·{" "}
            {ingredient.pack_price_minor === null
              ? "add price"
              : `₦${(ingredient.pack_price_minor / 100).toLocaleString("en-NG")}`}
            {ingredient.pack_size !== null && ` / ${ingredient.pack_size} ${ingredient.pack_size_unit}`}
          </li>
        ))}
      </ul>

      <button type="button" onClick={() => void supabase.auth.signOut()}>
        Sign out
      </button>
    </main>
  );
}

// How many local changes haven't reached the server yet.
function useUploadQueueCount() {
  const db = usePowerSync();
  const [count, setCount] = useState(0);
  useEffect(() => {
    const tick = () => void db.getUploadQueueStats().then((stats) => setCount(stats.count));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [db]);
  return count;
}
