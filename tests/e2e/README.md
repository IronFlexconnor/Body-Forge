# End-to-End Smoke Tests

Playwright smoke tests that cover the workout logger, calendar day drilldown,
and progressive-overload card flows, plus a visual regression pass over the
pre-auth funnel (`visual-onboarding.spec.ts`) that screenshots welcome, auth,
and every onboarding step at mobile + tablet viewports and fails if any
visible copy renders as a mid-grey — guarding the "white/bold on navy" brand
rule for the sign-up flow. Screenshots land in `tests/e2e/screenshots/`
(gitignored).

## Running

```bash
# Unit tests (pure logic — no browser required)
bunx vitest run

# Public-route Playwright smoke (dev server must be running on :8080)
bunx playwright test

# Against the preview environment
E2E_BASE_URL=https://bodybycoachforge.lovable.app bunx playwright test
```

## Authenticated flows

The `authenticated smoke (opt-in)` block is skipped unless the Lovable browser
harness has injected a Supabase session. To enable it locally, export the
following before running Playwright:

- `LOVABLE_BROWSER_AUTH_STATUS=injected`
- `LOVABLE_BROWSER_SUPABASE_STORAGE_KEY`
- `LOVABLE_BROWSER_SUPABASE_SESSION_JSON`
- `LOVABLE_BROWSER_SUPABASE_COOKIES_JSON` (optional, for SSR cookie clients)

Never commit these values — they are per-user secrets.
