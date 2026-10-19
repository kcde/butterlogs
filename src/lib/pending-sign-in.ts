// The sign-in waiting for its email code. Kept on the phone (not in the URL,
// so the email never lands in links or error reports) and in localStorage
// rather than sessionStorage: iPhone can close the installed app while she
// switches to Mail, and the code screen should still be there when she's back.

export type SignInIntent = "signup" | "login";

export interface PendingSignIn {
  email: string;
  intent: SignInIntent;
  /** Sign up only: sent again with "Resend code". */
  name?: string;
  /** When the last code was sent (ms). */
  sentAt: number;
}

const KEY = "butterlogs.pendingSignIn";
/** Supabase's email codes expire after 1 hour. */
const CODE_LIFETIME_MS = 60 * 60 * 1000;
/** Supabase sends at most one code a minute to an address. */
const RESEND_AFTER_MS = 60 * 1000;

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** Remembers that a code was just sent (now, unless told otherwise) and returns what was saved. */
export function savePendingSignIn(details: Omit<PendingSignIn, "sentAt">, sentAt = Date.now()): PendingSignIn {
  const pending = { ...details, sentAt };
  try {
    storage()?.setItem(KEY, JSON.stringify(pending));
  } catch {
    // Storage full or blocked: the code screen will send her back to start.
  }
  return pending;
}

/** The pending sign-in, or null when there's none or its code has expired. */
export function readPendingSignIn(now = Date.now()): PendingSignIn | null {
  let pending: Partial<PendingSignIn>;
  try {
    pending = JSON.parse(storage()?.getItem(KEY) ?? "null") ?? {};
  } catch {
    return null;
  }
  const { email, intent, name, sentAt } = pending;
  if (typeof email !== "string" || (intent !== "signup" && intent !== "login") || typeof sentAt !== "number") {
    return null;
  }
  if (now - sentAt > CODE_LIFETIME_MS) return null;
  return { email, intent, sentAt, ...(typeof name === "string" ? { name } : {}) };
}

export function clearPendingSignIn() {
  try {
    storage()?.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}

/** Seconds until "Resend code" can be used; 0 when it can. */
export function resendWaitSeconds(sentAt: number, now = Date.now()) {
  return Math.max(0, Math.ceil((sentAt + RESEND_AFTER_MS - now) / 1000));
}
