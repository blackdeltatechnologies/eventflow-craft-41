export type TicketTier = { name: string; description?: string; capacity?: number | null; price?: number | null };

/** Safely reads ticket tiers stored on an event. */
export function parseTiers(raw: unknown): TicketTier[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((t): t is Record<string, unknown> => !!t && typeof t === "object" && typeof (t as any).name === "string")
    .map((t) => ({
      name: String(t.name).trim(),
      description: typeof t.description === "string" ? t.description : "",
      capacity: typeof t.capacity === "number" && t.capacity > 0 ? t.capacity : null,
      price: typeof t.price === "number" && t.price > 0 ? Math.round(t.price) : null,
    }))
    .filter((t) => t.name.length > 0);
}

/** Spots left for a tier, or null when unlimited. */
export function tierRemaining(tier: TicketTier, taken: number): number | null {
  if (!tier.capacity) return null;
  return Math.max(0, tier.capacity - taken);
}

/** Name for a duplicated event. */
export function copyName(name: string): string {
  return /\(Copy\)$/.test(name) ? name : `${name} (Copy)`;
}

/** Formats a TZS ticket price, or "Free". */
export function formatTzs(price?: number | null): string {
  return price && price > 0 ? `TZS ${price.toLocaleString("en-US")}` : "Free";
}
