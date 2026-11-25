/** Original carrier allocations, not a live lookup (numbers may be ported).
 * Source: Google libphonenumber carrier metadata via numlookupapi.com/mobile-prefixes/tanzania/.
 */
const networks = [
  { name: "M-Pesa", prefixes: ["072", "074", "075", "076", "079"] },
  { name: "Airtel Money", prefixes: ["060", "066", "068", "069", "078"] },
  { name: "Mixx by Yas", prefixes: ["065", "067", "070", "071", "077"] },
  { name: "HaloPesa", prefixes: ["061", "062", "063"] },
  { name: "T-Pesa", prefixes: ["073"] },
];

/** Match EasyPay's accepted Tanzanian mobile number formats. */
export function normalizeTanzaniaPhone(raw: string): string | null {
  if (!/^[+\d\s()-]*$/.test(raw)) return null;
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("255") && digits.length === 12) digits = `0${digits.slice(3)}`;
  else if (digits.length === 9) digits = `0${digits}`;
  return /^0[67]\d{8}$/.test(digits) ? digits : null;
}

export function detectMobileNetwork(raw: string): string | null {
  const local = normalizeTanzaniaPhone(raw);
  return local ? networks.find(n => n.prefixes.includes(local.slice(0, 3)))?.name ?? null : null;
}

export function formatTanzaniaPhone(raw: string): string {
  const local = normalizeTanzaniaPhone(raw);
  return local ? `+255 ${local.slice(1, 4)} ${local.slice(4, 7)} ${local.slice(7)}` : raw;
}