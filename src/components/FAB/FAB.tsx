import { Plus } from "lucide-react";
import Link from "next/link";
import styles from "./FAB.module.css";

/** The round caramel + button, bottom right above the tab bar, that creates the main thing on the current tab. */
export interface FABProps {
  /** "New recipe" or "New ingredient" */
  label: string;
  href?: string;
  onClick?: () => void;
}

export function FAB({ label, href, onClick }: FABProps) {
  if (href) {
    return (
      <Link href={href} className={styles.fab} aria-label={label}>
        <Plus aria-hidden="true" />
      </Link>
    );
  }
  return (
    <button type="button" className={styles.fab} aria-label={label} onClick={onClick}>
      <Plus aria-hidden="true" />
    </button>
  );
}
