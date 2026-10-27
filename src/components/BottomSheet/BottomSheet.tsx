"use client";

import { X } from "lucide-react";
import { type MouseEvent, type ReactNode, useEffect, useId, useRef } from "react";
import { IconButton } from "../IconButton";
import styles from "./BottomSheet.module.css";

/** A panel that slides up for short tasks: add ingredients, edit an ingredient, pick a category, install guide, sync details. */
export interface BottomSheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Main button, full width. */
  footer?: ReactNode;
}

// When one sheet hands over to another (New ingredient → Restock), the scrim
// stays dimmed instead of clearing and fading in again.
let lastClosed = Number.NEGATIVE_INFINITY;

export function BottomSheet({ open, title, onClose, children, footer }: BottomSheetProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  // Native <dialog> with showModal(): focus stays inside and Escape closes it.
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) {
      element.toggleAttribute("data-handoff", performance.now() - lastClosed < 100);
      element.showModal();
    }
    if (!open && element.open) {
      element.close();
      lastClosed = performance.now();
    }
  }, [open]);

  // Stay above the iPhone keyboard (building-in-code.md): while open, the
  // dialog covers only the visible part of the screen, measured at runtime, so
  // the sheet sits on top of the keyboard and its body scrolls.
  useEffect(() => {
    const element = dialog.current;
    const viewport = window.visualViewport;
    if (!open || !element || !viewport) return;
    const fit = () => {
      element.style.setProperty("--visible-top", `${viewport.offsetTop}px`);
      element.style.setProperty("--visible-height", `${viewport.height}px`);
    };
    // A field tapped while the keyboard opens can end up under it: bring it
    // back into view once the sheet has resized.
    const reveal = (event: FocusEvent) => {
      const field = event.target;
      if (field instanceof HTMLElement && field.matches("input, select, textarea")) {
        setTimeout(() => field.scrollIntoView({ block: "nearest" }), 300);
      }
    };
    fit();
    viewport.addEventListener("resize", fit);
    viewport.addEventListener("scroll", fit);
    element.addEventListener("focusin", reveal);
    return () => {
      viewport.removeEventListener("resize", fit);
      viewport.removeEventListener("scroll", fit);
      element.removeEventListener("focusin", reveal);
      element.style.removeProperty("--visible-top");
      element.style.removeProperty("--visible-height");
    };
  }, [open]);

  // The dialog fills the screen and is the scrim; a tap outside the panel lands on it.
  function onScrimClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={onScrimClick}
    >
      <div className={styles.sheet}>
        <div className={styles.grabber} aria-hidden="true" />
        <div className={styles.head}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <IconButton variant="plain" icon={<X />} label="Close" onClick={onClose} />
        </div>
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </dialog>
  );
}
