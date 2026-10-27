import Link from "next/link";
import { Tag } from "../Tag";
import styles from "./RecipeCard.module.css";

/** One card per recipe in the Recipes list: name, category, and yield · total cost · cost per gram or piece. */
export interface RecipeCardProps {
  name: string;
  category?: string | null;
  /** "1,500 g" or "24 pcs" */
  yieldLabel: string;
  /** Formatted, e.g. "₦10,287" */
  totalCost?: string;
  /** "₦6.86/g" or "₦899 each" */
  unitCost?: string;
  /** Swaps the category tag for the warning tag. */
  incomplete?: { missingCount: number } | null;
  /** Opens the recipe at ×1. Optional until M6 builds the recipe screen: without it the card isn't a link. */
  href?: string;
  /**
   * Not in the design system's props: a recipe she's still building (agreed
   * 27 Oct). It shows a "Draft" tag and "Not finished", and opens with onClick.
   */
  draft?: boolean;
  onClick?: () => void;
}

const missingText = (count: number) => `${count} ingredient${count === 1 ? " has" : "s have"} no price`;

export function RecipeCard({ name, category, yieldLabel, totalCost, unitCost, incomplete, href, draft, onClick }: RecipeCardProps) {
  const tag = draft ? (
    <Tag>Draft</Tag>
  ) : incomplete ? (
    <Tag tone="warning">incomplete</Tag>
  ) : (
    category && <Tag>{category}</Tag>
  );

  const meta = draft ? (
    "Not finished"
  ) : incomplete ? (
    `${yieldLabel} · ${missingText(incomplete.missingCount)}`
  ) : (
    <>
      {yieldLabel}
      {totalCost && (
        <>
          {" · "}
          <strong>{totalCost}</strong>
        </>
      )}
      {unitCost && (
        <>
          {" · "}
          <strong>{unitCost}</strong>
        </>
      )}
    </>
  );

  const body = (
    <>
      <span className={styles.head}>
        <span className={styles.name}>{name}</span>
        {tag}
      </span>
      <span className={styles.meta}>{meta}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={styles.card}>
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" className={styles.card} onClick={onClick}>
        {body}
      </button>
    );
  }
  return <div className={styles.card}>{body}</div>;
}
