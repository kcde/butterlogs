"use client";

import { Share, SquarePlus } from "lucide-react";
import { BottomSheet } from "@/components/BottomSheet";
import { Button } from "@/components/Button";
import { StepList } from "@/components/StepList";
import styles from "./InstallGuide.module.css";

/** True when Butterlogs is already running from the home screen. */
export function isInstalled() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// InstallGuide.dc.html: how to put Butterlogs on the iPhone home screen.
export function InstallGuide({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <BottomSheet
      open={open}
      title="Put Butterlogs on your home screen"
      onClose={onClose}
      footer={
        <>
          <Button variant="primary" block onClick={onClose}>
            Done
          </Button>
          <Button variant="ghost" block onClick={onClose}>
            Maybe later
          </Button>
        </>
      }
    >
      <p className={styles.intro}>It opens full screen like a normal app and works without data.</p>
      <div className={styles.steps}>
        <StepList
          steps={[
            {
              text: (
                <>
                  In Safari, tap <b>Share</b>
                </>
              ),
              icon: <Share />,
            },
            {
              text: (
                <>
                  Scroll and tap <b>Add to Home Screen</b>
                </>
              ),
              icon: <SquarePlus />,
            },
            {
              text: (
                <>
                  Tap <b>Add</b>, then open Butterlogs from your home screen
                </>
              ),
            },
          ]}
        />
      </div>
      <p className={styles.note}>You can find this again in Settings.</p>
    </BottomSheet>
  );
}
