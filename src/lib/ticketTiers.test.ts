import { describe, it, expect } from "vitest";
import { parseTiers, tierRemaining, copyName } from "./ticketTiers";

describe("ticket tiers", () => {
  it("drops tiers without a name and treats 0 capacity as unlimited", () => {
    expect(parseTiers([{ name: "VIP", capacity: 20 }, { name: "" }, { name: "GA", capacity: 0 }])).toEqual([
      { name: "VIP", description: "", capacity: 20 },
      { name: "GA", description: "", capacity: null },
    ]);
  });
  it("computes remaining spots per tier", () => {
    expect(tierRemaining({ name: "VIP", capacity: 20 }, 18)).toBe(2);
    expect(tierRemaining({ name: "VIP", capacity: 20 }, 25)).toBe(0);
    expect(tierRemaining({ name: "GA", capacity: null }, 100)).toBeNull();
  });
  it("names duplicated events with (Copy) once", () => {
    expect(copyName("Meetup")).toBe("Meetup (Copy)");
    expect(copyName("Meetup (Copy)")).toBe("Meetup (Copy)");
  });
});
