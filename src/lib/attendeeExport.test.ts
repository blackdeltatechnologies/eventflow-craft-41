import { describe, it, expect } from "vitest";
import { attendeeRows, buildAttendeeCsv, buildAttendeeXlsx, safeSpreadsheetCell } from "./attendeeExport";
import type { Registration } from "@/hooks/useRegistrations";

const attendee: Registration = { id: "r1", event_id: "e1", data: { Name: 'Alice, "A"', Email: "alice@example.com" }, events: { name: "Meetup" }, status: "checked_in", payment_status: "paid", ticket_tier: "VIP", created_at: "2026-11-25T07:00:00Z", checked_in_at: "2026-11-25T08:00:00Z" };
describe("attendee exports", () => {
  it("exports tier, payment and exact check-in timestamp", () => {
    expect(attendeeRows([attendee])[0]).toEqual(['Alice, "A"', "alice@example.com", "Meetup", "VIP", "paid", "checked_in", "2026-11-25T07:00:00Z", "2026-11-25T08:00:00Z"]);
    expect(buildAttendeeCsv([attendee])).toContain('"Alice, ""A"""');
  });
  it("neutralizes formula injection including whitespace and control prefixes", () => {
    for (const cell of ["=1+1", " +SUM(A1)", "\t@evil", "-1", "\rformula"]) expect(safeSpreadsheetCell(cell)).toBe(`'${cell}`);
    expect(safeSpreadsheetCell("Alice")).toBe("Alice");
  });
  it("writes a real Excel workbook with the same values", async () => {
    const blob = await buildAttendeeXlsx([attendee]);
    const { Workbook } = await import("exceljs");
    const book = new Workbook();
    const buffer = await new Promise<ArrayBuffer>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result as ArrayBuffer); r.onerror = reject; r.readAsArrayBuffer(blob); });
    await book.xlsx.load(buffer);
    expect(book.getWorksheet("Attendees")?.getRow(2).getCell(4).value).toBe("VIP");
    expect(book.getWorksheet("Attendees")?.getRow(2).getCell(8).value).toBe("2026-11-25T08:00:00Z");
  });
});