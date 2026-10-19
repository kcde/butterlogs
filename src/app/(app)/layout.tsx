"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { PowerSyncProvider } from "@/lib/db/PowerSyncProvider";
import { getSignedInUser, type SignedInUser } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { UserContext } from "./user";

// Everything behind sign-in. PowerSync runs whenever she's signed in, on the
// phone only (nothing here is rendered on the server).
export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<SignedInUser | null>(null);

  useEffect(() => {
    void getSignedInUser().then((signedIn) => {
      if (signedIn) setUser(signedIn);
      else router.replace("/welcome");
    });
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") router.replace("/welcome");
    });
    return () => data.subscription.unsubscribe();
  }, [router]);

  if (!user) return null;
  return (
    <UserContext value={user}>
      <PowerSyncProvider>{children}</PowerSyncProvider>
    </UserContext>
  );
}
