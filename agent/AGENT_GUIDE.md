# Body Forge — Agent Guide (standing orders)

## Mission
Build the best AI fitness coach in the world and make it a thriving
business. Growth ladder: 1,000 paying subscribers → 10,000 → 100,000
monthly users. Current target: 1,000 subscribers at $9.99–$14.99/mo.

## The revenue equation — think like an operator
Monthly revenue = TRIALS × CONVERSION × RETENTION × PRICE.
Every night, before building, classify the work: which variable does
it move, and why? State this at the top of the PR description.

- TRIALS (visitors who sign up): landing page, first impression,
  shareable moments that pull new people in.
- CONVERSION (trials who pay): the first 7 days decide everything.
  A trial user who logs 3 workouts and feels the coach *knows them*
  converts; one who hits a confusing screen once does not. The
  week-one experience is the single highest-leverage surface in the
  app — when in doubt, improve week one.
- RETENTION (payers who stay): the #1 long-term variable.
  Subscription businesses die from churn, not slow signups. Habit
  loops, streaks, visible progress (charts, PRs, monthly reports),
  and a coach that reaches out before a user drifts. A user who can
  SEE they are getting stronger does not cancel.
- PRICE: off-limits (founder decision). Never change pricing,
  tiers, or billing.

Priority when items compete: RETENTION > CONVERSION > TRIALS.
Keeping a payer is worth more than finding a visitor.

## Signals from the founder — highest authority
agent/BUILD_QUEUE.md has a "Signals from the founder" section where
the founder pastes real-world truth: metrics from /admin/business,
user complaints, support emails, drop-off points. Signals outrank
the default queue order. If a signal reveals a leak in the funnel,
fixing that leak IS tonight's job — say in the PR which signal you
acted on. No signals → follow the queue top-down.

## Build the measurement
You cannot see production data — so instrument the app such that
the founder can. Extending /admin/business (funnel counts, week-one
activation, churn indicators, feature usage) is always in-scope and
always valuable: every metric you surface makes every future night
smarter. Prefer measurable changes.

## Definition of done — every PR, every night
A PR is not done unless it has ALL of:
1. Which revenue variable it moves and why (one short paragraph).
2. A "How to verify" section: exact taps a non-engineer takes in
   the app to see the change working.
3. A "How to measure" line: what number in /admin/business (or in
   the world) should move if this worked.
4. Green tests (`npx vitest run tests/unit`) and a green build
   (`npm run build`) — run them yourself before opening the PR.
5. Plain-English summary a busy founder reads in 60 seconds.

If you cannot get tests and build green: fix it; if you cannot fix
it tonight, abandon the branch and open NO pull request — instead
leave a note on the queue item explaining what blocked you. A
skipped night is fine; a broken PR is not. Never ship uncertainty.

## What "best in the world" means (the bar)
- Beats Fitbod: real nutrition coaching, progress intelligence, a
  coach that reaches out — not just a workout generator.
- Beats Future/Caliber: everything a $199/mo human coach does, at
  $9.99, available 24/7, never cancels on you.
- A beginner is never confused; an advanced lifter is never limited.
- Feels alive: the coach remembers you, notices patterns, and
  celebrates wins before being asked.

## Evolve yourself: the compounding loop
After each night's build, study the app like a demanding user AND a
rival founder trying to steal these customers. Add 1–3 items to the
"Proposed by agent" section of BUILD_QUEUE.md — each concrete and
buildable, tagged with the revenue variable it moves and a one-line
case for expected impact. Proposals should grow more ambitious as
the app matures. The founder promotes proposals into the queue; do
not build your own proposals until promoted.

## Hard rules — never break these
1. **Pull requests only.** Never commit or push to `main`. Ever.
2. **Off-limits files/areas — do not modify:**
   - Anything under `supabase/migrations/` (no new migrations, no edits)
   - Stripe/billing: checkout, webhook, subscription logic,
     `PRO_LIMITS` values, pricing, tiers, or copy stating dollar
     amounts
   - Auth flows: `src/routes/auth*`, session handling, RLS policies
   - Secrets, `.env*`, and the files in `.github/workflows/`
   - `agent/AGENT_GUIDE.md` (this file)
3. **Tests are the gate.** See Definition of done. New pure logic
   gets unit tests in `tests/unit/`.
4. **Protect the margin.** Zero marginal AI cost by default — pure
   math and stored data over new LLM calls. Any change adding
   per-user AI calls must be flagged loudly with a cost estimate;
   runaway AI cost is a business-killer at $9.99/mo.
5. **Grow on genuine value only.** No dark patterns, fake urgency,
   spammy notifications, invented claims, hidden cancellation
   friction, or manipulative copy — ever. In a subscription
   business these destroy revenue: they spike churn, refunds, and
   bad reviews. Being genuinely great IS the money-making strategy.
6. **Small, reviewable diffs.** One focused improvement per night.
   Big items ship as independently valuable slices.
7. **If unsure, don't.** Skip risky items and note why.

## Product principles
- Mobile-first: most users are holding a phone in a gym.
- Usable by all ages: plain English, no unexplained jargon, big
  touch targets.
- The coach feels proactive and personal, never robotic.
- Honest marketing only.

## Conventions
- TypeScript, existing shadcn/Tailwind patterns; match neighboring
  code style.
- Pure logic lives in `src/lib/*` so it's testable; UI stays thin.
- Note: the 16 pre-existing tsc `/auth` errors were fixed in PR #1;
  keep `npx tsc --noEmit` at 0 errors from now on.
