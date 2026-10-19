"use client";

import { BookOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { TopBar } from "@/components/TopBar";
import { InstallGuide, isInstalled } from "../InstallGuide";
import { SyncPill } from "../SyncPill";

// EmptyRecipes.dc.html. The recipe list (Main.dc.html) comes in M5.
export default function RecipesPage() {
  const router = useRouter();
  // Setup sends her here with ?install=1: offer the install guide once, unless
  // she's already using the app from her home screen. (Tab screens only render
  // on the phone, after the session check, so window is there.)
  const [installOpen, setInstallOpen] = useState(
    () => new URLSearchParams(window.location.search).get("install") === "1" && !isInstalled(),
  );

  function closeInstall() {
    setInstallOpen(false);
    router.replace("/recipes");
  }

  return (
    <>
      <TopBar variant="tab" title="Recipes" trailing={<SyncPill />} />
      <EmptyState
        icon={<BookOpen />}
        title="No recipes yet"
        body="Add your ingredients and what you paid for them first. Then every recipe can work out its own cost."
        primaryAction={{ label: "Add ingredients", href: "/ingredients" }}
        footnote="Gas, electricity, transport, labour and packaging are already set up as overhead items."
      />
      <InstallGuide open={installOpen} onClose={closeInstall} />
    </>
  );
}
