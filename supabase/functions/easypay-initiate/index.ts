import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

/** Normalises Tanzanian mobile numbers to 0XXXXXXXXX, or null when invalid. */
export function normalizePhone(raw: string): string | null {
  const d = String(raw || "").replace(/\D/g, "");
  let local = d;
  if (d.startsWith("255") && d.length === 12) local = "0" + d.slice(3);
  else if (d.length === 9) local = "0" + d;
  return /^0[67]\d{8}$/.test(local) ? local : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const apiKey = Deno.env.get("EASYPAY_API_KEY"), secretKey = Deno.env.get("EASYPAY_SECRET_KEY");
  if (!apiKey || !secretKey) return json({ error: "Payments are not configured" }, 503);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid request" }, 400); }
  const { event_id, data, tier } = body || {};
  const phone = normalizePhone(body?.phone);
  if (!event_id || !data || typeof data !== "object") return json({ error: "Missing details" }, 400);
  if (!phone) return json({ error: "Enter a valid mobile money number, e.g. 0712345678" }, 400);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: ev } = await db.from("events").select("id,name,status,ticket_tiers").eq("id", event_id).eq("status", "live").maybeSingle();
  if (!ev) return json({ error: "Event not found" }, 404);
  const t = (Array.isArray(ev.ticket_tiers) ? ev.ticket_tiers : []).find((x: any) => x?.name === tier);
  const price = Math.round(Number(t?.price || 0));
  if (!t || !(price > 0)) return json({ error: "This ticket type is not a paid ticket" }, 400);

  // Release unpaid reservations older than 20 minutes so their spots return.
  const cutoff = new Date(Date.now() - 20 * 60 * 1000).toISOString();
  const { data: stale } = await db.from("registrations").select("id").eq("event_id", event_id).eq("payment_status", "pending").lt("created_at", cutoff);
  if (stale?.length) {
    const ids = stale.map((r) => r.id);
    await db.from("registrations").update({ status: "cancelled", payment_status: "expired" }).in("id", ids);
    await db.from("payments").update({ state: "EXPIRED", updated_at: new Date().toISOString() }).in("registration_id", ids).in("state", ["PENDING", "INITIATED", "PROCESSING"]);
  }

  // Reserve the spot using the same capacity rules as free registrations.
  const { data: regId, error: regErr } = await db.rpc("register_for_event", { p_event_id: event_id, p_data: data, p_tier: tier });
  if (regErr || !regId) return json({ error: regErr?.message || "Could not reserve ticket" }, 400);
  await db.from("registrations").update({ payment_status: "pending" }).eq("id", regId);

  const ref = `EVT-${crypto.randomUUID()}`;
  const amount = String(price);
  const payerName = String(data["Full Name"] || data["Name"] || "Ticket buyer").slice(0, 255);
  const payerEmail = data["Email Address"] || data["Email"] || data["email"];
  await db.from("payments").insert({ registration_id: regId, event_id, merchant_reference: ref, amount, currency: "TZS", payer_phone: phone });

  const fail = async (msg: string, status = 502) => {
    await db.from("registrations").update({ status: "cancelled", payment_status: "failed" }).eq("id", regId);
    await db.from("payments").update({ state: "FAILED", failure_reason: msg.slice(0, 500), updated_at: new Date().toISOString() }).eq("merchant_reference", ref);
    return json({ error: msg }, status);
  };

  try {
    const res = await fetch("https://api.easypay.co.tz/v1/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": apiKey, "X-Secret-Key": secretKey, "X-Idempotency-Key": ref },
      body: JSON.stringify({
        amount, currency: "TZS", mode: "instant", payerPhone: phone, payerName,
        ...(payerEmail ? { payerEmail: String(payerEmail) } : {}),
        description: `${ev.name} - ${tier}`.slice(0, 255),
        merchantReference: ref,
        metadata: { orderId: ref, eventId: event_id, ticketCategory: tier, quantity: 1 },
      }),
      signal: AbortSignal.timeout(20000),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok || !out?.success) return await fail(out?.message || `Payment could not start (${res.status})`);
    await db.from("payments").update({ easypay_reference: out.data?.reference ?? null, state: out.data?.state || "INITIATED", updated_at: new Date().toISOString() }).eq("merchant_reference", ref);
    return json({ reference: ref, registration_id: regId });
  } catch (e) {
    return await fail("Payment service did not respond, please try again");
  }
});
