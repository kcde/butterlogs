"use client";

import {
  type Announcements,
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
  KeyboardSensor,
  PointerSensor,
  type UniqueIdentifier,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type CSSProperties, type ReactNode, useId } from "react";
import { EditLineRow, type EditLineRowProps } from "./EditLineRow";

/** What a row and its grip get from dnd-kit (not in the design system's props). */
export interface SortableLine {
  rowRef: (node: HTMLElement | null) => void;
  rowStyle: CSSProperties;
  dragging: boolean;
  gripRef: (node: HTMLElement | null) => void;
  gripAttributes: DraggableAttributes;
  gripListeners: DraggableSyntheticListeners;
}

const MODIFIERS = [restrictToVerticalAxis, restrictToParentElement];
const INSTRUCTIONS = { draggable: "Press Space to pick up, ↑ or ↓ to move, Space to drop, Esc to cancel." };

export interface SortableLinesProps {
  /** The lines' ids, in order. */
  ids: string[];
  /** A line's name for screen readers ("Sugar"), never its id. */
  nameOf: (id: string) => string;
  onMove: (from: number, to: number) => void;
  /** The lines' parent element, holding SortableLineRows: dragging stays inside it. */
  children: ReactNode;
}

/**
 * Lines reorder by dragging their grip (EditLineRow README), with dnd-kit:
 * the line follows the finger up and down inside its parent, the others slide
 * aside, and `onMove(from, to)` is called once on release. With a keyboard,
 * Space picks it up, ↑/↓ move it, Space drops it and Esc puts it back.
 */
export function SortableLines({ ids, nameOf, onMove, children }: SortableLinesProps) {
  // The same id on the server and in the browser, so hydration matches.
  const id = useId();
  // A 4px move starts a drag, so a tap on the grip does nothing.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const name = (line: UniqueIdentifier) => nameOf(String(line));
  const place = (line: UniqueIdentifier) => `${ids.indexOf(String(line)) + 1} of ${ids.length}`;
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${name(active.id)}.`,
    onDragOver: ({ active, over }) => (over ? `${name(active.id)} is now ${place(over.id)}.` : undefined),
    onDragEnd: ({ active, over }) =>
      over ? `${name(active.id)} dropped at ${place(over.id)}.` : `Moving ${name(active.id)} was cancelled.`,
    onDragCancel: ({ active }) => `Moving ${name(active.id)} was cancelled.`,
  };

  function end({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    onMove(ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
  }

  return (
    <DndContext
      id={id}
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={MODIFIERS}
      accessibility={{ announcements, screenReaderInstructions: INSTRUCTIONS }}
      onDragEnd={end}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

/** An EditLineRow with a grip, inside SortableLines. */
export function SortableLineRow({ id, ...props }: Omit<EditLineRowProps, "dragHandle" | "sortable"> & { id: string }) {
  const { setNodeRef, setActivatorNodeRef, transform, transition, isDragging, attributes, listeners } = useSortable({
    id,
  });
  const sortable: SortableLine = {
    rowRef: setNodeRef,
    // Translate only: rows of different heights mustn't be stretched.
    rowStyle: { transform: CSS.Translate.toString(transform), transition },
    dragging: isDragging,
    gripRef: setActivatorNodeRef,
    gripAttributes: attributes,
    gripListeners: listeners,
  };
  return <EditLineRow {...props} dragHandle sortable={sortable} />;
}
