"use client";

import { LogOut, Trash2, TriangleAlert } from "lucide-react";
import { type MouseEvent, useEffect, useId, useRef } from "react";
import { Button } from "../Button";
import styles from "./ConfirmDialog.module.css";

/** Centred pop-up for decisions that can't be undone or lose work: delete, sign out, discard changes. */
export interface ConfirmDialogProps {
  open: boolean;
  /** A question or the fact: "Delete Vanilla Cake?", "Flour is in 14 recipes" */
  title: string;
  /** One line of consequence. */
  body: string;
  /** Default: null. */
  icon?: "trash" | "alert" | "logout" | null;
  /** Names of recipes affected; shows the first 3 and "and N more" */
  affected?: string[];
  /** "Delete", "Delete anyway", "Discard", "Sign out anyway" */
  confirmLabel: string;
  /** "Cancel", "Keep Flour", "Keep editing", "Stay signed in" */
  cancelLabel: string;
  /** Default: 'danger'. */
  tone?: "danger" | "neutral";
  /** Stack when labels are long. Default: 'row'. */
  layout?: "row" | "stack";
  onConfirm: () => void;
  onCancel: () => void;
}

const ICONS = { trash: <Trash2 />, alert: <TriangleAlert />, logout: <LogOut /> };
const SHOWN = 3;

export function ConfirmDialog({
  open,
  title,
  body,
  icon = null,
  affected,
  confirmLabel,
  cancelLabel,
  tone = "danger",
  layout = "row",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const bodyId = useId();
  const listId = useId();
  const list = affected?.length ? affected : null;

  // Native <dialog> with showModal(): focus starts on the first button (the
  // safe one), stays inside, and returns when it closes.
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  // The dialog fills the screen and is the scrim: a tap on it cancels.
  function onScrimClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) onCancel();
  }

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={list ? `${bodyId} ${listId}` : bodyId}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onClick={onScrimClick}
    >
      <div className={styles.panel}>
        {icon && (
          <span className={styles.icon} aria-hidden="true">
            {ICONS[icon]}
          </span>
        )}
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <p id={bodyId} className={styles.body}>
          {body}
        </p>
        {list && (
          <p id={listId} className={styles.list}>
            {list.slice(0, SHOWN).join(", ")}
            {list.length > SHOWN && <span className={styles.more}> and {list.length - SHOWN} more</span>}
          </p>
        )}
        <div className={layout === "stack" ? styles.stack : styles.row}>
          <Button block onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button block variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
