# Body Forge — Build Queue

The nightly agent works the TOP unchecked item (or a shippable slice of it),
checks it off in its PR, and stops. Reorder lines to reprioritize — top = next.
Anything the founder types here in plain English is a valid item.

## Signals from the founder

(Paste real observations here — numbers from /admin/business, user
complaints, drop-offs. The agent treats these as top priority.)

## Queue

- [x] Fix the 16 pre-existing TypeScript errors: `/auth` navigate calls are
      missing the required search param (~10 route files). Zero behavior
      change — get `npx tsc --noEmit` to zero errors so it can become a gate.
      (Done 2026-07-23: added `search: { next: undefined }` to every
      `navigate`/`Link` targeting `/auth` across 10 route files; `tsc
      --noEmit` now reports 0 errors. No behavior change — URL is unchanged.)
- [ ] Per-lift progress: e1RM trend chart on the Progress screen. Use
      `set_logs` history (normalize units with `convertRowWeight` from
      `src/lib/units.ts`), compute e1RM via `estimate1RM` in `src/lib/pr.ts`,
      chart with recharts. One lift selectable at a time, mobile-friendly.
- [ ] Monthly progress report: pure-math summary (training days, volume,
      e1RM changes, weight trend, streak) rendered as a shareable card,
      following the pattern in `src/lib/share-card.ts`.
- [ ] Empty/loading/error state pass: audit every route for missing empty
      states and jarring loading flashes; fix the worst five.
- [ ] Richer coach memory: extend what gets written to `coach_memories`
      after workouts and chats (consistency patterns, favorite lifts,
      struggle points) so the coach references real history. No new
      per-message AI calls.
- [ ] Macro-split adaptation: adaptive-macros currently tunes calories only;
      extend the pure math to shift protein/carb/fat splits based on goal
      and training volume. Unit-test the math.
- [ ] Landing page hero: improve layout/copy for conversion using existing
      brand assets. No fake claims, no invented testimonials.
- [ ] Accessibility pass: labels, contrast, focus states, touch target
      sizes across the five main tabs.

## Blocked / founder-decision needed (do not attempt)

- Capacitor iOS wrapper — too large for nightly; handled in live sessions.
- Barcode food scanning — needs a food-database API decision (cost) first.
- Real photography for landing — needs founder-supplied photos.
- Stripe live keys, domain, legal placeholders — business-side tasks.

## Done

- [x] (seeded 2026-07-23 — completed rounds 1-20 predate this queue)
