// Pure math for the adaptive-macros engine. No imports, no side effects —
// used by supabase/functions/adaptive-macros (Deno) and unit-tested from
// tests/unit/adaptive-math.test.ts (vitest).

export const KCAL_PER_KG = 7700;
export const MAX_STEP_KCAL = 200;
export const MIN_STEP_KCAL = 75;
export const MIN_CALORIES = 1200; // safety floor
export const MAX_CALORIES = 6000; // sanity ceiling

export type WeighIn = { value: number; recorded_at: string };

/** Least-squares slope of weight (kg) over time, returned in kg/week.
 *  Requires >= 4 entries spanning >= 10 days; otherwise null. */
export function weeklyTrend(entries: WeighIn[]): number | null {
  if (entries.length < 4) return null;
  const t0 = new Date(entries[0].recorded_at).getTime();
  const xs = entries.map((e) => (new Date(e.recorded_at).getTime() - t0) / (1000 * 60 * 60 * 24)); // days
  const ys = entries.map((e) => Number(e.value));
  const span = Math.max(...xs) - Math.min(...xs);
  if (span < 10) return null;
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  if (den === 0) return null;
  return (num / den) * 7; // kg/day -> kg/week
}

/** Goal-implied weekly weight-change target in kg/week. */
export function targetTrendFor(goal: string | null | undefined): number {
  const g = (goal ?? "").toLowerCase();
  if (/(fat|loss|lose|cut|lean|weight loss|shred)/.test(g)) return -0.5;
  if (/(muscle|bulk|gain|build|mass|strength)/.test(g)) return 0.25;
  return 0;
}

/** Bounded weekly calorie correction; null when the user is on track. */
export function computeAdjustment(
  currentCalories: number,
  observed: number,
  target: number,
): { newCalories: number; delta: number } | null {
  const gapKgPerWeek = target - observed; // positive => eat more
  const rawDelta = (gapKgPerWeek * KCAL_PER_KG) / 7;
  const clamped = Math.max(-MAX_STEP_KCAL, Math.min(MAX_STEP_KCAL, rawDelta));
  const rounded = Math.round(clamped / 25) * 25;
  if (Math.abs(rounded) < MIN_STEP_KCAL) return null;
  const newCalories = Math.max(MIN_CALORIES, Math.min(MAX_CALORIES, currentCalories + rounded));
  if (newCalories === currentCalories) return null;
  return { newCalories, delta: newCalories - currentCalories };
}
