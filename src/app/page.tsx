"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { readPendingSignIn } from "@/lib/pending-sign-in";
import { getSignedInUser } from "@/lib/session";

// Opening the app: signed in → Recipes (which sends her to Setup if she has no
// business yet); waiting for a code → the code screen; otherwise Welcome.
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    void getSignedInUser().then((user) => {
      router.replace(user ? "/recipes" : readPendingSignIn() ? "/code" : "/welcome");
    });
  }, [router]);

  return null;
}
