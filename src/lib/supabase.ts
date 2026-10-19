import { createClient } from "@supabase/supabase-js";

// Browser-only client. The session is kept in localStorage, so she stays
// logged in offline (F1).
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
);
