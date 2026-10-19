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

export function BottomSheet({ open, title, onClose, children, footer }: BottomSheetProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  // Native <dialog> with showModal(): focus stays inside and Escape closes it.
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
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
