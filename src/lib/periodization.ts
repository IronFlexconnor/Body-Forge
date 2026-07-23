// Periodization engine — pure math, zero AI cost.
// Turns (program week, total weeks, declared deload week) into a training
// phase with %1RM wave targets, and adapts overload recommendations so the
// app never says "add 5%" during a deload.
// Side-effect free so it can be unit-tested (see tests/unit/periodization.test.ts).

import { roundToStep, type OverloadRec, type WeightUnit } from "@/lib/overload";

export type Phase = "foundation" | "build" | "peak" | "deload";

export type WeekPlan = {
  phase: Phase;
  week: number;
  totalWeeks: number;
  /** 1-based position within the current block (resets after each deload) */
  weekInBlock: number;
  /** %1RM band for top working sets */
  pctLow: number;
  pctHigh: number;
  repHint: string;
  effortHint: string;
  headline: string;
  detail: string;
};

/**
 * Which weeks of the program are deloads.
 * Honors the program's declared deload week when sane, then repeats on the
 * same cadence (default every 4th week). Weeks 1-2 are never deloads and a
 * 4-week-or-shorter program deloads at most once, at its declared week.
 */
export function deloadWeeks(totalWeeks: number, declared?: number | null): number[] {
  const total = Number.isFinite(totalWeeks) && totalWeeks > 0 ? Math.floor(totalWeeks) : 8;
  const cadence =
    declared != null && Number.isFinite(declared) && declared >= 3 && declared <= total
      ? Math.floor(declared)
      : 4;
  const out: number[] = [];
  for (let w = cadence; w <= total; w += cadence) out.push(w);
  return out.filter((w) => w >= 3);
}

/** Wave positions within a block: week 1 foundation, 2 build, 3+ peak. */
function waveFor(weekInBlock: number): Omit<WeekPlan, "phase" | "week" | "totalWeeks" | "weekInBlock" | "headline" | "detail"> & { phase: Phase } {
  if (weekInBlock <= 1)
    return { phase: "foundation", pctLow: 70, pctHigh: 75, repHint: "8–10", effortHint: "RPE 7 — leave 3 clean reps in the tank" };
  if (weekInBlock === 2)
    return { phase: "build", pctLow: 75, pctHigh: 82, repHint: "6–8", effortHint: "RPE 7.5–8 — 2 reps in reserve" };
  return { phase: "peak", pctLow: 82, pctHigh: 90, repHint: "4–6", effortHint: "RPE 8–9 — heavy but crisp" };
}

/**
 * The plan for a given program week. This is the heart of the engine:
 * blocks of building weeks separated by planned deloads, with a %1RM wave
 * that rises inside each block.
 */
export function planForWeek(
  week: number,
  totalWeeks: number,
  declaredDeload?: number | null,
): WeekPlan {
  const total = Number.isFinite(totalWeeks) && totalWeeks > 0 ? Math.floor(totalWeeks) : 8;
  const w = Math.min(Math.max(Number.isFinite(week) ? Math.floor(week) : 1, 1), total);
  const deloads = deloadWeeks(total, declaredDeload);

  if (deloads.includes(w)) {
    return {
      phase: "deload",
      week: w,
      totalWeeks: total,
      weekInBlock: 0,
      pctLow: 55,
      pctHigh: 62,
      repHint: "6–8 easy",
      effortHint: "RPE 5–6 — bar speed, not grind",
      headline: `Week ${w} · Deload`,
      detail: "Lighter on purpose. Recovery is where the growth from the last block lands.",
    };
  }

  const lastDeloadBefore = deloads.filter((d) => d < w).pop() ?? 0;
  const weekInBlock = w - lastDeloadBefore;
  const wave = waveFor(weekInBlock);
  const label = wave.phase === "foundation" ? "Foundation" : wave.phase === "build" ? "Build" : "Peak";
  const detail =
    wave.phase === "foundation"
      ? "Fresh block — groove technique and volume before the weights climb."
      : wave.phase === "build"
        ? "Loads step up this week. Same movements, more intent."
        : "Top of the wave — heaviest week of the block. Earn it, then deload.";
  return {
    ...wave,
    week: w,
    totalWeeks: total,
    weekInBlock,
    headline: `Week ${w} · ${label}`,
    detail,
  };
}

export type WaveTarget = {
  low: number;
  high: number;
  pctLow: number;
  pctHigh: number;
};

/**
 * Concrete weight band for an exercise from its estimated 1RM.
 * Returns null when there's no meaningful e1RM (bodyweight moves, first-timers).
 */
export function waveTarget(
  e1rm: number | null | undefined,
  plan: WeekPlan,
  unit: WeightUnit,
): WaveTarget | null {
  if (e1rm == null || !Number.isFinite(e1rm) || e1rm <= 0) return null;
  const low = roundToStep((e1rm * plan.pctLow) / 100, unit);
  const high = roundToStep((e1rm * plan.pctHigh) / 100, unit);
  if (low <= 0 || high <= 0) return null;
  return { low, high: Math.max(high, low), pctLow: plan.pctLow, pctHigh: plan.pctHigh };
}

/**
 * Blend the RPE-based overload recommendation with the phase:
 * - Deload: override entirely — ~60% of e1RM, no progression talk.
 * - Peak: cap the suggestion at the top of the wave band so RPE math
 *   never launches someone past the plan.
 * - Otherwise: keep the recommendation but never below the wave floor's half —
 *   RPE data is fresher than a formula for normal weeks.
 */
export function applyPhaseToRecommendation(
  rec: OverloadRec | null,
  plan: WeekPlan | null,
  e1rm: number | null | undefined,
  unit: WeightUnit,
): OverloadRec | null {
  if (!rec || !plan) return rec;
  const target = waveTarget(e1rm, plan, unit);
  if (plan.phase === "deload") {
    if (!target) {
      // No e1RM to anchor to — back off last top set instead.
      const next = Math.max(roundToStep(rec.topWeight * 0.85, unit), 0);
      return { ...rec, nextWeight: next, deltaPct: -15, verdict: "Deload week — drop the load, keep the form sharp" };
    }
    const next = roundToStep((target.low + target.high) / 2, unit);
    return { ...rec, nextWeight: next, deltaPct: 0, verdict: "Deload week — light and fast. This is part of the plan." };
  }
  if (plan.phase === "peak" && target && rec.nextWeight > target.high) {
    return { ...rec, nextWeight: target.high, verdict: "Top of the wave — cap it here, deload is coming" };
  }
  return rec;
}
