import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Event } from "@/hooks/useEvents";
import { parseTiers, TicketTier } from "@/lib/ticketTiers";

export default function TicketTiersEditor({ event, onSave }: { event: Event; onSave: (tiers: any) => Promise<unknown> }) {
  const [tiers, setTiers] = useState<TicketTier[]>(parseTiers((event as any).ticket_tiers));
  const [saving, setSaving] = useState(false);

  const update = (i: number, patch: Partial<TicketTier>) =>
    setTiers((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));

  const save = async () => {
    const clean = tiers.map((t) => ({ ...t, name: t.name.trim() })).filter((t) => t.name);
    if (new Set(clean.map((t) => t.name)).size !== clean.length) {
      toast.error("Each ticket type needs a unique name");
      return;
    }
    setSaving(true);
    try {
      await onSave(clean);
      setTiers(clean);
      toast.success("Ticket types saved");
    } catch (e: any) {
      toast.error(e.message || "Couldn't save ticket types");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card rounded-xl p-5 sm:p-6 space-y-4">
      <div>
        <h3 className="font-display font-semibold">Ticket types</h3>
        <p className="text-sm text-muted-foreground">Offer passes like General, VIP or Student. Leave empty for a single standard ticket.</p>
      </div>
      {tiers.map((t, i) => (
        <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1.5fr_120px_auto] items-center">
          <Input placeholder="Name (e.g. VIP)" value={t.name} onChange={(e) => update(i, { name: e.target.value })} className="rounded-full" />
          <Input placeholder="Short description" value={t.description || ""} onChange={(e) => update(i, { description: e.target.value })} className="rounded-full" />
          <Input type="number" min={1} placeholder="Limit" value={t.capacity ?? ""} onChange={(e) => update(i, { capacity: e.target.value ? parseInt(e.target.value) : null })} className="rounded-full" />
          <Button variant="ghost" size="icon" aria-label="Remove ticket type" onClick={() => setTiers((p) => p.filter((_, idx) => idx !== i))}>
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      ))}
      <div className="flex gap-2">
        <Button variant="outline" className="rounded-full" onClick={() => setTiers((p) => [...p, { name: "", description: "", capacity: null }])}>
          <Plus className="w-4 h-4 mr-1" /> Add ticket type
        </Button>
        <Button className="rounded-full" onClick={save} disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Save
        </Button>
      </div>
    </div>
  );
}
