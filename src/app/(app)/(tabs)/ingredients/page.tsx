import { TopBar } from "@/components/TopBar";
import { SyncPill } from "../SyncPill";

// Stub until M4 builds the ingredient list (Ingredients.dc.html).
export default function IngredientsPage() {
  return <TopBar variant="tab" title="Ingredients" trailing={<SyncPill />} />;
}
