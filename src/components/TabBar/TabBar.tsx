import { BookOpen, Package, Settings } from "lucide-react";
import Link from "next/link";
import styles from "./TabBar.module.css";

/** The floating labelled bottom bar: Recipes · Ingredients · Settings. */
export interface TabBarProps {
  active: "recipes" | "ingredients" | "settings";
}

const TABS = [
  { id: "recipes", label: "Recipes", href: "/recipes", icon: BookOpen },
  { id: "ingredients", label: "Ingredients", href: "/ingredients", icon: Package },
  { id: "settings", label: "Settings", href: "/settings", icon: Settings },
] as const;

export function TabBar({ active }: TabBarProps) {
  return (
    <nav aria-label="Main" className={styles.bar}>
      {TABS.map(({ id, label, href, icon: Icon }) => (
        <Link key={id} href={href} className={styles.tab} aria-current={id === active ? "page" : undefined}>
          <Icon />
          {label}
        </Link>
      ))}
    </nav>
  );
}
