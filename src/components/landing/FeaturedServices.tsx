import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight, ChevronLeft, ChevronRight, LayoutTemplate, Layers, QrCode, ScanLine, BarChart3, SearchCheck, Webhook, Compass, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import imgPages from "@/assets/event-vibe-coding-summit.jpg";
import imgTiers from "@/assets/event-startup-weekend.jpg";
import imgPass from "@/assets/event-late-night-jam.jpg";
import imgCheckin from "@/assets/community-music.jpg";
import imgAnalytics from "@/assets/event-hackathon-ai.jpg";
import imgLookup from "@/assets/event-chill-code-workshop.jpg";
import imgHooks from "@/assets/event-retrohack.jpg";
import imgDirectory from "@/assets/community-workshop.jpg";

type Service = { tag: string; icon: LucideIcon; title: string; description: string; image: string; href: string };

const services: Service[] = [
  { tag: "Pages", icon: LayoutTemplate, title: "Branded event pages", description: "Three layouts, your colors, your flyer.", image: imgPages, href: "/auth" },
  { tag: "Ticketing", icon: Layers, title: "Multiple ticket tiers", description: "Early bird, VIP and general, each with limits.", image: imgTiers, href: "/auth" },
  { tag: "Passes", icon: QrCode, title: "Instant QR passes", description: "Downloadable tickets with calendar sync.", image: imgPass, href: "/auth" },
  { tag: "Check-in", icon: ScanLine, title: "At-the-door scanning", description: "Camera scanner with instant feedback.", image: imgCheckin, href: "/auth" },
  { tag: "Insights", icon: BarChart3, title: "Live analytics", description: "Registrations over time and check-in rates.", image: imgAnalytics, href: "/auth" },
  { tag: "Attendees", icon: SearchCheck, title: "Find-my-ticket lookup", description: "Attendees recover their pass by email.", image: imgLookup, href: "/auth" },
  { tag: "Automation", icon: Webhook, title: "Slack & Zapier alerts", description: "Send every signup where your team works.", image: imgHooks, href: "/auth" },
  { tag: "Discovery", icon: Compass, title: "Public event directory", description: "Get found by people looking for events.", image: imgDirectory, href: "/events" },
];

function ServiceCard({ s }: { s: Service }) {
  const Icon = s.icon;
  return (
    <Link
      to={s.href}
      className="group relative block shrink-0 w-[280px] sm:w-[320px] aspect-[4/5] rounded-3xl overflow-hidden ring-1 ring-border/40 transition-all duration-500 hover:scale-105 hover:ring-2 hover:ring-primary hover:shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <img src={s.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
      <div className="absolute inset-0 bg-gradient-to-t from-foreground/90 via-foreground/40 to-foreground/10 dark:from-background/95 dark:via-background/50" />
      <div className="relative h-full flex flex-col justify-between p-6 text-photo-foreground">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-background/20 backdrop-blur px-3 py-1 text-xs font-medium">{s.tag}</span>
          <span className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center"><Icon size={20} aria-hidden /></span>
        </div>
        <div>
          <h3 className="font-display text-2xl font-semibold leading-tight">{s.title}</h3>
          <p className="mt-2 text-sm opacity-80">{s.description}</p>
          <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium">
            Learn more
            <span className="w-9 h-9 rounded-full bg-background text-foreground flex items-center justify-center transition-transform group-hover:rotate-45"><ArrowUpRight size={16} aria-hidden /></span>
          </span>
        </div>
      </div>
    </Link>
  );
}

function Header() {
  return (
    <div className="max-w-7xl mx-auto px-5 sm:px-8 mb-10">
      <span className="inline-flex rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium">What We Do</span>
      <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold mt-4">Featured Services</h2>
      <div className="mt-4 h-1 w-16 rounded-full bg-primary" />
    </div>
  );
}

function useIsDesktop() {
  const [d, setD] = useState(() => typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches);
  useEffect(() => {
    const m = window.matchMedia("(min-width: 768px)");
    const on = () => setD(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return d;
}

function DesktopScrub() {
  const outer = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [distance, setDistance] = useState(0);
  useEffect(() => {
    const measure = () => track.current && setDistance(Math.max(0, track.current.scrollWidth - window.innerWidth + 64));
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  const { scrollYProgress } = useScroll({ target: outer, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, [0, 1], [0, -distance]);
  return (
    <section ref={outer} id="services" className="relative bg-background" style={{ height: `calc(100vh + ${distance}px)` }}>
      <div className="sticky top-0 h-screen overflow-hidden flex flex-col justify-center">
        <Header />
        <motion.div ref={track} style={{ x }} className="flex gap-6 pl-8 lg:pl-[max(2rem,calc((100vw-80rem)/2+2rem))] pr-8 py-6 w-max">
          {services.map((s) => <ServiceCard key={s.title} s={s} />)}
        </motion.div>
      </div>
    </section>
  );
}

function SwipeCarousel({ reduced }: { reduced: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    const step = (card?.offsetWidth ?? 280) + 16;
    setActive(Math.min(services.length - 1, Math.round(el.scrollLeft / step)));
  };
  const go = (i: number) => {
    const el = ref.current;
    const target = el?.children[Math.max(0, Math.min(services.length - 1, i))] as HTMLElement | undefined;
    if (el && target) el.scrollTo({ left: target.offsetLeft - el.offsetLeft - 20, behavior: reduced ? "auto" : "smooth" });
  };
  return (
    <section id="services" className="py-20 bg-background">
      <Header />
      <div
        ref={ref}
        onScroll={onScroll}
        className={`flex gap-4 overflow-x-auto snap-x snap-mandatory px-5 pb-4 [-webkit-overflow-scrolling:touch] ${reduced ? "" : "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden"}`}
      >
        {services.map((s) => <div key={s.title} className="snap-center sm:snap-start shrink-0 py-3"><ServiceCard s={s} /></div>)}
      </div>
      <div className="flex items-center justify-center gap-4 mt-4 px-5">
        <Button variant="outline" size="icon" className="rounded-full h-11 w-11" aria-label="Previous service" onClick={() => go(active - 1)} disabled={active === 0}><ChevronLeft /></Button>
        <div className="flex gap-1.5">
          {services.map((s, i) => (
            <button key={s.title} aria-label={`Go to ${s.title}`} onClick={() => go(i)} className="p-1.5">
              <span className={`block h-2 rounded-full transition-all ${i === active ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30"}`} />
            </button>
          ))}
        </div>
        <Button variant="outline" size="icon" className="rounded-full h-11 w-11" aria-label="Next service" onClick={() => go(active + 1)} disabled={active === services.length - 1}><ChevronRight /></Button>
      </div>
    </section>
  );
}

export function FeaturedServices() {
  const reduced = !!useReducedMotion();
  const desktop = useIsDesktop();
  if (desktop && !reduced) return <DesktopScrub />;
  return <SwipeCarousel reduced={reduced} />;
}
