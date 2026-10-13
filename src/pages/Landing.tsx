import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, MotionConfig, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, ArrowUpRight, ArrowDown, Check, Sparkles, Ticket, ScanLine, BarChart3, Menu, X, CalendarDays, MapPin, Users, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import heroPhoto from "@/assets/community-hero.jpg";
import musicPhoto from "@/assets/community-music.jpg";
import workshopPhoto from "@/assets/community-workshop.jpg";

const words = ["people.", "possibility.", "good times."];
const previewTabs = [
  { title: "Your event page", icon: Ticket, heading: "Your idea. Your identity.", description: "A registration page that feels like you. Add your images, choose your colors, and make the first impression count." },
  { title: "At the door", icon: ScanLine, heading: "Less waiting. More welcome.", description: "A personal QR pass for every attendee. Scan arrivals or check them in by name, and keep the line moving." },
  { title: "The bigger picture", icon: BarChart3, heading: "Know how it all came together.", description: "Follow registrations over time, compare your events, and see how many people made it through the door." },
];
const faqs = [
  { q: "Is EVENTLAUNCH free?", a: "Yes. Create event registration pages, manage attendees, use QR check-in, and view your event analytics without a subscription." },
  { q: "Can I make my page look like my brand?", a: "Yes. Use your own event images, colors, and description, and choose a registration layout that suits your event." },
  { q: "How does check-in work?", a: "Attendees receive a personal QR pass on their registration confirmation screen. Open your event’s Check-in page to scan their pass or check them in by name." },
  { q: "Can I export my guest list?", a: "Yes. You can filter your attendee list and download it as a CSV from the attendee management page." },
];

function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduced = useReducedMotion();
  return <motion.div className={className} initial={reduced ? false : { opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}>{children}</motion.div>;
}

function LaunchPreview({ active }: { active: number }) {
  return <div className="relative min-h-[400px] sm:min-h-[440px] flex items-center justify-center p-6 sm:p-10 bg-launch-blue-soft rounded-lg overflow-hidden">
    <AnimatePresence mode="wait">
      <motion.div key={active} initial={{ opacity: 0, y: 24, rotate: -2 }} animate={{ opacity: 1, y: 0, rotate: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35 }} className="w-full max-w-[340px]">
        {active === 0 ? <div className="bg-card rounded-lg overflow-hidden launch-shadow">
          <img src={workshopPhoto} alt="Friends creating together at a workshop" width={1024} height={1024} loading="lazy" className="w-full h-40 object-cover" />
          <div className="p-5"><span className="text-xs font-medium text-primary">COMMUNITY WORKSHOP</span><h3 className="text-2xl font-semibold mt-2">Make something together.</h3><div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-3"><span className="flex gap-1 items-center"><CalendarDays size={13} /> Saturday afternoon</span><span className="flex gap-1 items-center"><MapPin size={13} /> The studio</span></div><Button asChild className="w-full mt-5 bg-primary text-primary-foreground hover:bg-primary/90"><Link to="/auth">Create a page like this <ArrowUpRight /></Link></Button></div>
        </div> : active === 1 ? <div className="bg-card rounded-lg p-7 launch-shadow text-center">
          <div className="w-12 h-12 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto"><CheckCircle2 /></div><h3 className="text-2xl font-semibold mt-4">You're on the list.</h3><p className="text-sm text-muted-foreground mt-2">A warm welcome starts here.</p>
          <div className="flex justify-center py-7"><ScanLine className="w-28 h-28 text-foreground" strokeWidth={1} /></div>
          <div className="bg-muted rounded-lg py-3 text-sm flex items-center justify-center gap-2"><Check size={16} className="text-success" /> Personal QR check-in</div>
        </div> : <div className="bg-card rounded-lg p-6 launch-shadow">
          <div className="flex justify-between items-center"><span className="font-semibold">Event overview</span><BarChart3 className="text-launch-blue w-5 h-5" /></div><p className="text-xs text-muted-foreground mt-1">Illustrative registration activity</p>
          <div className="mt-6 flex items-end justify-between"><div><span className="text-4xl font-display font-semibold">128</span><p className="text-xs text-muted-foreground mt-1">Registrations</p></div><span className="text-success text-sm">Growing together <ArrowUpRight className="inline w-4 h-4" /></span></div>
          <div className="flex gap-3 items-end h-32 mt-7" aria-label="Example registration chart">{[35, 52, 42, 70, 62, 85, 100].map((height, i) => <motion.div key={i} className="flex-1 bg-launch-blue rounded-t-sm" initial={{ height: 0 }} animate={{ height: `${height}%` }} transition={{ duration: 0.65, delay: i * 0.07 }} />)}</div>
          <div className="flex justify-between mt-3 text-xs text-muted-foreground"><span>Monday</span><span>Sunday</span></div>
        </div>}
      </motion.div>
    </AnimatePresence>
    <span className="absolute bottom-3 right-4 text-[10px] text-muted-foreground">EXAMPLE PREVIEW</span>
  </div>;
}

