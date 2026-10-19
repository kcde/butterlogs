"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as Sentry from "@sentry/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/Button";
import { ChoiceGrid } from "@/components/ChoiceGrid";
import { SelectField } from "@/components/SelectField";
import { TextField } from "@/components/TextField";
import { isValidMargin, type PricingMethod, priceFor } from "@/lib/calc/pricing";
import { currencyOptions, likelyCurrency, phoneLocale } from "@/lib/currency";
import { useBusiness } from "@/lib/db/useBusiness";
import { formatMoney } from "@/lib/format";
import { parseNumber } from "@/lib/parse";
import { supabase } from "@/lib/supabase";
import { useUser } from "../user";
import styles from "./setup.module.css";

const METHODS = [
  { value: "markup", label: "Markup %" },
  { value: "margin", label: "Margin %" },
  { value: "fixed_profit", label: "Fixed profit" },
  { value: "set_price", label: "Set price" },
] as const;

const PERCENT_LABELS = { markup: "Markup percentage", margin: "Margin percentage" };

// Only Markup and Margin get a default number: a percentage works across
// products, but a profit or price is different for each one, so it's typed on
// each recipe (agreed 19 Oct).
const usesPercent = (method: PricingMethod): method is "markup" | "margin" =>
  method === "markup" || method === "margin";

// The made-up cost in the example line, the same for every currency (agreed 19 Oct).
const EXAMPLE_COST_MINOR = 1_000_000;

const schema = z
  .object({
    name: z.string().trim().min(1, "Add your business name."),
    currency: z.enum(["NGN", "USD", "GBP", "EUR"]),
    method: z.enum(["markup", "margin", "fixed_profit", "set_price"]),
    percent: z.string(),
  })
  .superRefine(({ method, percent }, ctx) => {
    if (!usesPercent(method)) return;
    const value = parseNumber(percent);
    if (value === null) {
      ctx.addIssue({ code: "custom", path: ["percent"], message: "Type a percentage." });
    } else if (method === "margin" && !isValidMargin(value)) {
      ctx.addIssue({ code: "custom", path: ["percent"], message: "Margin must be under 100%." });
    }
  });

const OFFLINE = "Setting up needs internet. Connect and try again.";

// Setup.dc.html: name the business, pick the currency and how she usually prices.
export default function SetupPage() {
  const router = useRouter();
  const user = useUser();
  const business = useBusiness(user.id);
  const [likely] = useState(() => likelyCurrency(phoneLocale()));
  const [created, setCreated] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [slow, setSlow] = useState(false);
  const { control, handleSubmit, formState } = useForm({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      name: "",
      currency: likely,
      // Markup 50% preselected (PRD F1).
      method: "markup" as PricingMethod,
      percent: "50",
    },
  });
  const [currency, method, percent] = useWatch({ control, name: ["currency", "method", "percent"] });

  // Once her business is on the phone (synced back after create_business),
  // go to Recipes; offer the install guide only right after setting up.
  useEffect(() => {
    if (business.state === "ready") router.replace(created ? "/recipes?install=1" : "/recipes");
  }, [business.state, created, router]);

  // If the business takes long to arrive, say so (normally under a second).
  useEffect(() => {
    if (!created) return;
    const timer = setTimeout(() => setSlow(true), 15_000);
    return () => clearTimeout(timer);
  }, [created]);

  const onSubmit = handleSubmit(async (values) => {
    setProblem(null);
    if (!navigator.onLine) {
      setProblem(OFFLINE);
      return;
    }
    const { error } = await supabase.rpc("create_business", {
      p_name: values.name,
      p_currency_code: values.currency,
      p_pricing_method: values.method,
      p_pricing_percent: usesPercent(values.method) ? parseNumber(values.percent) : null,
      p_pricing_amount_minor: null,
    });
    // "Already has a business" means an earlier tap got through: carry on.
    if (error && !error.message.includes("already has a business")) {
      if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
        setProblem(OFFLINE);
      } else {
        Sentry.captureException(error, { tags: { setup: "create_business" } });
        setProblem("Something went wrong. Try again.");
      }
      return;
    }
    setCreated(true);
  });

  // Shown straight away, even before the first sync says whether she has a
  // business: if she does, the effect above takes her to Recipes (and a
  // second create_business is refused, which also lands her there).
  if (business.state === "ready") return null;

  const example = usesPercent(method)
    ? priceFor(EXAMPLE_COST_MINOR, { method, percent: parseNumber(percent), amountMinor: null })
    : null;
  const busy = formState.isSubmitting || created;

  return (
    <main className={styles.screen}>
      <form className={styles.form} noValidate onSubmit={onSubmit}>
        <h1 className={styles.title}>Set up your business</h1>
        <p className={styles.subtitle}>Three quick things. You can change them any time in Settings.</p>

        <div className={styles.fields}>
          <Controller
            control={control}
            name="name"
            render={({ field, fieldState }) => (
              <TextField
                label="Business name"
                autoComplete="organization"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="currency"
            render={({ field }) => (
              <SelectField
                label="Currency"
                value={field.value}
                options={currencyOptions(likely)}
                onChange={field.onChange}
              />
            )}
          />
          <div className={styles.pricing}>
            <span className={styles.groupLabel} aria-hidden="true">
              How you usually price
            </span>
            <Controller
              control={control}
              name="method"
              render={({ field }) => (
                <ChoiceGrid
                  label="How you usually price"
                  options={[...METHODS]}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            {usesPercent(method) ? (
              <Controller
                control={control}
                name="percent"
                render={({ field, fieldState }) => (
                  <TextField
                    label={PERCENT_LABELS[method]}
                    type="number"
                    suffix="%"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={fieldState.error?.message}
                  />
                )}
              />
            ) : (
              <p className={styles.note}>
                You’ll type the {method === "fixed_profit" ? "profit" : "price"} for each recipe when you create it.
              </p>
            )}
            {example && (
              <p className={styles.example}>
                A cake that costs {formatMoney(EXAMPLE_COST_MINOR, currency)} to make sells for{" "}
                {formatMoney(example.price, currency)}.
              </p>
            )}
          </div>
        </div>

        <div className={styles.bottom}>
          {problem && (
            <p className={styles.problem} role="alert">
              {problem}
            </p>
          )}
          {slow && (
            <p className={styles.footnote} role="status">
              Your business is saved. This phone is still fetching it; check your connection.
            </p>
          )}
          <p className={styles.footnote}>
            We’ll add gas, electricity, transport, labour and packaging as starter overhead items.
          </p>
          <Button variant="primary" block type="submit" disabled={busy}>
            {busy ? "Setting up…" : "Continue"}
          </Button>
        </div>
      </form>
    </main>
  );
}
