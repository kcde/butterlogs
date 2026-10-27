import { TriangleAlert } from "lucide-react";
import styles from "./IngredientCard.module.css";

/** One card per ingredient or per-piece supply: name, cost per unit on the right, pack details underneath. */
export interface IngredientCardProps {
  name: string;
  /** "₦1.20 / g"; null = missing price. */
  unitCost: string | null;
  /** "12.5 kg bag · ₦15,000 · updated 2 weeks ago" */
  meta?: string;
  /** Opens the ingredient sheet. */
  onClick: () => void;
}

export function IngredientCard({ name, unitCost, meta, onClick }: IngredientCardProps) {
  return (
    <button type="button" className={styles.card} onClick={onClick}>
      <span className={styles.head}>
        <span className={styles.name}>{name}</span>
        {unitCost === null ? (
          <span className={styles.missing}>
            <TriangleAlert aria-hidden="true" />
            add price
          </span>
        ) : (
          <span className={styles.price}>{unitCost}</span>
        )}
      </span>
      {/* A missing price has no meta line. */}
      {unitCost !== null && meta && <span className={styles.meta}>{meta}</span>}
    </button>
  );
}
