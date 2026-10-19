import type { Metadata } from "next";
import { Gallery } from "./Gallery";

export const metadata: Metadata = {
  title: "Components · Butterlogs",
  robots: { index: false },
};

// Every design-system component built so far, in each state (not linked from the app).
export default function ComponentsPage() {
  return <Gallery />;
}
