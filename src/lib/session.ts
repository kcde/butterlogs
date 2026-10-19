// Who is signed in on this phone. She stays signed in offline (PRD F1).

import { supabase } from "./supabase";

export interface SignedInUser {
  id: string;
  email?: string;
}

// Where supabase-js keeps the login (its default storage key).
const STORAGE_KEY = `sb-${new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0]}-auth-token`;

/**
 * The signed-in user, or null when signed out. Answers at once from the login
 * stored on the phone, so screens open instantly and offline: once the
 * hour-long access token has expired, supabase-js keeps retrying the refresh
 * for up to 30 seconds while offline. The refresh runs in the background; if
 * the server rejects the login, supabase-js signs out (SIGNED_OUT) and the app
 * goes back to Welcome.
 */
export async function getSignedInUser(): Promise<SignedInUser | null> {
  const user = storedUser();
  if (user) void supabase.auth.getSession();
  return user;
}

function storedUser(): SignedInUser | null {
  try {
    const user = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null")?.user;
    return typeof user?.id === "string" ? { id: user.id, email: user.email } : null;
  } catch {
    return null;
  }
}
