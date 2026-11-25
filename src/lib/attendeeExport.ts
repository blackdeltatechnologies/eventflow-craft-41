import type { Registration } from "@/hooks/useRegistrations";

export const attendeeHeaders = ["Name", "Email", "Event", "Ticket tier", "Payment status", "Registration status", "Registered at", "Checked in at"];

export function attendeeRows(registrations: Registration[], eventName = ""): string[][] {
  return registrations.map(r => {
    const data = (r.data && typeof r.data === "object" && !Array.isArray(r.data) ? r.data : {}) as Record<string, unknown>;
    const value = (keys: string[]) => String(keys.map(k => data[k]).find(v => typeof v === "string") ?? "");
    return [value(["Full Name", "Name", "name"]), value(["Email Address", "Email", "email"]), r.events?.name || eventName,
      r.ticket_tier || "", r.payment_status || "Free", r.status, r.created_at, r.checked_in_at || ""];
  });
}

/** Prevent spreadsheet formulas even when attackers prefix them with whitespace/control characters. */
export function safeSpreadsheetCell(value: string): string {
  return /^[\s\u0000-\u001f]*[=+\-@]/.test(value) || /^[\t\r\n]/.test(value) ? `'${value}` : value;
}

export function buildAttendeeCsv(registrations: Registration[], eventName = ""): string {
  const escape = (value: string) => `"${safeSpreadsheetCell(value).replace(/"/g, '""')}"`;
  return "\uFEFF" + [attendeeHeaders, ...attendeeRows(registrations, eventName)].map(row => row.map(escape).join(",")).join("\r\n");
}

export async function buildAttendeeXlsx(registrations: Registration[], eventName = ""): Promise<Blob> {
  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet("Attendees");
  sheet.addRow(attendeeHeaders);
  attendeeRows(registrations, eventName).forEach(row => sheet.addRow(row.map(safeSpreadsheetCell)));
  sheet.getRow(1).font = { bold: true };
  sheet.columns.forEach(column => { column.width = 28; });
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([new Uint8Array(buffer)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}