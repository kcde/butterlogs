"use client";

import { LogOut, Smartphone } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/Button";
import { TopBar } from "@/components/TopBar";
import { supabase } from "@/lib/supabase";
import { InstallGuide } from "../InstallGuide";
import { SyncPill } from "../SyncPill";
import styles from "./settings.module.css";

// Stub until M8 builds Settings.dc.html. It keeps the install guide reachable
// (PRD F9) and lets her sign out; the full sign-out flow, which warns about
// waiting changes, is M8. Nothing can be waiting in M3.
export default function SettingsPage() {
  const [installOpen, setInstallOpen] = useState(false);

  return (
    <>
      <TopBar variant="tab" title="Settings" trailing={<SyncPill />} />
      <div className={styles.actions}>
        <Button block icon={<Smartphone />} onClick={() => setInstallOpen(true)}>
          Install on iPhone
        </Button>
        {/* Local sign-out works offline; the layout then goes to Welcome. */}
        <Button block icon={<LogOut />} onClick={() => void supabase.auth.signOut({ scope: "local" })}>
          Sign out
        </Button>
      </div>
      <InstallGuide open={installOpen} onClose={() => setInstallOpen(false)} />
    </>
  );
}
