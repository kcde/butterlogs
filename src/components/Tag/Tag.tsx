import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cx } from "../cx";
import styles from "./Tag.module.css";

/** A small non-tappable label: a recipe's category, "edited", or the red "incomplete" warning. */
export interface TagProps {
  /** Warning always comes with the alert icon. Default: 'neutral'. */
  tone?: "neutral" | "warning";
  icon?: ReactNode;
  children: ReactNode;
}

export function Tag({ tone = "neutral", icon, children }: TagProps) {
  const shown = tone === "warning" ? (icon ?? <TriangleAlert />) : icon;
  return (
    <span className={cx(styles.tag, tone === "warning" && styles.warning)}>
      {shown && <span className={styles.icon} aria-hidden="true">{shown}</span>}
      {children}
    </span>
  );
}
