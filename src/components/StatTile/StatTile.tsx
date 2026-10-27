import { cx } from "../cx";
import styles from "./StatTile.module.css";

/** The 2 × 2 summary of a recipe: total cost, cost per gram or piece, selling price, profit. */
export interface StatTileProps {
  /** Formatted. */
  value: string;
  label: string;
  /** Number turns `ink-muted`; a WarningBanner sits above the grid. Default: false. */
  incomplete?: boolean;
}

// The grid (2 columns, 12px gap) is laid out by the screen.
export function StatTile({ value, label, incomplete = false }: StatTileProps) {
  return (
    <div className={cx(styles.tile, incomplete && styles.incomplete)}>
      <span className={styles.value}>{value}</span>
      <span className={styles.label}>{label}</span>
    </div>
  );
}
