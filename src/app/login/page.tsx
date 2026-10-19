"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";
import styles from "../spike.module.css";

// M1 spike: bare log in. The real LogIn screen is built in M3.
export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!navigator.onLine) {
      setError("The first sign-in needs internet.");
      return;
    }
    const form = new FormData(event.currentTarget);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    setBusy(false);
    if (error) setError(error.message);
    else router.replace("/");
  }

  return (
    <main className={styles.page}>
      <h1>Log in</h1>
      <form className={styles.form} onSubmit={onSubmit}>
        <input name="email" type="email" placeholder="Email" autoComplete="email" required />
        <input name="password" type="password" placeholder="Password" autoComplete="current-password" required />
        <button type="submit" disabled={busy}>
          {busy ? "Logging in…" : "Log in"}
        </button>
        {error && <p className={styles.error}>{error}</p>}
      </form>
    </main>
  );
}
