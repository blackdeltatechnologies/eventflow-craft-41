import QRCode from "qrcode";

export interface TicketEvent {
  name: string;
  description?: string | null;
  event_date?: string | null;
  event_end_date?: string | null;
  location_value?: string | null;
  slug?: string;
}

const toIcsDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

const escapeIcs = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");

export function eventRange(event: TicketEvent): { start: Date; end: Date } | null {
  if (!event.event_date) return null;
  const start = new Date(event.event_date);
  const end = event.event_end_date ? new Date(event.event_end_date) : new Date(start.getTime() + 60 * 60 * 1000);
  return { start, end };
}

export function buildIcs(event: TicketEvent, uid: string, url?: string): string | null {
  const range = eventRange(event);
  if (!range) return null;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EVENTLAUNCH//Ticket//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}@eventlaunch`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(range.start)}`,
    `DTEND:${toIcsDate(range.end)}`,
    `SUMMARY:${escapeIcs(event.name)}`,
  ];
  if (event.description) lines.push(`DESCRIPTION:${escapeIcs(event.description.slice(0, 1000))}`);
  if (event.location_value) lines.push(`LOCATION:${escapeIcs(event.location_value)}`);
  if (url) lines.push(`URL:${url}`);
  lines.push(
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeIcs(event.name)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  );
  return lines.join("\r\n");
}

export function googleCalendarUrl(event: TicketEvent): string | null {
  const range = eventRange(event);
  if (!range) return null;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.name,
    dates: `${toIcsDate(range.start)}/${toIcsDate(range.end)}`,
  });
  if (event.description) params.set("details", event.description.slice(0, 1000));
  if (event.location_value) params.set("location", event.location_value);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export async function deliverFile(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: blob.type });
  const touch = typeof matchMedia !== "undefined" && matchMedia("(pointer: coarse)").matches;
  if (touch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return;
    } catch (e) {
      if ((e as DOMException).name === "AbortError") return;
    }
  }
  downloadBlob(blob, filename);
}

export const safeFilename = (s: string) => s.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "event";

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
      if (lines.length === maxLines) break;
    } else line = test;
  }
  if (lines.length < maxLines && line) lines.push(line);
  return lines;
}

/** Draws a branded ticket pass image (PNG) in the browser. */
export async function buildTicketPng(opts: {
  event: TicketEvent;
  registrationId: string;
  attendeeName?: string;
  dateLabel?: string;
  brandColor: string;
}): Promise<Blob> {
  const W = 900, H = 1400;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = opts.brandColor;
  ctx.fillRect(0, 0, W, 420);

  ctx.fillStyle = "#ffffff";
  ctx.font = "600 28px sans-serif";
  ctx.fillText("EVENT TICKET", 60, 90);
  ctx.font = "bold 60px sans-serif";
  wrap(ctx, opts.event.name, W - 120, 3).forEach((l, i) => ctx.fillText(l, 60, 180 + i * 72));

  ctx.fillStyle = "#111111";
  let y = 500;
  const row = (label: string, value?: string) => {
    if (!value) return;
    ctx.fillStyle = "#777777";
    ctx.font = "600 24px sans-serif";
    ctx.fillText(label.toUpperCase(), 60, y);
    ctx.fillStyle = "#111111";
    ctx.font = "500 34px sans-serif";
    wrap(ctx, value, W - 120, 2).forEach((l, i) => ctx.fillText(l, 60, y + 46 + i * 42));
    y += 130;
  };
  row("Attendee", opts.attendeeName);
  row("When", opts.dateLabel);
  row("Where", opts.event.location_value || undefined);

  const qrUrl = await QRCode.toDataURL(opts.registrationId, { width: 420, margin: 1 });
  const img = new Image();
  img.src = qrUrl;
  await img.decode();
  const qy = Math.max(y + 10, 880);
  ctx.drawImage(img, (W - 420) / 2, qy, 420, 420);
  ctx.fillStyle = "#777777";
  ctx.font = "500 22px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Show this code at the door", W / 2, qy + 455);
  ctx.font = "18px monospace";
  ctx.fillText(opts.registrationId, W / 2, qy + 490);

  return new Promise((r) => c.toBlob((b) => r(b!), "image/png"));
}
