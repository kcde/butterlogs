"use client";

import { BookOpen, Check, ChevronLeft, Ellipsis, Mail, Plus, RotateCcw, Share, SquarePlus, X } from "lucide-react";
import { type ReactNode, useState } from "react";
import { ActionBar } from "@/components/ActionBar";
import { AmountField } from "@/components/AmountField";
import { BottomSheet } from "@/components/BottomSheet";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { CheckRow } from "@/components/CheckRow";
import { Chip } from "@/components/Chip";
import { ChoiceGrid } from "@/components/ChoiceGrid";
import { CodeField } from "@/components/CodeField";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EditLineRow, useReorder } from "@/components/EditLineRow";
import { EmptyState } from "@/components/EmptyState";
import { FAB } from "@/components/FAB";
import { IconButton } from "@/components/IconButton";
import { IngredientCard } from "@/components/IngredientCard";
import { Notice } from "@/components/Notice";
import { RadioList } from "@/components/RadioList";
import { RecipeCard } from "@/components/RecipeCard";
import { SearchField } from "@/components/SearchField";
import { SegmentedControl } from "@/components/SegmentedControl";
import { SelectField } from "@/components/SelectField";
import { StatTile } from "@/components/StatTile";
import { StepIndicator } from "@/components/StepIndicator";
import { StepList } from "@/components/StepList";
import { SyncStatus } from "@/components/SyncStatus";
import { TabBar } from "@/components/TabBar";
import { Tag } from "@/components/Tag";
import { TextField } from "@/components/TextField";
import { Toast } from "@/components/Toast";
import { TopBar } from "@/components/TopBar";
import { WarningBanner } from "@/components/WarningBanner";
import type { Unit } from "@/lib/units";
import styles from "./gallery.module.css";

function Section({ name, children }: { name: string; children: ReactNode }) {
  return (
    <section className={styles.section} aria-labelledby={`c-${name.split(" ")[0]}`}>
      <h2 id={`c-${name.split(" ")[0]}`} className={styles.name}>
        {name}
      </h2>
      <div className={styles.stage}>{children}</div>
    </section>
  );
}

