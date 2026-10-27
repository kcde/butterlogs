import type { ReactNode } from "react";
import { cx } from "../cx";
import styles from "./Card.module.css";

/** The grey tile everything sits on: list items, sections, the scale bar, stat tiles. */
export interface CardProps {
  /** Flush: no padding, for cards holding rows with their own padding. Default: 'default'. */
  padding?: "default" | "flush";
  /**
   * Default: 'div'. The design system also lists 'a' for a whole-card link, but
   * gives it no href; it's added when a screen needs one.
   */
  as?: "div" | "section";
  children: ReactNode;
}

export function Card({ padding = "default", as: Tag = "div", children }: CardProps) {
  return <Tag className={cx(styles.card, padding === "flush" && styles.flush)}>{children}</Tag>;
}
