"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/Button";
import { IconButton } from "@/components/IconButton";
import { TextField } from "@/components/TextField";
import { sendCode } from "@/lib/auth";
import { readPendingSignIn, savePendingSignIn, type SignInIntent } from "@/lib/pending-sign-in";
import styles from "./signin.module.css";

const email = z.string().trim().pipe(z.email("Check the email address."));
const schemas = {
  signup: z.object({ name: z.string().trim().min(1, "Add your name."), email }),
  login: z.object({ name: z.string(), email }),
};

/**
 * Sign up (name + email) and log in (email): both email her a code, then
 * open the code screen. No passwords (PRD F1).
 */
export function SendCodeForm({ intent }: { intent: SignInIntent }) {
  const router = useRouter();
  const signup = intent === "signup";
  // Back from the code screen ("Change"): start from what she typed. This form
  // only renders on the phone, after the sign-in layout's session check.
  const [earlier] = useState(() => {
    const pending = readPendingSignIn();
    return pending?.intent === intent ? pending : null;
  });
  const { control, handleSubmit, setError, formState } = useForm({
    resolver: zodResolver(schemas[intent]),
    mode: "onTouched",
    defaultValues: { name: earlier?.name ?? "", email: earlier?.email ?? "" },
  });

  const onSubmit = handleSubmit(async ({ name, email }) => {
    const problem = await sendCode({ email, name: signup ? name : undefined, intent });
    if (problem) {
      setError("email", { message: problem });
      return;
    }
    savePendingSignIn({ email, intent, ...(signup ? { name } : {}) });
    router.push("/code");
  });

  return (
    <main className={styles.screen}>
      <form className={styles.form} noValidate onSubmit={onSubmit}>
        <IconButton href="/welcome" icon={<ChevronLeft />} label="Back" />
        <h1 className={styles.title}>{signup ? "Create your account" : "Welcome back"}</h1>
        {signup && (
          <p className={styles.subtitle}>Your recipes stay on your phone and back up to your account.</p>
        )}

        <div className={styles.fields}>
          {signup && (
            <Controller
              control={control}
              name="name"
              render={({ field, fieldState }) => (
                <TextField
                  label="Your name"
                  placeholder="First name is fine"
                  autoComplete="name"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={fieldState.error?.message}
                />
              )}
            />
          )}
          <Controller
            control={control}
            name="email"
            render={({ field, fieldState }) => (
              <TextField
                label="Email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
        </div>

        <div className={styles.bottom}>
          <Button variant="primary" block type="submit" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? "Sending…" : "Send code"}
          </Button>
          <p className={styles.switch}>
            {signup ? "Already have an account?" : "New here?"}{" "}
            <Link className={styles.link} href={signup ? "/login" : "/signup"}>
              {signup ? "Log in" : "Create an account"}
            </Link>
          </p>
        </div>
      </form>
    </main>
  );
}
