import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { cx } from "../cx";
import styles from "./CheckRow.module.css";

/** A list row with a checkbox, for ticking several items at once in the add-ingredients sheet. */
export interface CheckRowProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Cost per unit, or the "add price" warning. */
  trailing?: ReactNode;
  /**
   * Not in the design system's props: already in the recipe, so it shows
   * ticked and greyed out and can't be changed here (agreed 27 Oct).
   */
  disabled?: boolean;
}

export function CheckRow({ label, checked, onChange, trailing, disabled = false }: CheckRowProps) {
  return (
    <label className={cx(styles.row, disabled && styles.disabled)}>
      {/* The real checkbox, visually replaced by the box. */}
      <input
        type="checkbox"
        className={styles.input}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className={cx(styles.box, checked && styles.on)} aria-hidden="true">
        {checked && <Check />}
      </span>
      <span className={styles.label}>{label}</span>
      {trailing && <span className={styles.trailing}>{trailing}</span>}
    </label>
  );
}
