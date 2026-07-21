// Pure helpers for progressive-overload recommendations.
// Kept side-effect free so they can be unit-tested and reused.

export type WeightUnit = "kg" | "lb" | "lbs";

export type LoggedSet = {
  reps: string;
  weight: string;
  rpe?: string;
  done?: boolean;
};

export type OverloadRec = {
  exercise: string;
  topWeight: number;
  topReps: number;
  rpe: number | null;
  nextWeight: number;
  deltaPct: number;
  verdict: string;
};

export type SessionTotals = {
  totalSets: number;
  totalReps: number;
  totalVolume: number;
};

export function roundToStep(weight: number, unit: WeightUnit): number {
  const step = unit === "kg" ? 2.5 : 5;
  return Math.round(weight / step) * step;
}

/**
 * Given the completed sets for a single exercise, decide the next-session
 * weight based on the heaviest completed set and its RPE.
 * Returns null when no valid completed set exists.
 */
export function recommendForExercise(
  exercise: string,
  sets: LoggedSet[],
  unit: WeightUnit,
): OverloadRec | null {
  const completed = sets.filter((s) => s.done && s.weight && s.reps);
  if (!completed.length) return null;
  const parsed = completed
    .map((s) => ({
      w: parseFloat(s.weight),
      r: parseInt(s.reps),
      rpe: s.rpe ? parseFloat(s.rpe) : NaN,
    }))
    .filter((s) => Number.isFinite(s.w) && Number.isFinite(s.r));
  if (!parsed.length) return null;
  const top = parsed.sort((a, b) => b.w - a.w || b.r - a.r)[0];
  const rpe = Number.isFinite(top.rpe) ? top.rpe : null;

  let deltaPct = 0;
  let verdict = "Hold steady — dial in technique";
  if (rpe == null || rpe <= 7) { deltaPct = 5; verdict = "Felt strong — push the bar"; }
  else if (rpe <= 8) { deltaPct = 2.5; verdict = "Solid effort — small jump"; }
  else if (rpe <= 8.5) { deltaPct = 1.25; verdict = "Right at the edge — micro-load"; }
  else if (rpe <= 9.5) { deltaPct = 0; verdict = "Hold weight — chase a clean rep PR"; }
  else { deltaPct = -5; verdict = "Back off 5% — recover and rebuild"; }

  const nextWeight = Math.max(roundToStep(top.w * (1 + deltaPct / 100), unit), 0);
  return { exercise, topWeight: top.w, topReps: top.r, rpe, nextWeight, deltaPct, verdict };
}

export function computeSessionSummary(
  exercises: { name: string }[],
  logsByExercise: Record<string, LoggedSet[]>,
  unit: WeightUnit,
): { recs: OverloadRec[]; totals: SessionTotals } {
  const recs: OverloadRec[] = [];
  let totalSets = 0, totalReps = 0, totalVolume = 0;
  for (const ex of exercises) {
    const sets = logsByExercise[ex.name] ?? [];
    const rec = recommendForExercise(ex.name, sets, unit);
    if (!rec) continue;
    for (const s of sets) {
      if (!(s.done && s.weight && s.reps)) continue;
      const w = parseFloat(s.weight); const r = parseInt(s.reps);
      if (Number.isFinite(w) && Number.isFinite(r)) {
        totalSets++; totalReps += r; totalVolume += w * r;
      }
    }
    recs.push(rec);
  }
  return { recs, totals: { totalSets, totalReps, totalVolume } };
}
