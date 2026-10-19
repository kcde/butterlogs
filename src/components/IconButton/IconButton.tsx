import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "../cx";
import styles from "./IconButton.module.css";

/** Round 44px button holding only an icon: back, close, "…" menu, reset. */
export interface IconButtonProps {
  /** Lucide icon, 24px (18px for plain) */
  icon: ReactNode;
  /** Spoken name, e.g. "Back to recipes", "Reset labour to ₦3,000" */
  label: string;
  /** Filled: grey circle (top bars). Plain: no fill (inside rows and sheets) Default: 'filled'. */
  variant?: "filled" | "plain";
  href?: string;
  onClick?: () => void;
}

export function IconButton({ icon, label, variant = "filled", href, onClick }: IconButtonProps) {
  const className = cx(styles.iconButton, variant === "plain" && styles.plain);

  if (href) {
    return (
      <Link href={href} className={className} aria-label={label}>
        {icon}
      </Link>
    );
  }
  return (
    <button type="button" className={className} aria-label={label} onClick={onClick}>
      {icon}
    </button>
  );
}
