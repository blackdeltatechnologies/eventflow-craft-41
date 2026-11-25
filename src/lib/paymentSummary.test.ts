import { expect, it } from "vitest";
import { summarizePayments } from "./paymentSummary";

it("counts only completed TZS payments as revenue and groups by ticket tier/network", () => {
  const result = summarizePayments([
    { amount: "1000", currency: "TZS", state: "COMPLETED", payer_phone: "0638242297", registrations: { ticket_tier: "VIP" } },
    { amount: "500", currency: "TZS", state: "COMPLETED", payer_phone: "0751234567", registrations: { ticket_tier: "Standard" } },
    { amount: "2000", currency: "TZS", state: "PROCESSING", payer_phone: "" },
    { amount: "3000", currency: "TZS", state: "FAILED", payer_phone: "" },
    { amount: "9000", currency: "USD", state: "COMPLETED", payer_phone: "" },
    { amount: "bad", currency: "TZS", state: "COMPLETED", payer_phone: "" },
  ]);
  expect(result.collected).toBe(1500);
  expect(result.pending).toBe(2000);
  expect(result.completedCount).toBe(2);
  expect(result.failedCount).toBe(1);
  expect(result.byTier).toEqual([{ name: "VIP", amount: 1000 }, { name: "Standard", amount: 500 }]);
  expect(result.byNetwork).toEqual([{ name: "HaloPesa", amount: 1000 }, { name: "M-Pesa", amount: 500 }]);
});