import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Webhook, MessageSquare, MessagesSquare, Sheet, Zap, Workflow, Trash2, Send, Loader2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Provider = {
  id: string;
  name: string;
  description: string;
  icon: typeof Webhook;
  category: string;
  urlHint: string;
  help: string;
};

const PROVIDERS: Provider[] = [
  { id: "slack", name: "Slack", description: "Post a message to a channel for every sign-up", icon: MessageSquare, category: "Team alerts", urlHint: "https://hooks.slack.com/services/...", help: "In Slack: Apps → Incoming Webhooks → Add to channel, then copy the Webhook URL." },
  { id: "discord", name: "Discord", description: "Send sign-up alerts to a Discord channel", icon: MessagesSquare, category: "Team alerts", urlHint: "https://discord.com/api/webhooks/...", help: "In Discord: Channel settings → Integrations → Webhooks → New Webhook → Copy URL." },
  { id: "zapier", name: "Zapier", description: "Connect to 6,000+ apps like Gmail, HubSpot, Mailchimp", icon: Zap, category: "Automation", urlHint: "https://hooks.zapier.com/hooks/catch/...", help: "Create a Zap with trigger “Webhooks by Zapier → Catch Hook” and paste its URL." },
  { id: "make", name: "Make", description: "Build visual automations with any tool", icon: Workflow, category: "Automation", urlHint: "https://hook.eu1.make.com/...", help: "Add a “Custom webhook” module in Make and paste its address." },
  { id: "google_sheets", name: "Google Sheets", description: "Add each attendee as a new row (via Zapier or Make)", icon: Sheet, category: "Automation", urlHint: "https://hooks.zapier.com/... or https://hook.make.com/...", help: "Create a Zapier/Make scenario: Webhook trigger → Google Sheets “Add row”, then paste the webhook URL." },
  { id: "webhook", name: "Custom webhook", description: "Send attendee data to any URL (n8n, your own server…)", icon: Webhook, category: "Developer", urlHint: "https://your-server.com/webhook", help: "We'll POST JSON with event and attendee details to this HTTPS address." },
];

const EVENTS = [
  { id: "registration.created", label: "New registration" },
  { id: "attendee.checked_in", label: "Attendee checked in" },
];

type Integration = {
  id: string;
  provider: string;
  name: string;
  webhook_url: string;
  events: string[];
  enabled: boolean;
  last_status: string | null;
  last_triggered_at: string | null;
};

const isValidUrl = (u: string) => {
  try {
    return new URL(u).protocol === "https:";
  } catch {
    return false;
  }
};

const Integrations = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState<Provider | null>(null);
  const [editing, setEditing] = useState<Integration | null>(null);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>(["registration.created"]);
  const [testing, setTesting] = useState<string | null>(null);

  const { data: items = [] } = useQuery({
    queryKey: ["integrations", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("integrations").select("*").order("created_at");
      if (error) throw error;
      return data as Integration[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!open || !user) return;
      const row = { provider: open.id, name: open.name, webhook_url: url.trim(), events };
      const q = editing
        ? (supabase as any).from("integrations").update(row).eq("id", editing.id)
        : (supabase as any).from("integrations").insert({ ...row, user_id: user.id });
      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["integrations"] });
      toast.success(`${open?.name} ${editing ? "updated" : "connected"}`);
      setOpen(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Integration> }) => {
      const { error } = await (supabase as any).from("integrations").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integrations"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("integrations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["integrations"] });
      toast.success("Disconnected");
    },
  });

  const openFor = (p: Provider, existing?: Integration) => {
    setOpen(p);
    setEditing(existing ?? null);
    setUrl(existing?.webhook_url ?? "");
    setEvents(existing?.events ?? ["registration.created"]);
  };

  const sendTest = async (i: Integration) => {
    setTesting(i.id);
    const { data, error } = await supabase.functions.invoke("dispatch-integrations", {
      body: { action: "test", integration_id: i.id },
    });
    setTesting(null);
    qc.invalidateQueries({ queryKey: ["integrations"] });
    if (error || !String(data?.status ?? "").startsWith("ok")) toast.error(`Test failed: ${data?.status ?? error?.message}`);
    else toast.success("Test sent — check your tool!");
  };

  const categories = [...new Set(PROVIDERS.map((p) => p.category))];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold">Integrations</h1>
        <p className="text-muted-foreground">Get notified and sync attendees to your favorite tools automatically.</p>
      </div>

      {items.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Connected</h2>
          <div className="rounded-xl divide-y divide-muted">
            {items.map((i) => {
              const p = PROVIDERS.find((x) => x.id === i.provider) ?? PROVIDERS[PROVIDERS.length - 1];
              const ok = i.last_status?.startsWith("ok");
              return (
                <div key={i.id} className="flex flex-wrap items-center gap-4 px-5 py-4 bg-card first:rounded-t-xl last:rounded-b-xl">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <p.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-sm">{p.name}</h3>
                      {i.last_status && (
                        <Badge variant={ok ? "secondary" : "destructive"} className="rounded-full text-[10px]">
                          {ok ? "Working" : "Last send failed"}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {i.events.map((e) => EVENTS.find((x) => x.id === e)?.label).join(" · ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={i.enabled} onCheckedChange={(v) => update.mutate({ id: i.id, patch: { enabled: v } })} aria-label="Enabled" />
                    <Button variant="outline" size="sm" className="rounded-full text-xs" onClick={() => sendTest(i)} disabled={testing === i.id}>
                      {testing === i.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3 mr-1" />}
                      Test
                    </Button>
                    <Button variant="ghost" size="sm" className="rounded-full text-xs" onClick={() => openFor(p, i)}>Edit</Button>
                    <Button variant="ghost" size="icon" className="rounded-full" onClick={() => remove.mutate(i.id)} aria-label="Disconnect">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {categories.map((category) => (
        <div key={category}>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{category}</h2>
          <div className="rounded-xl divide-y divide-muted">
            {PROVIDERS.filter((p) => p.category === category).map((p) => (
              <div key={p.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/50 transition-colors first:rounded-t-xl last:rounded-b-xl">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                  <p.icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm">{p.name}</h3>
                  <p className="text-xs text-muted-foreground truncate">{p.description}</p>
                </div>
                <Button variant="outline" size="sm" className="rounded-full text-xs flex-shrink-0" onClick={() => openFor(p)}>
                  <Plus className="w-3 h-3 mr-1" /> Connect
                </Button>
              </div>
            ))}
          </div>
        </div>
      ))}

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit" : "Connect"} {open?.name}</DialogTitle>
            <DialogDescription>{open?.help}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wh-url">Webhook URL</Label>
              <Input id="wh-url" className="rounded-full" placeholder={open?.urlHint} value={url} onChange={(e) => setUrl(e.target.value)} />
              {url && !isValidUrl(url) && <p className="text-xs text-destructive">Enter a valid https:// address.</p>}
            </div>
            <div className="space-y-2">
              <Label>Send when</Label>
              {EVENTS.map((ev) => (
                <label key={ev.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={events.includes(ev.id)}
                    onCheckedChange={(v) => setEvents((cur) => (v ? [...cur, ev.id] : cur.filter((x) => x !== ev.id)))}
                  />
                  {ev.label}
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" className="rounded-full" onClick={() => setOpen(null)}>Cancel</Button>
            <Button className="rounded-full" disabled={!isValidUrl(url) || events.length === 0 || save.isPending} onClick={() => save.mutate()}>
              {save.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? "Save" : "Connect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Integrations;
