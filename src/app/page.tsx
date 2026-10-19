"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import styles from "./spike.module.css";

// Placeholder home until M3 builds the real shell (Recipes, Ingredients, Settings).
export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    // Reads the stored session, so this works offline.
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) setEmail(data.session.user.email ?? "");
      else router.replace("/login");
    });
  }, [router]);

  if (email === null) return null;
  return (
    <main className={styles.page}>
      <h1>Butterlogs</h1>
      <p className={styles.status}>Signed in as {email}</p>
      <button
        type="button"
        onClick={() => void supabase.auth.signOut().then(() => router.replace("/login"))}
      >
        Sign out
      </button>
    </main>
  );
}
