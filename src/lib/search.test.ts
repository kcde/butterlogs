import { describe, expect, it } from "vitest";
import { matchesName, sortByName } from "./search";

describe("matchesName", () => {
  it("finds a name containing the search, ignoring capitals", () => {
    expect(matchesName("Flour", "fl")).toBe(true);
    expect(matchesName("Flour", "OUR")).toBe(true);
    expect(matchesName("Whipping cream", "cream")).toBe(true);
    expect(matchesName("Flour", "sugar")).toBe(false);
  });

  it("ignores accents and surrounding spaces", () => {
    expect(matchesName("Crème fraîche", "creme")).toBe(true);
    expect(matchesName("Creme fraiche", "crème")).toBe(true);
    expect(matchesName("Flour", "  flo ")).toBe(true);
  });

  it("matches everything when the search is empty", () => {
    expect(matchesName("Flour", "")).toBe(true);
    expect(matchesName("Flour", "   ")).toBe(true);
  });
});

describe("sortByName", () => {
  it("orders A to Z, ignoring capitals and accents, without changing the list it was given", () => {
    const list = [{ name: "sugar" }, { name: "Éclair filling" }, { name: "Butter" }, { name: "eggs" }, { name: "Egg white" }];
    expect(sortByName(list).map((item) => item.name)).toEqual(["Butter", "Éclair filling", "Egg white", "eggs", "sugar"]);
    expect(list[0].name).toBe("sugar");
  });

  it("puts numbers in number order and a missing name first", () => {
    expect(sortByName([{ name: "Tin 10" }, { name: "Tin 2" }, { name: null }]).map((item) => item.name)).toEqual([
      null,
      "Tin 2",
      "Tin 10",
    ]);
  });
});
