# Landing page refresh

All changes live in `src/pages/Landing.tsx` (plus a handful of new SVG/text assets inline). No backend or routing changes.

## 1. Hero refresh
- Tighter headline + new subhead focused on "Launch your event page in under 5 minutes — free forever."
- Replace current trust pill with: animated pill ("New • Built-in check-in & analytics").
- Dual CTAs: primary "Create your free event" → `/auth`, secondary "See a live example" → demo event slug.
- Replace existing avatars-row social proof with a compact rating + "1,200+ events launched this month" line.
- Subtle decorative gradient blob behind hero (uses existing rose-red token, no hardcoded colors).

## 2. Stats band (new, right under hero)
Four big numbers in a borderless row:
- 12,000+ events launched
- 480,000+ attendees registered
- 38 countries
- 99.9% uptime

Animated count-up on scroll-in (framer-motion).

## 3. Logo cloud (new, below stats)
- Small heading: "Used by teams at"
- Row of 6 grayscale wordmark SVGs (inline, generic names: Northwind, Acme Labs, Lumen, Pixelforge, Kestrel, Verge) so we don't fake real brand logos.
- Subtle marquee scroll on mobile, static row on desktop.

## 4. Whole-page polish
- Consistent section padding (`py-24 md:py-32`) and max-width.
- Tighter typography rhythm (display sizes harmonized).
- Smooth scroll-reveal on each section (framer-motion `whileInView`).
- Cleaner section dividers (no harsh borders — use subtle bg shifts instead, per memory: borderless clean UI).

## 5. Replace testimonials (6 new)
Swap current 3 quotes for 6 in a 3-col bento grid (2 rows × 3). New voices:

1. **Amelia Chen** — Head of Community, Northwind — "Cut our event setup from a full day to about 20 minutes. The check-in QR alone saved our sanity at the door."
2. **Marcus Okafor** — Founder, BuildClub — "Our registration conversion jumped 34% after we switched. The pages just feel faster and friendlier."
3. **Priya Raman** — Events Lead, Lumen Studio — "Finally analytics that don't need a spreadsheet export. I can see drop-off and top sources at a glance."
4. **Diego Alvarez** — Organizer, LATAM Devs — "We run 4 meetups a month. Duplicating an event and tweaking the form takes literally one click."
5. **Sofia Bergman** — Marketing, Kestrel — "Beautiful out of the box. Our brand looks premium without us touching a single design file."
6. **Jordan Ng** — Community Manager, Pixelforge — "The free tier is genuinely free — no paywalls in the middle of an event. Rare and refreshing."

Reuse existing avatar images where they map; add 3 new generated avatars only if needed (will use initials-in-circle fallback to avoid extra asset generation unless you want real photos).

## 6. FAQ section (new, before final CTA)
Accordion (shadcn `Accordion`) with 6 entries:
- Is eventlaunch really free?
- Can I use my own branding and domain?
- How does check-in work at the door?
- What integrations do you support?
- Can attendees pay through eventlaunch?
- How do I export my attendee list?

## Out of scope
- No email/domain setup work in this pass (separate thread).
- No new routes, DB tables, or edge functions.
- No changes to auth, registration flow, or dashboard.

Reply "go" to build it, or tell me what to tweak (e.g. different quotes, real company names you want as logos, swap stats numbers).
