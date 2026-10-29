import { describe, it, expect } from "vitest";
import { buildIcs, googleCalendarUrl } from "./ticket";

const event = { name: "Demo, Night", event_date: "2026-11-05T18:00:00Z", location_value: "Hall A" };

describe("calendar invites", () => {
  it("defaults end to one hour after start", () => {
    const ics = buildIcs(event, "abc")!;
    expect(ics).toContain("DTSTART:20261105T180000Z");
    expect(ics).toContain("DTEND:20261105T190000Z");
    expect(ics).toContain("SUMMARY:Demo\\, Night");
  });
  it("returns null when event has no date", () => {
    expect(buildIcs({ name: "x" }, "a")).toBeNull();
    expect(googleCalendarUrl({ name: "x" })).toBeNull();
  });
  it("builds google calendar dates range", () => {
    expect(googleCalendarUrl(event)).toContain("dates=20261105T180000Z%2F20261105T190000Z");
  });
});
