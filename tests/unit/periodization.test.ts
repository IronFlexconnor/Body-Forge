import { describe, it, expect } from "vitest";
import {
  deloadWeeks,
  planForWeek,
  waveTarget,
  applyPhaseToRecommendation,
} from "../../src/lib/periodization";
import { convertRowWeight, convertRowWeightRounded } from "../../src/lib/units";
import type { OverloadRec } from "../../src/lib/overload";

describe("deloadWeeks", () => {
  it("defaults to every 4th week", () => {
    expect(deloadWeeks(8)).toEqual([4, 8]);
    expect(deloadWeeks(12)).toEqual([4, 8, 12]);
  });
  it("honors a sane declared deload week as the cadence", () => {
    expect(deloadWeeks(10, 5)).toEqual([5, 10]);
  });
  it("ignores junk declared values", () => {
    expect(deloadWeeks(8, 0)).toEqual([4, 8]);
    expect(deloadWeeks(8, 99)).toEqual([4, 8]);
    expect(deloadWeeks(8, null)).toEqual([4, 8]);
  });
  it("never deloads in weeks 1-2", () => {
    for (const total of [4, 6, 8, 12]) {
      expect(deloadWeeks(total).every((w) => w >= 3)).toBe(true);
    }
  });
});

describe("planForWeek", () => {
  it("waves foundation → build → peak inside a block", () => {
    expect(planForWeek(1, 8).phase).toBe("foundation");
    expect(planForWeek(2, 8).phase).toBe("build");
    expect(planForWeek(3, 8).phase).toBe("peak");
  });
  it("marks deload weeks", () => {
    expect(planForWeek(4, 8).phase).toBe("deload");
    expect(planForWeek(8, 8).phase).toBe("deload");
  });
  it("restarts the wave after a deload", () => {
    const wk5 = planForWeek(5, 8);
    expect(wk5.phase).toBe("foundation");
    expect(wk5.weekInBlock).toBe(1);
  });
  it("intensity rises through the block", () => {
    const w1 = planForWeek(1, 8);
    const w3 = planForWeek(3, 8);
    expect(w3.pctLow).toBeGreaterThan(w1.pctLow);
    expect(w3.pctHigh).toBeGreaterThan(w1.pctHigh);
  });
  it("deload is meaningfully lighter than any building week", () => {
    const deload = planForWeek(4, 8);
    expect(deload.pctHigh).toBeLessThan(planForWeek(1, 8).pctLow - 5);
  });
  it("clamps out-of-range weeks instead of crashing", () => {
    expect(planForWeek(0, 8).week).toBe(1);
    expect(planForWeek(99, 8).week).toBe(8);
    expect(planForWeek(3, NaN).totalWeeks).toBe(8);
  });
});

describe("waveTarget", () => {
  it("rounds a %1RM band to plate-loadable steps", () => {
    const t = waveTarget(200, planForWeek(2, 8), "lbs");
    expect(t).not.toBeNull();
    expect(t!.low % 5).toBe(0);
    expect(t!.high % 5).toBe(0);
    expect(t!.low).toBeLessThanOrEqual(t!.high);
    expect(t!.low).toBeCloseTo(150, 0); // 75% of 200
  });
  it("returns null without an e1RM", () => {
    expect(waveTarget(null, planForWeek(1, 8), "lbs")).toBeNull();
    expect(waveTarget(0, planForWeek(1, 8), "kg")).toBeNull();
  });
});

const baseRec: OverloadRec = {
  exercise: "Bench Press",
  topWeight: 185,
  topReps: 5,
  rpe: 7,
  nextWeight: 195,
  deltaPct: 5,
  verdict: "You had gas left — add weight",
};

describe("applyPhaseToRecommendation", () => {
  it("overrides to ~60% e1RM on deload weeks", () => {
    const out = applyPhaseToRecommendation(baseRec, planForWeek(4, 8), 215, "lbs");
    expect(out!.nextWeight).toBeLessThan(baseRec.topWeight);
    expect(out!.verdict.toLowerCase()).toContain("deload");
  });
  it("backs off last top set on deload when no e1RM exists", () => {
    const out = applyPhaseToRecommendation(baseRec, planForWeek(4, 8), null, "lbs");
    expect(out!.nextWeight).toBeLessThan(baseRec.topWeight);
  });
  it("caps peak-week jumps at the top of the wave band", () => {
    // e1RM 200 → peak high = 90% = 180; RPE rec of 195 must be capped
    const out = applyPhaseToRecommendation(baseRec, planForWeek(3, 8), 200, "lbs");
    expect(out!.nextWeight).toBeLessThanOrEqual(180);
  });
  it("leaves normal-week recommendations alone", () => {
    const out = applyPhaseToRecommendation(baseRec, planForWeek(2, 8), 260, "lbs");
    expect(out).toEqual(baseRec);
  });
  it("passes through when phase or rec is missing", () => {
    expect(applyPhaseToRecommendation(null, planForWeek(1, 8), 200, "lbs")).toBeNull();
    expect(applyPhaseToRecommendation(baseRec, null, 200, "lbs")).toEqual(baseRec);
  });
});

describe("convertRowWeight", () => {
  it("converts lbs rows for a kg viewer and back", () => {
    expect(convertRowWeight(220, "lbs", "kg")!).toBeCloseTo(99.79, 1);
    expect(convertRowWeight(100, "kg", "lbs")!).toBeCloseTo(220.46, 1);
  });
  it("accepts the legacy 'lb' spelling", () => {
    expect(convertRowWeight(220, "lb", "kg")!).toBeCloseTo(99.79, 1);
  });
  it("passes same-unit and unknown-unit rows through unchanged", () => {
    expect(convertRowWeight(150, "lbs", "lbs")).toBe(150);
    expect(convertRowWeight(150, null, "lbs")).toBe(150);
    expect(convertRowWeight(150, "banana", "kg")).toBe(150);
  });
  it("rejects junk weights", () => {
    expect(convertRowWeight(null, "kg", "lbs")).toBeNull();
    expect(convertRowWeight(NaN, "kg", "lbs")).toBeNull();
  });
  it("rounds for display", () => {
    expect(convertRowWeightRounded(220, "lbs", "kg")).toBe(99.8);
  });
});
