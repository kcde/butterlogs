"use client";

import { X } from "lucide-react";
import type { Ref } from "react";
import { EditLineRow, useReorder } from "@/components/EditLineRow";
import { IconButton } from "@/components/IconButton";
import { TextField } from "@/components/TextField";
import type { DraftLine, DraftSection } from "@/lib/recipes";
import type { LinesMode } from "./AddLinesSheet";
import { AddButton } from "./AddButton";
import styles from "./newRecipe.module.css";

/** What a line shows: the ingredient's or sub-recipe's name, and its unit ("g", "pcs"). */
export type LineLabel = (line: DraftLine) => { name: string; unit: string };

export interface IngredientsStepProps {
  sections: DraftSection[];
  onSectionsChange: (sections: DraftSection[]) => void;
  label: LineLabel;
  /** Boxes to outline in red (agreed 27 Oct). */
  invalid: ReadonlySet<string>;
  /** A box was typed in: its outline goes. */
  onTyped: (key: string) => void;
  /** Lets the screen put the cursor in a box. */
  register: (key: string) => Ref<HTMLInputElement>;
  onAddLines: (sectionKey: string, mode: LinesMode) => void;
  onAddSection: () => void;
  /** Asks first when the section has lines. */
  onRemoveSection: (section: DraftSection) => void;
}

function SectionCard({
  section,
  index,
  total,
  props,
}: {
  section: DraftSection;
  index: number;
  total: number;
  props: IngredientsStepProps;
}) {
  const { sections, onSectionsChange, label, invalid, onTyped, register, onAddLines, onAddSection, onRemoveSection } = props;
  const setLines = (lines: DraftLine[]) =>
    onSectionsChange(sections.map((other) => (other.key === section.key ? { ...other, lines } : other)));
  const grip = useReorder(section.lines.length, (from, to) => {
    const lines = [...section.lines];
    lines.splice(to, 0, ...lines.splice(from, 1));
    setLines(lines);
  });
  const last = index === total - 1;

  return (
    <section className={styles.section} aria-label={index === 0 ? "Ingredients" : section.name.trim() || "New section"}>
      {/* The first section is never named (agreed 27 Oct); each added one needs a name. */}
      {index > 0 && (
        <div className={styles.sectionHead} data-box={section.key}>
          <div className={styles.sectionName}>
            <TextField
              label="Section name"
              placeholder="e.g. Salted Caramel"
              value={section.name}
              onChange={(name) => {
                onTyped(section.key);
                onSectionsChange(sections.map((other) => (other.key === section.key ? { ...other, name } : other)));
              }}
              error={invalid.has(section.key) ? "Name this section, like Crumble." : undefined}
            />
          </div>
          <IconButton
            variant="plain"
            icon={<X />}
            label={`Remove ${section.name.trim() || "this section"}`}
            onClick={() => onRemoveSection(section)}
          />
        </div>
      )}
      {section.lines.length > 0 && (
        <div className={styles.lines}>
          {section.lines.map((line, at) => {
            const { name, unit } = label(line);
            return (
              <EditLineRow
                key={line.key}
                name={name}
                amount={line.amount}
                unit={unit}
                onAmountChange={(amount) => {
                  onTyped(line.key);
                  setLines(section.lines.map((other) => (other.key === line.key ? { ...other, amount } : other)));
                }}
                onRemove={() => setLines(section.lines.filter((other) => other.key !== line.key))}
                dragHandle
                gripProps={grip(at)}
                invalid={invalid.has(line.key)}
                inputRef={register(line.key)}
              />
            );
          })}
        </div>
      )}
      <div className={styles.adds}>
        <AddButton onClick={() => onAddLines(section.key, "ingredients")}>Add ingredients</AddButton>
        <AddButton onClick={() => onAddLines(section.key, "recipes")}>Add a recipe</AddButton>
        {last && (
          <AddButton onClick={onAddSection}>Add section</AddButton>
        )}
      </div>
    </section>
  );
}

// NewRecipe2.dc.html: sections of ingredient and sub-recipe lines (PRD F5).
export function IngredientsStep(props: IngredientsStepProps) {
  return (
    <div className={styles.sections}>
      {props.sections.map((section, index) => (
        <SectionCard key={section.key} section={section} index={index} total={props.sections.length} props={props} />
      ))}
    </div>
  );
}
