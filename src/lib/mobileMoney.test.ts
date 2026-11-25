import { describe, expect, it } from "vitest";
import { detectMobileNetwork, formatTanzaniaPhone, normalizeTanzaniaPhone } from "./mobileMoney";

describe("Tanzania mobile money", () => {
  it("normalizes local, international and national forms to the same number", () => {
    for (const phone of ["0751234567", "+255 751 234 567", "751234567"]) {
      expect(normalizeTanzaniaPhone(phone)).toBe("0751234567");
    }
    expect(formatTanzaniaPhone("0751234567")).toBe("+255 751 234 567");
  });
  it("recognizes 063 as HaloPesa instead of rejecting it", () => {
    expect(detectMobileNetwork("0638242297")).toBe("HaloPesa");
    expect(normalizeTanzaniaPhone("0638242297")).toBe("0638242297");
  });
  it("identifies each supported network from its original allocation", () => {
    expect(detectMobileNetwork("0751234567")).toBe("M-Pesa");
    expect(detectMobileNetwork("0681234567")).toBe("Airtel Money");
    expect(detectMobileNetwork("0651234567")).toBe("Mixx by Yas");
    expect(detectMobileNetwork("0731234567")).toBe("T-Pesa");
  });
  it("rejects malformed and foreign numbers without blocking an unknown mobile allocation", () => {
    expect(normalizeTanzaniaPhone("+254751234567")).toBeNull();
    expect(normalizeTanzaniaPhone("075123")).toBeNull();
    expect(normalizeTanzaniaPhone("0751234567abc")).toBeNull();
    expect(normalizeTanzaniaPhone("0641234567")).toBe("0641234567");
    expect(detectMobileNetwork("0641234567")).toBeNull();
  });
});