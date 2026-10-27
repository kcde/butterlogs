import { TriangleAlert } from "lucide-react";
import styles from "./WarningBanner.module.css";

/** Red banner for anything that makes a number untrustworthy, with an icon, one sentence and an optional fix. */
export interface WarningBannerProps {
  message: string;
  /** "Add price" */
  actionLabel?: string;
  onAction?: () => void;
}

export function WarningBanner({ message, actionLabel, onAction }: WarningBannerProps) {
  return (
    <div role="status" className={styles.banner}>
      <TriangleAlert aria-hidden="true" />
      <p>{message}</p>
      {actionLabel && (
        <button type="button" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
