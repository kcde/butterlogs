"use client";

import { type KeyboardEvent, type PointerEvent, useRef } from "react";
import { flushSync } from "react-dom";

/** What the grip button gets from useReorder (not in the design system's props). */
export interface GripProps {
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerCancel: (event: PointerEvent<HTMLButtonElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}

const ROW = "[data-reorder-row]";
/** How long the other lines take to slide aside, and the dragged one to settle. */
const SLIDE_MS = 160;
const SLIDE = `transform ${SLIDE_MS}ms ease`;

interface Drag {
  pointerId: number;
  from: number;
  to: number;
  startY: number;
  rows: HTMLElement[];
  boxes: DOMRect[];
}

/** How far the dragged row moves to sit in slot `to` (rows can differ in height). */
function slotOffset({ from, to, boxes }: Drag) {
  if (to > from) return boxes[to].bottom - boxes[from].bottom;
  if (to < from) return boxes[to].top - boxes[from].top;
  return 0;
}

/**
 * Reordering rows by dragging their grip (EditLineRow README), with no
 * library. The rows sit side by side in one parent. While she drags, the row
 * follows her finger and the rows it passes slide out of the way; nothing in
 * React changes until she lets go, when the row settles into its slot and
 * `onMove(from, to)` is called once. ↑ and ↓ on the grip move it one place.
 */
export function useReorder(count: number, onMove: (from: number, to: number) => void) {
  const drag = useRef<Drag | null>(null);

  function shiftOthers(current: Drag) {
    const height = current.boxes[current.from].height;
    current.rows.forEach((row, index) => {
      if (index === current.from) return;
      const down = current.from < index && index <= current.to;
      const up = current.to <= index && index < current.from;
      row.style.transform = down ? `translateY(${-height}px)` : up ? `translateY(${height}px)` : "";
    });
  }

  function end(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (current?.pointerId !== event.pointerId) return;
    drag.current = null;
    const row = current.rows[current.from];
    // Settle into the slot, then put the rows back in place and commit the
    // new order in the same frame, so nothing jumps.
    row.style.transition = SLIDE;
    row.style.transform = `translateY(${slotOffset(current)}px)`;
    setTimeout(() => {
      for (const other of current.rows) {
        other.style.transition = "none";
        other.style.transform = "";
      }
      delete row.dataset.dragging;
      if (current.to !== current.from) flushSync(() => onMove(current.from, current.to));
      requestAnimationFrame(() => {
        for (const other of current.rows) other.style.transition = "";
      });
    }, SLIDE_MS);
  }

  return (index: number): GripProps => ({
    onPointerDown(event) {
      if (event.button !== 0 || drag.current) return;
      const row = event.currentTarget.closest<HTMLElement>(ROW);
      const rows = Array.from(row?.parentElement?.querySelectorAll<HTMLElement>(`:scope > ${ROW}`) ?? []);
      if (!row || rows.length === 0) return;
      // Keeps the moves coming to this grip wherever the finger goes.
      event.currentTarget.setPointerCapture(event.pointerId);
      const from = rows.indexOf(row);
      const boxes = rows.map((other) => other.getBoundingClientRect());
      drag.current = { pointerId: event.pointerId, from, to: from, startY: event.clientY, rows, boxes };
      row.dataset.dragging = "";
      row.style.transition = "none";
      for (const other of rows) if (other !== row) other.style.transition = SLIDE;
    },
    onPointerMove(event) {
      const current = drag.current;
      if (current?.pointerId !== event.pointerId) return;
      const { boxes, from } = current;
      // Follows the finger, but never past the first or last row.
      const dy = Math.min(
        Math.max(event.clientY - current.startY, boxes[0].top - boxes[from].top),
        boxes[boxes.length - 1].bottom - boxes[from].bottom,
      );
      current.rows[from].style.transform = `translateY(${dy}px)`;
      // The slot is where the row's middle now is, among the others' middles.
      const middle = boxes[from].top + boxes[from].height / 2 + dy;
      const middleOf = (at: number) => boxes[at].top + boxes[at].height / 2;
      let to = from;
      while (to < boxes.length - 1 && middle > middleOf(to + 1)) to++;
      while (to > 0 && middle < middleOf(to - 1)) to--;
      if (to !== current.to) {
        current.to = to;
        shiftOthers(current);
      }
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
