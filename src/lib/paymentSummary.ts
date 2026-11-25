import { detectMobileNetwork } from "./mobileMoney";

type SummaryPayment = { amount: string; currency: string; state: string; payer_phone: string; registrations?: { ticket_tier: string | null } | null };
const pendingStates = new Set(["INITIATED", "PENDING", "PROCESSING"]);

export function summarizePayments(payments: SummaryPayment[]) {
  let collected = 0, pending = 0, completedCount = 0, failedCount = 0;
  const byTier = new Map<string, number>();
  const byNetwork = new Map<string, number>();
  for (const payment of payments) {
    const amount = Number(payment.amount);
    if (payment.currency !== "TZS" || !Number.isFinite(amount) || amount < 0) continue;
    if (payment.state === "COMPLETED") {
      collected += amount;
      completedCount++;
      const tier = payment.registrations?.ticket_tier || "Unspecified";
      const network = detectMobileNetwork(payment.payer_phone) || "Unknown";
      byTier.set(tier, (byTier.get(tier) || 0) + amount);
      byNetwork.set(network, (byNetwork.get(network) || 0) + amount);
    } else if (pendingStates.has(payment.state)) pending += amount;
    else failedCount++;
  }
  const toRows = (map: Map<string, number>) => [...map].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);
  return { collected, pending, completedCount, failedCount, byTier: toRows(byTier), byNetwork: toRows(byNetwork) };
}

export const formatMoney = (amount: number) => `TZS ${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;