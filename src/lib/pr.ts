// Pure helpers for PR (personal record) detection and barbell plate math.
// Side-effect free so they can be unit-tested and reused (see tests/unit/pr.test.ts).

import type { WeightUnit } from "@/lib/units";

/**
 * Estimated one-rep max using the Epley formula.
 * Reps are capped at 12 — beyond that the estimate loses meaning.
 */
export function estimate1RM(weight: number, reps: number): number {
  if (!Number.isFinite(weight) || weight <= 0) return 0;
  if (!Number.isFinite(reps) || reps <= 0) return 0;
  const r = Math.min(reps, 12);
  if (r === 1) return weight;
  return weight * (1 + r / 30);
}

export type PRResult =
  | { isPR: false }
  | {
      isPR: true;
      kind: "weight" | "e1rm";
      /** New best estimated 1RM after this set */
      newBestE1RM: number;
      /** Previous best estimated 1RM (0 when first-ever set) */
      prevBestE1RM: number;
      /** True when this is the first logged set for the exercise (baseline, not celebrated) */
      isBaseline: boolean;
    };

/**
 * Decide whether a just-completed set is a PR against historical bests.
 * - "weight" PR: heaviest weight ever lifted on this exercise.
 * - "e1rm" PR: higher estimated 1RM (e.g. same weight for more reps).
 * A first-ever set is a baseline, flagged so the UI can skip the confetti.
 */
export function detectPR(
  weight: number,
  reps: number,
  history: { bestWeight: number; bestE1RM: number } | null | undefined,
): PRResult {
  if (!Number.isFinite(weight) || weight <= 0 || !Number.isFinite(reps) || reps <= 0) {
    return { isPR: false };
  }
  const e1rm = estimate1RM(weight, reps);
  if (!history || (history.bestWeight <= 0 && history.bestE1RM <= 0)) {
    return { isPR: true, kind: "weight", newBestE1RM: e1rm, prevBestE1RM: 0, isBaseline: true };
  }
  if (weight > history.bestWeight) {
    return {
      isPR: true,
      kind: "weight",
      newBestE1RM: Math.max(e1rm, history.bestE1RM),
      prevBestE1RM: history.bestE1RM,
      isBaseline: false,
    };
  }
  if (e1rm > history.bestE1RM) {
    return {
      isPR: true,
      kind: "e1rm",
      newBestE1RM: e1rm,
      prevBestE1RM: history.bestE1RM,
      isBaseline: false,
    };
  }
  return { isPR: false };
}

/** Standard plate denominations per side, heaviest first. */
const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];
const PLATES_LB = [45, 35, 25, 10, 5, 2.5];

export const DEFAULT_BAR_KG = 20;
export const DEFAULT_BAR_LB = 45;

export type PlateBreakdown = {
  /** plates per side, e.g. [{plate: 20, count: 2}, {plate: 2.5, count: 1}] */
  perSide: { plate: number; count: number }[];
  /** the achievable total with standard plates (may differ from target) */
  achievedTotal: number;
  /** target minus achieved (0 when exact) */
  remainder: number;
  barWeight: number;
};

/**
 * Compute the plates to load per side for a target total barbell weight.
 * Greedy from heaviest plate down; remainder reported when the target
 * isn't reachable with standard denominations.
 */
export function platesFor(
  targetTotal: number,
  unit: WeightUnit,
  barWeight?: number,
): PlateBreakdown | null {
  const bar = barWeight ?? (unit === "kg" ? DEFAULT_BAR_KG : DEFAULT_BAR_LB);
  if (!Number.isFinite(targetTotal) || targetTotal < bar) return null;
  const denoms = unit === "kg" ? PLATES_KG : PLATES_LB;
  let perSideRemaining = (targetTotal - bar) / 2;
  const perSide: { plate: number; count: number }[] = [];
  for (const p of denoms) {
    const count = Math.floor((perSideRemaining + 1e-9) / p);
    if (count > 0) {
      perSide.push({ plate: p, count });
      perSideRemaining -= count * p;
    }
  }
  const achievedPerSide = perSide.reduce((a, x) => a + x.plate * x.count, 0);
  const achievedTotal = bar + achievedPerSide * 2;
  return {
    perSide,
    achievedTotal,
    remainder: Math.round((targetTotal - achievedTotal) * 100) / 100,
    barWeight: bar,
  };
}
