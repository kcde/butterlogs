import { describe, expect, it } from "vitest";
import { nameTaken } from "./names";

const list = [
  { id: "1", name: "Flour" },
  { id: "2", name: "Crème fraîche" },
  { id: "3", name: null },
];

describe("nameTaken", () => {
  it("finds an existing name ignoring capitals and surrounding spaces", () => {
    expect(nameTaken("flour", list)).toEqual({ id: "1", name: "Flour" });
    expect(nameTaken("  FLOUR ", list)?.id).toBe("1");
    expect(nameTaken("CRÈME FRAÎCHE", list)?.id).toBe("2");
  });

  it("lets an ingredient keep its own name", () => {
    expect(nameTaken("Flour", list, "1")).toBeNull();
    expect(nameTaken("flour", list, "2")?.id).toBe("1");
  });

  it("treats accents as different letters (only capitals are ignored)", () => {
    expect(nameTaken("Creme fraiche", list)).toBeNull();
  });

  it("returns null for a new name", () => {
    expect(nameTaken("Sugar", list)).toBeNull();
  });
});
