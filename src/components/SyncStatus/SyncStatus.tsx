import { Check, CloudOff, RefreshCw } from "lucide-react";
import { cx } from "../cx";
import styles from "./SyncStatus.module.css";

/** Small pill at the top right of tab screens saying whether changes are saved to the cloud. */
export interface SyncStatusProps {
  state: "synced" | "pending" | "offline";
  /** For pending. */
  pendingCount?: number;
  /** Opens the "changes waiting" sheet. */
  onClick?: () => void;
}

export function SyncStatus({ state, pendingCount = 0, onClick }: SyncStatusProps) {
  const content =
    state === "synced" ? (
      <>
        <Check />
        All synced
      </>
    ) : state === "pending" ? (
      <>
        <RefreshCw />
        {pendingCount === 1 ? "1 change waiting" : `${pendingCount} changes waiting`}
      </>
    ) : (
      <>
        <CloudOff />
        Offline
      </>
    );
  const className = cx(styles.pill, state === "pending" && styles.pending, state === "synced" && styles.synced);

  if (onClick) {
    return (
      <button type="button" className={className} aria-live="polite" onClick={onClick}>
        {content}
      </button>
    );
  }
  return (
    <span className={className} aria-live="polite">
      {content}
    </span>
  );
}
