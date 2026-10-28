import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

type Integration = { id: string; provider: string; webhook_url: string; events: string[]; enabled: boolean };

function safeUrl(u: string) {
  try {
    const url = new URL(u);
    if (url.protocol !== "https:") return false;
    const h = url.hostname.toLowerCase();
    if (h === "localhost" || h.endsWith(".local") || /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h)) return false;
    return true;
  } catch {
    return false;
  }
}

function buildBody(provider: string, eventType: string, payload: Record<string, unknown>) {
  const label = eventType === "registration.created" ? "New registration" : eventType === "attendee.checked_in" ? "Attendee checked in" : "Test from EVENTLAUNCH";
  const data = (payload.attendee ?? {}) as Record<string, string>;
  const who = data["Full Name"] || data["Name"] || data["Email Address"] || data["Email"] || "Someone";
  const text = `🎟️ ${label}: ${who} — ${payload.event_name ?? ""}`;
  if (provider === "slack") return { text };
  if (provider === "discord") return { content: text };
  return { type: eventType, ...payload };
}

async function send(admin: any, integ: Integration, eventType: string, payload: Record<string, unknown>) {
  let status = "error";
  try {
    if (!safeUrl(integ.webhook_url)) throw new Error("invalid url");
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(integ.webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildBody(integ.provider, eventType, payload)),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    await res.text();
    status = res.ok ? `ok ${res.status}` : `failed ${res.status}`;
  } catch (e) {
    status = `error: ${(e as Error).message}`.slice(0, 120);
  }
  await admin.from("integrations").update({ last_status: status, last_triggered_at: new Date().toISOString() }).eq("id", integ.id);
  return status;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { action, registration_id, integration_id } = await req.json();

    // Test: owner only
    if (action === "test") {
      const token = req.headers.get("Authorization")?.replace("Bearer ", "");
      const { data: u } = await admin.auth.getUser(token ?? "");
      if (!u?.user) return json({ error: "Unauthorized" }, 401);
      const { data: integ } = await admin.from("integrations").select("*").eq("id", integration_id).eq("user_id", u.user.id).maybeSingle();
      if (!integ) return json({ error: "Not found" }, 404);
      const status = await send(admin, integ, "test", {
        event_name: "Sample Event",
        attendee: { "Full Name": "Test Attendee", "Email Address": "test@example.com" },
        sent_at: new Date().toISOString(),
      });
      return json({ status });
    }

    if (typeof registration_id !== "string") return json({ error: "registration_id required" }, 400);
    const { data: reg } = await admin.from("registrations").select("id, event_id, data, status, created_at, checked_in_at").eq("id", registration_id).maybeSingle();
    if (!reg) return json({ error: "Not found" }, 404);
    const { data: event } = await admin.from("events").select("id, name, user_id, slug").eq("id", reg.event_id).maybeSingle();
    if (!event) return json({ error: "Not found" }, 404);

    let eventType: string;
    if (action === "registration") {
      // Only fire for freshly created registrations (prevents replays)
      if (Date.now() - new Date(reg.created_at).getTime() > 2 * 60 * 1000) return json({ skipped: true });
      eventType = "registration.created";
    } else if (action === "checkin") {
      const token = req.headers.get("Authorization")?.replace("Bearer ", "");
      const { data: u } = await admin.auth.getUser(token ?? "");
      if (!u?.user || u.user.id !== event.user_id) return json({ error: "Unauthorized" }, 401);
      eventType = "attendee.checked_in";
    } else return json({ error: "Unknown action" }, 400);

    const { data: integs } = await admin.from("integrations").select("*").eq("user_id", event.user_id).eq("enabled", true);
    const targets = (integs ?? []).filter((i: Integration) => i.events.includes(eventType));
    const payload = {
      event_id: event.id,
      event_name: event.name,
      event_slug: event.slug,
      registration_id: reg.id,
      status: reg.status,
      registered_at: reg.created_at,
      checked_in_at: reg.checked_in_at,
      attendee: reg.data,
    };
    const results = await Promise.all(targets.map((i: Integration) => send(admin, i, eventType, payload)));
    return json({ sent: results.length });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
