"use client";

import { type KeyboardEvent, useRef } from "react";

const NEXT_KEYS = ["ArrowRight", "ArrowDown"];
const PREVIOUS_KEYS = ["ArrowLeft", "ArrowUp"];

/**
 * Keyboard behaviour for a group of role="radio" buttons (ChoiceGrid,
 * SegmentedControl, RadioList): arrows move the choice and the focus together,
 * and only the chosen option (or the first, if none is) is in the tab order.
 */
export function useRadioGroup<T extends { value: string }>(
  options: readonly T[],
  value: string | null,
  onChange: (value: string) => void,
) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const hasChoice = options.some((option) => option.value === value);

  return (index: number) => ({
    ref: (element: HTMLButtonElement | null) => {
      buttons.current[index] = element;
    },
    role: "radio" as const,
    "aria-checked": options[index].value === value,
    tabIndex: options[index].value === value || (!hasChoice && index === 0) ? 0 : -1,
    onKeyDown: (event: KeyboardEvent) => {
      const step = NEXT_KEYS.includes(event.key) ? 1 : PREVIOUS_KEYS.includes(event.key) ? -1 : 0;
      if (step === 0) return;
      event.preventDefault();
      const next = (index + step + options.length) % options.length;
      onChange(options[next].value);
      buttons.current[next]?.focus();
    },
  });
}
