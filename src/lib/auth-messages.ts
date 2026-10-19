// Sign-in errors in plain words (PRD F1: "A wrong or expired code says so in
// plain words"). Pure, so it can be tested without Supabase.

export const OFFLINE_MESSAGE = "Signing in needs internet. Connect and try again.";

/** What Supabase Auth gives back: a code like "otp_expired", an HTTP status, an error name. */
export interface AuthErrorLike {
  code?: string;
  status?: number;
  name?: string;
}

export interface AuthMessage {
  message: string;
  /** True when we didn't expect this error, so it's worth reporting. */
  unexpected: boolean;
}

export function authMessage(error: AuthErrorLike): AuthMessage {
  // supabase-js couldn't reach the server.
  if (error.name === "AuthRetryableFetchError" || error.status === 0) {
    return { message: OFFLINE_MESSAGE, unexpected: false };
  }
  switch (error.code) {
    // Supabase uses one code for a wrong code and an expired one.
    case "otp_expired":
      return { message: "That code didn’t work. Check it, or ask for a new one.", unexpected: false };
    // Log in with shouldCreateUser: false and an email with no account.
    case "otp_disabled":
    case "user_not_found":
      return { message: "No account uses this email.", unexpected: false };
    case "email_address_invalid":
    case "validation_failed":
      return { message: "Check the email address.", unexpected: false };
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return { message: "Too many tries. Wait a minute, then try again.", unexpected: false };
  }
  if (error.status === 429) {
    return { message: "Too many tries. Wait a minute, then try again.", unexpected: false };
  }
  return { message: "Something went wrong. Try again.", unexpected: true };
}
