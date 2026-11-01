import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, CalendarDays, MapPin, Video, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { usePublicEvents } from "@/hooks/useEvents";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "upcoming", label: "Upcoming" },
  { id: "weekend", label: "This weekend" },
  { id: "online", label: "Online" },
  { id: "inperson", label: "In person" },
] as const;

function isThisWeekend(d: Date) {
  const now = new Date();
  const sat = new Date(now);
  sat.setDate(now.getDate() + ((6 - now.getDay() + 7) % 7));
  sat.setHours(0, 0, 0, 0);
  const mon = new Date(sat);
  mon.setDate(sat.getDate() + 2);
  return d >= sat && d < mon;
}

export default function EventsDirectory() {
  const { data: events, isLoading } = usePublicEvents();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    const now = new Date();
    return (events ?? []).filter((e) => {
      if (term && ![e.name, e.description, e.location_value].some((v) => v?.toLowerCase().includes(term))) return false;
      const d = e.event_date ? new Date(e.event_date) : null;
      if (filter === "upcoming") return !!d && d >= now;
      if (filter === "weekend") return !!d && isThisWeekend(d);
      if (filter === "online") return e.location_type === "virtual" || e.location_type === "hybrid";
      if (filter === "inperson") return e.location_type === "physical" || e.location_type === "hybrid";
      return true;
    });
  }, [events, q, filter]);

  return (
    <div className="min-h-screen bg-background">
      <header className="max-w-7xl mx-auto h-20 px-5 sm:px-8 flex items-center justify-between">
        <Link to="/" aria-label="EVENTLAUNCH home"><Logo size="sm" /></Link>
        <Button asChild className="rounded-full"><Link to="/auth">Host an event</Link></Button>
      </header>
      <main className="max-w-7xl mx-auto px-5 sm:px-8 pb-20">
        <h1 className="text-4xl sm:text-6xl font-display font-bold mt-6">Explore events</h1>
        <p className="text-muted-foreground mt-3 max-w-xl">Find something happening soon and save your spot.</p>
        <div className="mt-8 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, topic or place" className="pl-10 h-11 rounded-full" aria-label="Search events" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {FILTERS.map((f) => (
              <Button key={f.id} variant={filter === f.id ? "default" : "outline"} className="rounded-full h-11 shrink-0" onClick={() => setFilter(f.id)}>{f.label}</Button>
            ))}
          </div>
        </div>
        {isLoading ? (
          <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : list.length === 0 ? (
          <p className="py-20 text-center text-muted-foreground">No events match right now. Check back soon.</p>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((e, i) => (
              <motion.div key={e.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.05 }}>
                <Link to={`/register/${e.slug}`} className="group block">
                  <div className="aspect-[16/10] rounded-2xl overflow-hidden bg-muted mb-3">
                    {e.background_image_url ? (
                      <img src={e.background_image_url} alt={e.name} loading="lazy" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><CalendarDays className="w-8 h-8 text-muted-foreground/40" /></div>
                    )}
                  </div>
                  {e.event_date && <p className="text-xs font-medium text-primary">{new Date(e.event_date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</p>}
                  <h2 className="font-display font-semibold text-lg mt-1 group-hover:underline">{e.name}</h2>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    {e.location_type === "physical" ? <MapPin className="w-3 h-3" /> : <Video className="w-3 h-3" />}
                    {e.location_value || (e.location_type === "physical" ? "In person" : "Online")}
                  </p>
                  {e.organizer?.company && <p className="text-xs text-muted-foreground mt-1">by {e.organizer.company}</p>}
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
