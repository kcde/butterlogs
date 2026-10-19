"use client";

import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { TabBar } from "@/components/TabBar";
import { useBusiness } from "@/lib/db/useBusiness";
import { useUser } from "../user";
import styles from "./tabs.module.css";

// The tab screens: Recipes, Ingredients, Settings, with the floating tab bar.
// They need a business; without one she goes to Setup.
export default function TabsLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useUser();
  const { state } = useBusiness(user.id);

  useEffect(() => {
    if (state === "none") router.replace("/setup");
  }, [state, router]);

  // Blank until the phone knows (normally under a second; Loading comes in M8).
  if (state !== "ready") return null;

  const active = pathname.startsWith("/ingredients")
    ? "ingredients"
    : pathname.startsWith("/settings")
      ? "settings"
      : "recipes";
  return (
    <>
      <main className={styles.screen}>{children}</main>
      <TabBar active={active} />
    </>
  );
}
