import { Plus } from "lucide-react";
import styles from "./newRecipe.module.css";

/**
 * "+ Add ingredients", "+ Add section", "+ Add overhead item": the mockups'
 * 44px grey pills (NewRecipe2.dc.html, NewRecipe3.dc.html), smaller than a
 * Button so three fit in a row.
 */
export function AddButton({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <button type="button" className={styles.pill} onClick={onClick}>
      <Plus aria-hidden="true" />
      {children}
    </button>
  );
}