export function Gallery() {
  const [text, setText] = useState("Chocolate Cake");
  const [password, setPassword] = useState("sugarandflour");
  const [percent, setPercent] = useState("50");
  const [notes, setNotes] = useState("");
  const [currency, setCurrency] = useState("NGN");
  const [method, setMethod] = useState("markup");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [code, setCode] = useState("1264");
  const [price, setPrice] = useState("15,000");
  const [packSize, setPackSize] = useState("12.5");
  const [packUnit, setPackUnit] = useState<Unit>("kg");
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<"in-use" | "unused" | null>(null);
  const [chip, setChip] = useState("all");
  const [yieldType, setYieldType] = useState("weight");
  const [view, setView] = useState("ingredients");
  const [lines, setLines] = useState([
    { name: "Sugar", amount: "380", unit: "g" },
    { name: "Flour", amount: "", unit: "g" },
    { name: "Eggs", amount: "3", unit: "pcs" },
  ]);
  const [ticked, setTicked] = useState<string[]>(["Butter"]);
  const [category, setCategory] = useState<string | null>("cakes");
  const [toast, setToast] = useState(0);
  const [actionBar, setActionBar] = useState(false);
  const moveLine = (from: number, to: number) =>
    setLines((current) => {
      const next = [...current];
      next.splice(to, 0, ...next.splice(from, 1));
      return next;
    });
  const grip = useReorder(lines.length, moveLine);

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Components</h1>
      <p className={styles.lede}>Built so far (M5). Compare with the design system previews in light and dark.</p>

      <Section name="Button">
        <div className={styles.row}>
          <Button variant="primary">Save recipe</Button>
          <Button>Back</Button>
          <Button variant="ghost">Reset</Button>
          <Button variant="danger">Delete</Button>
        </div>
        <div className={styles.row}>
          <Button variant="primary" icon={<Plus />}>
            Add ingredient
          </Button>
          <Button size="sm">Add</Button>
          <Button variant="primary" disabled>
            Saving…
          </Button>
          <Button href="/dev/components">Link</Button>
        </div>
        <Button variant="primary" block>
          Continue
        </Button>
      </Section>

      <Section name="IconButton">
        <div className={styles.row}>
          <IconButton icon={<ChevronLeft />} label="Back" />
          <IconButton icon={<Ellipsis />} label="Recipe options" />
          <IconButton icon={<X />} label="Close" />
          <IconButton variant="plain" icon={<RotateCcw />} label="Reset labour" />
        </div>
      </Section>

      <Section name="TextField">
        <TextField label="Recipe name" value={text} onChange={setText} />
        <TextField label="Password" type="password" value={password} onChange={setPassword} helper="At least 8 characters." />
        <TextField label="Markup" type="number" suffix="%" value={percent} onChange={setPercent} />
        <TextField label="Pack price" type="number" prefix="₦" placeholder="0" value={price} onChange={setPrice} />
        <TextField
          label="Pack price"
          type="number"
          prefix="₦"
          placeholder="0"
          value="15.000.00"
          onChange={() => {}}
          error="Type the price, like 15,000."
        />
        <TextField label="Notes" multiline placeholder="e.g. pan size, oven notes" value={notes} onChange={setNotes} />
      </Section>

      <Section name="CodeField (not in the design system yet)">
        <CodeField label="Code" value={code} onChange={setCode} />
        <CodeField label="Code being checked" value="126493" onChange={() => {}} helper="Checking your code…" />
        <CodeField
          label="Wrong code"
          value="000000"
          onChange={() => {}}
          error="That code didn’t work. Check it, or ask for a new one."
        />
      </Section>

      <Section name="AmountField">
        <AmountField
          label="Pack size"
          value={packSize}
          onChange={setPackSize}
          unit={packUnit}
          units={["g", "kg", "oz", "lb"]}
          onUnitChange={setPackUnit}
          helper="The size of the bag or pack you buy."
        />
        <AmountField label="Pack size" value="50" onChange={() => {}} unit="pcs" units={["pcs"]} onUnitChange={() => {}} />
        <AmountField
          label="Pack size"
          value="0"
          onChange={() => {}}
          unit="l"
          units={["ml", "l", "fl_oz", "tsp", "tbsp", "cup"]}
          onUnitChange={() => {}}
          error="Type a size above 0, like 12.5."
        />
      </Section>

      <Section name="SearchField">
        <SearchField value={search} onChange={setSearch} placeholder="Search ingredients" />
        <SearchField value="flour" onChange={() => {}} placeholder="Search recipes" />
      </Section>

      <Section name="SelectField">
        <SelectField
          label="Currency"
          value={currency}
          onChange={setCurrency}
          options={[
            { value: "NGN", label: "Nigerian Naira (₦)" },
            { value: "USD", label: "US Dollar ($)" },
          ]}
          helper="Changing it never converts amounts."
        />
      </Section>

      <Section name="ChoiceGrid">
        <ChoiceGrid
          label="How you usually price"
          value={method}
          onChange={setMethod}
          options={[
            { value: "markup", label: "Markup %" },
            { value: "margin", label: "Margin %" },
            { value: "fixed_profit", label: "Fixed profit" },
            { value: "set_price", label: "Set price" },
            { value: "cost_only", label: "Cost only" },
          ]}
        />
        <p className={styles.hint}>An odd last option (Cost only, not in the design system) spans both columns.</p>
      </Section>

      <Section name="SegmentedControl">
        <SegmentedControl
          label="Yield"
          value={yieldType}
          onChange={setYieldType}
          options={[
            { value: "weight", label: "Weight" },
            { value: "count", label: "Pieces" },
          ]}
        />
        <SegmentedControl
          as="tabs"
          label="Show"
          value={view}
          onChange={setView}
          options={[
            { value: "ingredients", label: "Ingredients" },
            { value: "costs", label: "Costs" },
          ]}
        />
      </Section>

      <Section name="StepIndicator">
        <StepIndicator step={2} total={3} label="Ingredients" />
      </Section>

      <Section name="EditLineRow">
        <Card padding="flush">
          <div>
            {lines.map((line, index) => (
              <EditLineRow
                key={line.name}
                name={line.name}
                amount={line.amount}
                unit={line.unit}
                onAmountChange={(amount) =>
                  setLines((current) => current.map((other, at) => (at === index ? { ...other, amount } : other)))
                }
                onRemove={() => {}}
                dragHandle
                gripProps={grip(index)}
                invalid={line.amount === ""}
              />
            ))}
          </div>
        </Card>
        <Card padding="flush">
          <EditLineRow name="Gas" amount="500" prefix="₦" onAmountChange={() => {}} onRemove={() => {}} />
        </Card>
        <p className={styles.hint}>Drag a grip (or use ↑ ↓ on it) to reorder. An empty amount gets the red outline (not in the design system).</p>
      </Section>

      <Section name="CheckRow">
        <div>
          {["Butter", "Brown sugar", "Egg white"].map((name) => (
            <CheckRow
              key={name}
              label={name}
              checked={ticked.includes(name)}
              onChange={(on) => setTicked((current) => (on ? [...current, name] : current.filter((other) => other !== name)))}
              trailing={name === "Egg white" ? "add price" : "₦40 / g"}
            />
          ))}
          <CheckRow label="Sugar (already added)" checked disabled onChange={() => {}} trailing="₦1.60 / g" />
        </div>
      </Section>

      <Section name="RadioList">
        <RadioList
          label="Category"
          value={category}
          onChange={setCategory}
          options={[
            { value: "cakes", label: "Cakes" },
            { value: "fillings", label: "Fillings" },
            { value: "cookies", label: "Cookies" },
          ]}
        />
      </Section>

      <Section name="Card">
        <Card>
          <p>Default: 16px padding on the grey surface.</p>
        </Card>
        <Card as="section" padding="flush">
          <p className={styles.hint}>Flush: no padding, for rows that bring their own.</p>
        </Card>
      </Section>

      <Section name="IngredientCard">
        <IngredientCard
          name="Flour"
          unitCost="₦1.20 / g"
          meta="12.5 kg · ₦15,000 · updated 2 weeks ago"
          onClick={() => {}}
        />
        <IngredientCard name="Ziplock bags" unitCost="₦20 / pc" meta="50 pcs · ₦1,000 · updated today" onClick={() => {}} />
        <IngredientCard name="Egg white" unitCost={null} meta="ignored when the price is missing" onClick={() => {}} />
        <IngredientCard name="Water" unitCost="₦0 / ml" meta="1 L · ₦0 · updated yesterday" onClick={() => {}} />
      </Section>

      <Section name="RecipeCard">
        <RecipeCard name="Vanilla Cake" category="Cakes" yieldLabel="1,500 g" totalCost="₦10,287" unitCost="₦6.86/g" />
        <RecipeCard name="Dirty Chai Cookies" category="Cookies" yieldLabel="24 pcs" totalCost="₦21,582" unitCost="₦899 each" />
        <RecipeCard name="Salted Caramel Cake" category="Cakes" yieldLabel="1,000 g" incomplete={{ missingCount: 1 }} />
        <RecipeCard name="Lemon Cake" yieldLabel="" draft onClick={() => {}} />
      </Section>

      <Section name="Tag">
        <div className={styles.row}>
          <Tag>Cakes</Tag>
          <Tag tone="warning">incomplete</Tag>
          <Tag>Draft</Tag>
        </div>
      </Section>

      <Section name="Chip">
        <div className={styles.row}>
          {["all", "Cakes", "Fillings", "Uncategorised"].map((name) => (
            <Chip key={name} label={name === "all" ? "All" : name} selected={chip === name} onClick={() => setChip(name)} />
          ))}
        </div>
      </Section>

      <Section name="StatTile and WarningBanner">
        <WarningBanner message="1 ingredient has no price, so these totals are incomplete." />
        <div className={styles.stats}>
          <StatTile value="₦10,287" label="Total cost" />
          <StatTile value="₦6.86/g" label="Cost per gram" />
          <StatTile value="₦15,431" label="Selling price" incomplete />
          <StatTile value="₦5,144" label="Profit" incomplete />
        </div>
      </Section>

      <Section name="Toast and ActionBar">
        <div className={styles.row}>
          <Button onClick={() => setToast((count) => count + 1)}>Show a toast</Button>
          <Button onClick={() => setActionBar((shown) => !shown)}>{actionBar ? "Hide" : "Show"} the action bar</Button>
        </div>
      </Section>
      {toast > 0 && <Toast key={toast} message="Chocolate Cake saved" />}
      {actionBar && (
        <ActionBar summary={{ label: "Ingredient cost", value: "₦4,937" }} message="Fill in the boxes marked in red.">
          <Button>Back</Button>
          <Button variant="primary">Next</Button>
        </ActionBar>
      )}

      <Section name="ConfirmDialog">
        <div className={styles.row}>
          <Button onClick={() => setDialog("in-use")}>Delete in use</Button>
          <Button onClick={() => setDialog("unused")}>Delete unused</Button>
        </div>
        <ConfirmDialog
          open={dialog === "in-use"}
          icon="alert"
          title="Flour is in 14 recipes"
          body="If you delete it, those recipes will show it as missing and their totals will be incomplete."
          affected={["Vanilla Cake", "Chocolate Cake", "Red Velvet", ...Array.from({ length: 11 }, (_, i) => `Cake ${i + 1}`)]}
          confirmLabel="Delete anyway"
          cancelLabel="Keep Flour"
          layout="stack"
          onConfirm={() => setDialog(null)}
          onCancel={() => setDialog(null)}
        />
        <ConfirmDialog
          open={dialog === "unused"}
          icon="trash"
          title="Delete Flour?"
          body="This can’t be undone. No recipes use it."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={() => setDialog(null)}
          onCancel={() => setDialog(null)}
        />
      </Section>

      <Section name="TopBar">
        <div className={styles.frame}>
          <TopBar variant="tab" title="Recipes" trailing={<SyncStatus state="synced" />} />
        </div>
        <div className={styles.frame}>
          <TopBar
            variant="push"
            title="Vanilla Cake"
            backHref="/dev/components"
            subtitle="Base yield 1,500 g"
            trailing={<IconButton icon={<Ellipsis />} label="Recipe options" />}
          />
        </div>
        <div className={styles.frame}>
          <TopBar variant="flow" title="New recipe" backHref="/dev/components" />
        </div>
      </Section>

      <Section name="SyncStatus">
        <div className={styles.row}>
          <SyncStatus state="pending" pendingCount={3} />
          <SyncStatus state="pending" pendingCount={1} onClick={() => {}} />
          <SyncStatus state="offline" />
          <SyncStatus state="synced" />
        </div>
        <p className={styles.hint}>“All synced” fades after 3 seconds.</p>
      </Section>

      <Section name="Notice">
        <Notice icon={<Check />} title="Check your email.">
          We sent a 6-digit code to ada@example.com.
        </Notice>
        <Notice icon={<Mail />}>We sent a new code to ada@example.com. It can take a minute to arrive.</Notice>
        <Notice variant="result" title="Works out to">
          ₦1.20 per g
        </Notice>
      </Section>

      <Section name="StepList">
        <StepList
          steps={[
            { text: <>In Safari, tap <b>Share</b></>, icon: <Share /> },
            { text: <>Scroll and tap <b>Add to Home Screen</b></>, icon: <SquarePlus /> },
            { text: <>Tap <b>Add</b>, then open Butterlogs from your home screen</> },
          ]}
        />
      </Section>

      <Section name="EmptyState">
        <EmptyState
          icon={<BookOpen />}
          title="No recipes yet"
          body="Add your ingredients and what you paid for them first. Then every recipe can work out its own cost."
          primaryAction={{ label: "Add ingredients", onClick: () => {} }}
          secondaryAction={{ label: "Start a recipe anyway", onClick: () => {} }}
          footnote="Gas, electricity, transport, labour and packaging are already set up as overhead items."
        />
      </Section>

      <Section name="BottomSheet">
        <Button onClick={() => setSheetOpen(true)}>Open a sheet</Button>
        <BottomSheet
          open={sheetOpen}
          title="Add ingredients"
          onClose={() => setSheetOpen(false)}
          footer={
            <Button variant="primary" block onClick={() => setSheetOpen(false)}>
              Add 2 ingredients
            </Button>
          }
        >
          <p className={styles.hint}>Sheet content scrolls inside when tall. Closes on ×, a tap outside or Escape.</p>
        </BottomSheet>
      </Section>

      <Section name="FAB">
        <p className={styles.hint}>Floats at the bottom right, above the tab bar.</p>
      </Section>
      <FAB label="New ingredient" onClick={() => {}} />

      <Section name="TabBar">
        <p className={styles.hint}>Floats at the bottom of the screen (Recipes active).</p>
      </Section>
      <TabBar active="recipes" />
    </main>
  );
}