export default function Landing() {
  const [word, setWord] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const reduced = useReducedMotion();
  const { scrollY } = useScroll();
  const photoY = useTransform(scrollY, [0, 650], [0, reduced ? 0 : 100]);
  useEffect(() => {
    if (reduced) return;
    const interval = window.setInterval(() => setWord((previous) => (previous + 1) % words.length), 3200);
    return () => window.clearInterval(interval);
  }, [reduced]);

  return <MotionConfig reducedMotion="user"><div className="bg-background text-foreground overflow-x-clip launch-display">
    <header className="relative z-50 bg-background">
      <div className="max-w-7xl mx-auto h-20 px-5 sm:px-8 flex justify-between items-center gap-4">
        <Link to="/" aria-label="EVENTLAUNCH home"><Logo size="sm" /></Link>
        <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation"><a className="text-sm text-muted-foreground hover:text-foreground transition-colors" href="#experience">The experience</a><a className="text-sm text-muted-foreground hover:text-foreground transition-colors" href="#possibilities">Made for your thing</a><a className="text-sm text-muted-foreground hover:text-foreground transition-colors" href="#questions">Questions?</a></nav>
        <div className="flex items-center gap-2"><Button variant="ghost" asChild className="hidden sm:inline-flex"><Link to="/auth">Log in</Link></Button><Button asChild className="hidden sm:inline-flex"><Link to="/auth">Create an event <ArrowUpRight /></Link></Button><Button variant="ghost" size="icon" className="md:hidden" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</Button></div>
      </div>
      <AnimatePresence>{menuOpen && <motion.nav id="mobile-navigation" aria-label="Mobile navigation" className="md:hidden absolute top-20 inset-x-0 bg-background px-5 pb-6 launch-shadow flex flex-col gap-1" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>{[["The experience", "#experience"], ["Made for your thing", "#possibilities"], ["Questions?", "#questions"]].map(([label, href]) => <Button variant="ghost" className="justify-start" asChild key={href}><a href={href} onClick={() => setMenuOpen(false)}>{label}</a></Button>)}<Button asChild className="mt-2"><Link to="/auth">Create an event <ArrowRight /></Link></Button></motion.nav>}</AnimatePresence>
    </header>

    <section className="relative min-h-[560px] h-[calc(100svh-160px)] max-h-[780px] overflow-hidden flex items-center">
      <motion.img src={heroPhoto} width={1920} height={1024} alt="People connecting at a lively creative community event" fetchPriority="high" className="absolute inset-0 w-full h-[115%] object-cover object-[62%_center]" style={{ y: photoY }} />
      <div className="absolute inset-0 launch-hero-scrim" />
      <div className="relative max-w-7xl w-full mx-auto px-5 sm:px-8 py-12 text-photo-foreground">
        <motion.div initial={reduced ? false : { opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="max-w-[660px]">
          <span className="flex items-center gap-2 text-xs sm:text-sm mb-6"><span className="w-2 h-2 bg-launch-lime rounded-full" /> FOR THE PEOPLE WHO BRING PEOPLE TOGETHER</span>
          <h1 className="font-display font-semibold leading-[1.04] text-[36px] min-[375px]:text-[42px] sm:text-[64px] lg:text-[76px]">EVENTLAUNCH</h1>
          <p className="font-display text-[38px] sm:text-[60px] lg:text-[70px] leading-[1.1] font-medium mt-2">Make room for<br /><span className="text-launch-lime inline-flex h-[1.15em] overflow-hidden"><AnimatePresence mode="wait"><motion.span key={word} initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -60, opacity: 0 }} transition={{ duration: 0.4 }}>{words[word]}</motion.span></AnimatePresence></span></p>
          <p className="text-base sm:text-lg text-photo-foreground/85 leading-relaxed max-w-[420px] mt-6">Big ideas. Small gatherings. Everything in between. Give your next event a place to begin.</p>
          <div className="flex flex-wrap items-center gap-4 mt-8"><Button asChild size="lg" className="bg-launch-lime text-launch-lime-foreground hover:bg-launch-lime/90 px-6"><Link to="/auth">Launch your idea <ArrowUpRight /></Link></Button><Button variant="ghost" asChild className="text-photo-foreground hover:bg-photo-foreground/10 hover:text-photo-foreground"><a href="#experience">Take a look around <ArrowDown /></a></Button></div>
          <p className="text-xs text-photo-foreground/70 mt-5">Free to create. Yours to make memorable.</p>
        </motion.div>
      </div>
      <motion.div className="absolute right-8 bottom-8 hidden lg:flex gap-3 bg-card text-card-foreground rounded-lg p-4 launch-shadow w-[240px]" initial={{ opacity: 0, x: 40, rotate: 8 }} animate={{ opacity: 1, x: 0, rotate: -3 }} transition={{ type: "spring", delay: 0.8, damping: 16 }}><div className="rounded-full bg-success/10 w-10 h-10 flex items-center justify-center shrink-0 text-success"><Check /></div><div><p className="text-sm font-semibold">Good things start here.</p><p className="text-xs text-muted-foreground mt-1">Your next gathering awaits.</p></div></motion.div>
    </section>

    <div className="bg-launch-lime text-launch-lime-foreground overflow-hidden py-5" aria-label="Workshops, meetups, music, communities, and big ideas"><div className="launch-marquee flex w-max" aria-hidden="true">{[0, 1].map(copy => <div key={copy} className="flex items-center gap-10 pr-10">{["Small gatherings", "Big ideas", "Your people", "Real connections", "Good energy"].map(label => <span className="flex items-center gap-10 whitespace-nowrap font-display text-lg sm:text-xl font-medium" key={label}>{label}<Sparkles className="w-5 h-5" /></span>)}</div>)}</div></div>

    <section id="experience" className="launch-section py-20 sm:py-28">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <Reveal className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12"><div><p className="text-xs font-medium text-primary mb-4">LESS ORGANIZING. MORE CONNECTING.</p><h2 className="font-display text-4xl sm:text-5xl font-semibold leading-[1.12]">From “what if”<br />to “see you there.”</h2></div><p className="text-muted-foreground max-w-[330px] leading-relaxed">The little details, taken care of. So you can focus on the reason everyone came.</p></Reveal>
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          <Reveal><div role="tablist" aria-label="Event features" className="flex flex-wrap gap-2 mb-7">{previewTabs.map((tab, i) => <Button key={tab.title} id={`feature-tab-${i}`} role="tab" aria-selected={activeTab === i} aria-controls="feature-preview" variant={activeTab === i ? "default" : "secondary"} onClick={() => setActiveTab(i)} onKeyDown={event => { if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); const next = (i + (event.key === "ArrowRight" ? 1 : 2)) % 3; setActiveTab(next); document.getElementById(`feature-tab-${next}`)?.focus(); } }}><tab.icon />{tab.title}</Button>)}</div><div id="feature-preview" role="tabpanel" aria-labelledby={`feature-tab-${activeTab}`}><LaunchPreview active={activeTab} /></div></Reveal>
          <Reveal delay={0.15}><AnimatePresence mode="wait"><motion.div key={activeTab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}><span className="text-primary font-display text-lg">0{activeTab + 1} /</span><h3 className="font-display font-semibold text-3xl sm:text-4xl leading-tight mt-5 max-w-md">{previewTabs[activeTab].heading}</h3><p className="text-muted-foreground leading-relaxed text-lg mt-5 max-w-md">{previewTabs[activeTab].description}</p></motion.div></AnimatePresence><div className="space-y-3 mt-7">{["Your branding, front and center", "A guest list that stays organized", "One link to bring everyone together"].map(item => <p className="flex items-center gap-3 text-sm" key={item}><Check size={16} className="text-success" />{item}</p>)}</div><Button variant="link" className="p-0 mt-7 text-foreground" asChild><Link to="/auth">Make it yours <ArrowUpRight /></Link></Button></Reveal>
        </div>
      </div>
    </section>

    <section id="possibilities" className="launch-section bg-card py-20 sm:py-28">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <Reveal className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10"><div><p className="text-xs font-medium text-primary mb-4">WHATEVER YOUR THING IS</p><h2 className="text-4xl sm:text-5xl font-display font-semibold leading-tight">There's a place for it.</h2></div><p className="text-muted-foreground max-w-xs">A few possibilities.<br />The next one could be yours.</p></Reveal>
        <div className="grid md:grid-cols-3 gap-6">
          {[{ image: workshopPhoto, category: "MAKE & LEARN", title: "A little hands-on magic.", subtitle: "Workshops that turn strangers into collaborators." }, { image: musicPhoto, category: "PLAY & CONNECT", title: "Find your kind of crowd.", subtitle: "Music, meetups, and moments worth showing up for." }, { image: heroPhoto, category: "SHARE & GROW", title: "Ideas are better together.", subtitle: "Bring your community into the same room." }].map((item, i) => <Reveal key={item.title} delay={i * 0.12}><Link to="/auth" className="group block"><motion.div whileHover={reduced ? {} : { y: -6 }} transition={{ type: "spring", stiffness: 250, damping: 20 }} className="aspect-[4/5] relative overflow-hidden rounded-lg"><img src={item.image} width={1024} height={1024} loading="lazy" alt={item.subtitle} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" /><span className="absolute left-4 top-4 text-xs bg-card text-card-foreground px-3 py-2 rounded-full">{item.category}</span><span className="absolute bottom-4 right-4 w-11 h-11 rounded-full bg-launch-lime text-launch-lime-foreground flex items-center justify-center"><ArrowUpRight size={20} /></span></motion.div><h3 className="font-display text-2xl font-semibold mt-5">{item.title}</h3><p className="text-sm text-muted-foreground leading-relaxed mt-2">{item.subtitle}</p></Link></Reveal>)}
        </div>
      </div>
    </section>

    <section className="py-20 sm:py-28 bg-launch-rose-soft">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 grid md:grid-cols-[1fr_1.2fr] gap-12 items-center">
        <Reveal><div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex justify-center items-center mb-6"><Users /></div><p className="text-xs text-primary font-medium mb-4">BUILT AROUND YOUR PEOPLE</p><h2 className="font-display text-4xl sm:text-5xl font-semibold leading-tight">The best part?<br />Everyone showing up.</h2></Reveal>
        <Reveal delay={0.15}><p className="font-display text-2xl sm:text-3xl leading-relaxed">The workshop that sparks a new idea. The meetup that becomes a friendship. The room that feels like your people.</p><p className="text-muted-foreground mt-6 leading-relaxed max-w-lg">You bring the reason to gather. We help you bring everyone together — from the first registration to the last check-in.</p><Button asChild variant="link" className="text-foreground p-0 mt-5"><Link to="/auth">Start with your idea <ArrowRight /></Link></Button></Reveal>
      </div>
    </section>

    <section id="questions" className="launch-section py-20 sm:py-28">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 grid md:grid-cols-2 gap-10 md:gap-20"><Reveal><p className="text-xs text-primary font-medium mb-4">A FEW GOOD QUESTIONS</p><h2 className="font-display font-semibold text-4xl sm:text-5xl">Glad you asked.</h2><p className="text-muted-foreground mt-5 max-w-xs leading-relaxed">A little clarity before your next big idea becomes a real thing.</p></Reveal><Reveal><Accordion type="single" collapsible>{faqs.map((faq, i) => <AccordionItem className="border-0" key={faq.q} value={`faq-${i}`}><AccordionTrigger className="text-left text-base hover:no-underline py-5 font-medium">{faq.q}</AccordionTrigger><AccordionContent className="text-muted-foreground leading-relaxed pb-5">{faq.a}</AccordionContent></AccordionItem>)}</Accordion></Reveal></div>
    </section>

    <section className="bg-foreground text-background py-20 sm:py-24 relative overflow-hidden">
      <div className="max-w-7xl px-5 sm:px-8 mx-auto relative"><Reveal className="flex flex-col md:flex-row md:items-center justify-between gap-10"><div><p className="text-xs text-background/60 mb-5">YOUR PEOPLE ARE OUT THERE.</p><h2 className="font-display text-4xl sm:text-6xl font-semibold leading-[1.1]">Give them a reason<br />to come together<span className="text-launch-lime">.</span></h2></div><div><motion.div whileHover={reduced ? {} : { scale: 1.04 }} whileTap={{ scale: 0.97 }}><Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 h-14 text-base"><Link to="/auth">Let's launch your event <ArrowUpRight /></Link></Button></motion.div><p className="text-background/60 text-xs mt-4">Your idea. Your community. Your EVENTLAUNCH.</p></div></Reveal></div>
    </section>
    <footer className="py-8"><div className="max-w-7xl mx-auto px-5 sm:px-8 flex flex-col sm:flex-row gap-6 sm:items-center justify-between"><Link to="/" aria-label="EVENTLAUNCH home"><Logo size="sm" /></Link><p className="text-xs text-muted-foreground">Made for bringing people together.</p><a href="#" className="text-xs text-muted-foreground flex gap-2 items-center">Back to top <ArrowUpRight size={14} /></a></div></footer>
  </div></MotionConfig>;
}
