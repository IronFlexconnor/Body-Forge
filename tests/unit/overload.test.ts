import { describe, it, expect } from "vitest";
import {
  computeSessionSummary,
  recommendForExercise,
  roundToStep,
} from "../../src/lib/overload";

describe("roundToStep", () => {
  it("rounds to 2.5 kg", () => {
    expect(roundToStep(101, "kg")).toBe(100);
    expect(roundToStep(103.75, "kg")).toBe(105);
  });
  it("rounds to 5 lb", () => {
    expect(roundToStep(227, "lb")).toBe(225);
    expect(roundToStep(228, "lb")).toBe(230);
  });
});

describe("recommendForExercise", () => {
  it("returns null when nothing was completed", () => {
    expect(
      recommendForExercise("Squat", [{ reps: "5", weight: "100", done: false }], "kg"),
    ).toBeNull();
  });

  it("suggests +5% at low RPE", () => {
    const rec = recommendForExercise(
      "Bench Press",
      [
        { reps: "8", weight: "100", rpe: "7", done: true },
        { reps: "6", weight: "100", rpe: "7", done: true },
      ],
      "kg",
    );
    expect(rec).not.toBeNull();
    expect(rec!.deltaPct).toBe(5);
    expect(rec!.topWeight).toBe(100);
    expect(rec!.nextWeight).toBe(105); // 105 rounded to 2.5
  });

  it("deloads 5% when RPE > 9.5", () => {
    const rec = recommendForExercise(
      "Deadlift",
      [{ reps: "3", weight: "200", rpe: "10", done: true }],
      "kg",
    );
    expect(rec!.deltaPct).toBe(-5);
    expect(rec!.nextWeight).toBe(190);
  });

  it("picks the heaviest completed set", () => {
    const rec = recommendForExercise(
      "Row",
      [
        { reps: "8", weight: "60", rpe: "7", done: true },
        { reps: "5", weight: "80", rpe: "8", done: true },
        { reps: "10", weight: "50", rpe: "6", done: true },
      ],
      "kg",
    );
    expect(rec!.topWeight).toBe(80);
    expect(rec!.deltaPct).toBe(2.5);
  });

  it("holds when RPE 9", () => {
    const rec = recommendForExercise(
      "OHP",
      [{ reps: "5", weight: "60", rpe: "9", done: true }],
      "kg",
    );
    expect(rec!.deltaPct).toBe(0);
    expect(rec!.nextWeight).toBe(60);
  });
});

describe("computeSessionSummary", () => {
  it("aggregates volume across exercises and skips empty ones", () => {
    const summary = computeSessionSummary(
      [{ name: "Squat" }, { name: "Row" }, { name: "Skipped" }],
      {
        Squat: [
          { reps: "5", weight: "100", rpe: "8", done: true },
          { reps: "5", weight: "100", rpe: "8", done: true },
        ],
        Row: [{ reps: "10", weight: "60", rpe: "7", done: true }],
        Skipped: [{ reps: "5", weight: "50", done: false }],
      },
      "kg",
    );
    expect(summary.recs.map((r) => r.exercise)).toEqual(["Squat", "Row"]);
    expect(summary.totals.totalSets).toBe(3);
    expect(summary.totals.totalReps).toBe(20);
    expect(summary.totals.totalVolume).toBe(100 * 5 + 100 * 5 + 60 * 10);
  });
});
