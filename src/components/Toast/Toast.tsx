"use client";

import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import styles from "./Toast.module.css";

/** A short confirmation pill at the bottom, above the tab bar: "Chocolate Cake saved". */
export interface ToastProps {
  message: string;
  /** "Undo" */
  actionLabel?: string;
  onAction?: () => void;
  /** ms. Default: 3000. */
  duration?: number;
  /** Not in the design system's props: called once it has gone. */
  onDone?: () => void;
}

// One at a time: a screen shows the newest by giving it a new key.
export function Toast({ message, actionLabel, onAction, duration = 3000, onDone }: ToastProps) {
  const [shown, setShown] = useState(true);
  // The latest callback, so a new function from the screen doesn't restart the timer.
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setShown(false);
      done.current?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration]);

  return (
    <div role="status" className={styles.place}>
      {shown && (
        <span className={styles.toast}>
          <Check aria-hidden="true" />
          {message}
          {actionLabel && (
            <button type="button" onClick={onAction}>
              {actionLabel}
            </button>
          )}
        </span>
      )}
    </div>
  );
}
