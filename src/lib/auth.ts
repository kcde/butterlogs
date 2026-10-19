// Sign in with a one-time email code (PRD F1). Each call returns null on
// success, or a plain-words message to show.

import * as Sentry from "@sentry/nextjs";
import type { AuthError } from "@supabase/supabase-js";
import { authMessage, OFFLINE_MESSAGE } from "./auth-messages";
import type { SignInIntent } from "./pending-sign-in";
import { supabase } from "./supabase";

function explain(error: AuthError) {
  const { message, unexpected } = authMessage(error);
  if (unexpected) Sentry.captureException(error, { tags: { auth: "code" } });
  return message;
}

/** Emails a 6-digit code. Sign up creates the account (with her name); log in never does. */
export async function sendCode({ email, name, intent }: { email: string; name?: string; intent: SignInIntent }) {
  if (!navigator.onLine) return OFFLINE_MESSAGE;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options:
      intent === "signup"
        ? { shouldCreateUser: true, data: { display_name: name } }
        : { shouldCreateUser: false },
  });
  return error ? explain(error) : null;
}

/** Checks the code; on success she's signed in on this phone. */
export async function verifyCode(email: string, code: string) {
  if (!navigator.onLine) return OFFLINE_MESSAGE;
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
  return error ? explain(error) : null;
}
