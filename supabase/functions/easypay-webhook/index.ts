import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const enc = new TextEncoder();
async function hmacHex(secret: string, raw: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(raw));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const secret = Deno.env.get("EASYPAY_WEBHOOK_SECRET");
  if (!secret) return new Response("Not configured", { status: 503 });

  const raw = await req.text();
  const provided = (req.headers.get("x-webhook-signature") || "").trim().toLowerCase();
  if (!provided || !safeEqual(await hmacHex(secret, raw), provided)) return new Response("Invalid signature", { status: 401 });

  const eventId = req.headers.get("x-webhook-event-id");
  if (!eventId) return new Response("Missing event id", { status: 400 });
  let payload: any;
  try { payload = JSON.parse(raw); } catch { return new Response("Bad JSON", { status: 400 }); }

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { error: dupErr } = await db.from("payment_webhook_events").insert({ event_id: eventId, event_name: req.headers.get("x-webhook-event"), payload });
  if (dupErr) {
    if (dupErr.code === "23505") return new Response("Duplicate", { status: 200 });
    return new Response("Storage error", { status: 500 });
  }

  const d = payload?.data || {};
  const ref = d.merchantReference || d.metadata?.orderId;
  const state = String(d.state || "").toUpperCase();
  if (!ref) return new Response("OK", { status: 200 });
  const { data: pay } = await db.from("payments").select("*").eq("merchant_reference", ref).maybeSingle();
  if (!pay) return new Response("OK", { status: 200 });
  if (pay.state === "COMPLETED") return new Response("OK", { status: 200 });
  const now = new Date().toISOString();

  if (state === "COMPLETED") {
    if (String(d.amount) !== String(pay.amount) || (d.currency && d.currency !== pay.currency)) {
      await db.from("payments").update({ state: "AMOUNT_MISMATCH", failure_reason: `Received ${d.amount} ${d.currency}`, updated_at: now }).eq("id", pay.id);
      return new Response("OK", { status: 200 });
    }
    await db.from("payments").update({ state: "COMPLETED", easypay_reference: d.reference ?? pay.easypay_reference, updated_at: now }).eq("id", pay.id);
    // Re-activates the ticket even if the unpaid reservation had expired.
    await db.from("registrations").update({ payment_status: "paid", status: "registered" }).eq("id", pay.registration_id);
  } else if (state === "FAILED" || state === "CANCELLED") {
    await db.from("payments").update({ state, failure_reason: d.metadata?.failureReason ?? null, updated_at: now }).eq("id", pay.id);
    await db.from("registrations").update({ payment_status: "failed", status: "cancelled" }).eq("id", pay.registration_id).neq("payment_status", "paid");
  } else if (state) {
    await db.from("payments").update({ state, updated_at: now }).eq("id", pay.id);
  }
  return new Response("OK", { status: 200 });
});
