import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "../cx";
import styles from "./Button.module.css";

/** Pill-shaped button for actions; one primary per screen, everything else secondary or ghost. */
export interface ButtonProps {
  /** Primary: caramel fill, at most one per screen. Secondary: grey fill. Ghost: caramel text only. Danger: red fill, only inside a confirm dialog. Default: 'secondary'. */
  variant?: "primary" | "secondary" | "ghost" | "danger";
  /** md is 52px tall; sm is 36px (inside cards, header actions) Default: 'md'. */
  size?: "md" | "sm";
  /** Full width (bottom of forms, action bars) Default: false. */
  block?: boolean;
  /** Lucide icon before the label. */
  icon?: ReactNode;
  /** Renders a link that looks like a button (navigation) */
  href?: string;
  /** Default: 'button'. */
  type?: "button" | "submit";
  /** 45% opacity. Say nearby why it is disabled. Default: false. */
  disabled?: boolean;
  onClick?: () => void;
  /** Label: verb first, sentence case ("Save recipe") */
  children: ReactNode;
}

export function Button({
  variant = "secondary",
  size = "md",
  block = false,
  icon,
  href,
  type = "button",
  disabled = false,
  onClick,
  children,
}: ButtonProps) {
  const className = cx(
    styles.button,
    variant !== "secondary" && styles[variant],
    size === "sm" && styles.sm,
    block && styles.block,
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {icon}
        {children}
      </Link>
    );
  }
  return (
    <button type={type} className={className} disabled={disabled} onClick={onClick}>
      {icon}
      {children}
    </button>
  );
}
