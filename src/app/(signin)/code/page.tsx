"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/Button";
import { CodeField } from "@/components/CodeField";
import { IconButton } from "@/components/IconButton";
import { sendCode, verifyCode } from "@/lib/auth";
import {
  clearPendingSignIn,
  type PendingSignIn,
  readPendingSignIn,
  resendWaitSeconds,
  savePendingSignIn,
} from "@/lib/pending-sign-in";
import styles from "../signin.module.css";

const CODE_LENGTH = 6;

const schema = z.object({
  code: z.string().regex(/^\d{6}$/, "Type the 6-digit code from the email."),
});

// 42 → "0:42"
const countdown = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

// Built from the sign-in pattern (PRD F1): type the code from the email.
// Six boxes; checking starts as soon as the last digit is in.
export default function CodePage() {
  const router = useRouter();
  // This screen only renders on the phone (the sign-in layout waits for the
  // session check), so it can read the pending sign-in straight away.
  const [pending, setPending] = useState<PendingSignIn | null>(() => readPendingSignIn());
  const [resent, setResent] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const { control, handleSubmit, setError, clearErrors, formState } = useForm({
    resolver: zodResolver(schema),
    mode: "onSubmit",
    defaultValues: { code: "" },
  });

  // Nothing waiting for a code (or it expired): start again.
  useEffect(() => {
    if (!pending) router.replace("/welcome");
  }, [pending, router]);

  // "Resend code" counts down the minute Supabase needs between codes.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!pending) return null;
  const wait = resendWaitSeconds(pending.sentAt, now);
  const back = pending.intent === "signup" ? "/signup" : "/login";

  const onSubmit = handleSubmit(async ({ code }) => {
    const problem = await verifyCode(pending.email, code);
    if (problem) {
      setError("code", { message: problem });
      return;
    }
    clearPendingSignIn();
    router.replace(pending.intent === "signup" ? "/setup" : "/recipes");
  });

  async function resend() {
    if (!pending) return;
    clearErrors("code");
    const problem = await sendCode(pending);
    if (problem) {
      setError("code", { message: problem });
      return;
    }
    const next = savePendingSignIn({ email: pending.email, intent: pending.intent, name: pending.name });
    setPending(next);
    setNow(next.sentAt);
    setResent(true);
  }

  return (
    <main className={styles.screen}>
      <form className={styles.form} noValidate onSubmit={onSubmit}>
        <IconButton href={back} icon={<ChevronLeft />} label="Back" />
        <h1 className={styles.title}>Check your email</h1>
        <p className={styles.subtitle}>
          {resent ? "We sent a new code to " : `We sent a ${CODE_LENGTH}-digit code to `}
          <span className={styles.email}>{pending.email}</span>.{" "}
          <Link className={styles.link} href={back}>
            Change
          </Link>
        </p>

        <div className={styles.fields}>
          <Controller
            control={control}
            name="code"
            render={({ field, fieldState }) => (
              <CodeField
                label="Code"
                length={CODE_LENGTH}
                autoFocus
                value={field.value}
                onChange={(code) => {
                  clearErrors("code");
                  field.onChange(code);
                  // The last digit is in: check it straight away.
                  if (code.length === CODE_LENGTH) void onSubmit();
                }}
                onBlur={field.onBlur}
                disabled={formState.isSubmitting}
                error={fieldState.error?.message}
                helper={formState.isSubmitting ? "Checking your code…" : undefined}
              />
            )}
          />
        </div>

        <div className={styles.bottom}>
          <Button variant="primary" block type="submit" disabled={formState.isSubmitting}>
            {pending.intent === "signup" ? "Create account" : "Log in"}
          </Button>
          <p className={styles.switch}>
            Didn’t get it?{" "}
            {wait > 0 ? (
              <span>Resend code in {countdown(wait)}</span>
            ) : (
              <button type="button" className={styles.linkButton} onClick={() => void resend()}>
                Resend code
              </button>
            )}
          </p>
        </div>
      </form>
    </main>
  );
}
