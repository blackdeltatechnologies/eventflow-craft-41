# Project rules
- Keep the marketing homepage separate from authenticated event workflows so visual refreshes do not change registration behavior.
- Build homepage motion with Framer Motion and respect reduced-motion preferences; keep decorative animations out of the accessibility tree.
- Use local imported generated photography and semantic theme tokens for homepage artwork and surfaces so assets remain stable and themes remain coherent.
- Derive public browser/home-screen icons from the central logo asset to keep the brand consistent.
- Use the shared mobile-money helper for phone formatting and advisory original-carrier labels; portability makes prefix-based labels unsuitable for payment routing or rejection.
- Read payment reports through the authenticated SDK and existing organizer RLS with pagination; only completed TZS transactions contribute to revenue.
- Share attendee export generation across dashboard views, neutralize spreadsheet formulas, and prebuild Excel blobs before download clicks for mobile compatibility.
- Filter dashboard event lists to the authenticated owner and reuse the duplication mutation for card actions so public live events are not presented as manageable events.