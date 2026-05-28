# EVENTLAUNCH — Rebrand, Polish & Feature Build

Big scope, so I'll execute in four focused passes. Confirm and I'll ship.

## 1. Rebrand to EVENTLAUNCH
- Update `Logo.tsx` wordmark + sidebar to "EVENTLAUNCH"
- Update `index.html` title, meta description, og tags
- Update all on-page references in Landing, Auth, Dashboard chrome

## 2. Polish the Landing Page
- Refine hero: stronger headline, subhead, dual CTAs, social proof bar
- New "Features" grid (4–6 cards with icons)
- New "How it works" 3-step section
- New "Testimonials" section (3 cards)
- Final CTA band + cleaner footer
- All using existing design tokens; no new colors hardcoded

## 3. Email Confirmations on Registration
- Check email domain status; if none → prompt setup via `<presentation-open-email-setup>` (one-time user step)
- Run `setup_email_infra` + `scaffold_transactional_email`
- Create `event-registration-confirmation` React Email template (event name, date, location, attendee name)
- Wire `Register.tsx` to invoke `send-transactional-email` after successful registration

## 4. Check-in Flow
- New page `/dashboard/events/:id/check-in` with camera-based QR scanner (`html5-qrcode`)
- Add `checked_in_at` column to `registrations` via migration
- Scanning a QR with the registration ID marks attendee checked in; show live count + recent scans
- Link from EventDetail page

## 5. Enriched Analytics
- Replace current Analytics page widgets with charts (using existing `recharts`):
  - Registrations over time (line chart, last 30 days)
  - Conversion rate per event (bar chart: views vs registrations — uses registration counts only since page views aren't tracked; will note this)
  - Top 5 events by registrations (bar chart)
  - Check-in rate per event (after check-in shipped)
- KPI cards on top (total registrations, total events, avg fill rate, check-in rate)

## Technical notes
- DB migration: `ALTER TABLE registrations ADD COLUMN checked_in_at timestamptz`
- New dep: `html5-qrcode`
- Email needs domain setup (one-time user action) before it can actually send; scaffolding works without DNS

Reply "go" and I'll execute end-to-end. If you want a subset first (e.g. rebrand + landing only), say so.