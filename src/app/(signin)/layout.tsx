"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { getSignedInUser } from "@/lib/session";

// Welcome, sign up, log in and the code screen: only for someone signed out.
export default function SignInLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [signedOut, setSignedOut] = useState(false);

  useEffect(() => {
    void getSignedInUser().then((user) => {
      if (user) router.replace("/recipes");
      else setSignedOut(true);
    });
  }, [router]);

  return signedOut ? children : null;
}
