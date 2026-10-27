"use client";

import { type KeyboardEvent, type PointerEvent, useRef } from "react";

/** What the grip button gets from useReorder (not in the design system's props). */
export interface GripProps {
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerCancel: (event: PointerEvent<HTMLButtonElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}

const ROW = "[data-reorder-row]";

/**
 * Reordering rows by dragging their grip (EditLineRow README), with no
 * library. The rows sit side by side in one parent; as the finger passes over
 * another row, `onMove(from, to)` moves the line there, so the list follows the
 * finger. ↑ and ↓ on the grip do the same from the keyboard.
 */
export function useReorder(count: number, onMove: (from: number, to: number) => void) {
  const drag = useRef<{ index: number; pointerId: number; row: HTMLElement } | null>(null);

  function end(event: PointerEvent<HTMLButtonElement>) {
    if (drag.current?.pointerId !== event.pointerId) return;
    delete drag.current.row.dataset.dragging;
    drag.current = null;
  }

  return (index: number): GripProps => ({
    onPointerDown(event) {
      if (event.button !== 0) return;
      const row = event.currentTarget.closest<HTMLElement>(ROW);
      if (!row) return;
      // Keeps the moves coming to this grip even as its row moves under the finger.
      event.currentTarget.setPointerCapture(event.pointerId);
      row.dataset.dragging = "";
      drag.current = { index, pointerId: event.pointerId, row };
    },
    onPointerMove(event) {
      const current = drag.current;
      if (current?.pointerId !== event.pointerId) return;
      const rows = Array.from(current.row.parentElement?.querySelectorAll<HTMLElement>(`:scope > ${ROW}`) ?? []);
      const target = rows.findIndex((row) => {
        const box = row.getBoundingClientRect();
        return event.clientY >= box.top && event.clientY < box.bottom;
      });
      if (target < 0 || target === current.index) return;
      onMove(current.index, target);
      current.index = target;
    },
    onPointerUp: end,
    onPointerCancel: end,
    onKeyDown(event) {
      const to = event.key === "ArrowUp" ? index - 1 : event.key === "ArrowDown" ? index + 1 : null;
      if (to === null) return;
      event.preventDefault();
      if (to >= 0 && to < count) onMove(index, to);
    },
  });
}
