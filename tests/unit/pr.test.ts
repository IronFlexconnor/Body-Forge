import { describe, it, expect } from "vitest";
import { estimate1RM, detectPR, platesFor } from "../../src/lib/pr";

describe("estimate1RM", () => {
  it("returns the weight itself for a single", () => {
    expect(estimate1RM(100, 1)).toBe(100);
  });
  it("applies Epley for multiple reps", () => {
    expect(estimate1RM(100, 5)).toBeCloseTo(116.67, 1);
  });
  it("caps reps at 12", () => {
    expect(estimate1RM(100, 20)).toBe(estimate1RM(100, 12));
  });
  it("rejects junk input", () => {
    expect(estimate1RM(0, 5)).toBe(0);
    expect(estimate1RM(100, 0)).toBe(0);
    expect(estimate1RM(NaN, 5)).toBe(0);
  });
});

describe("detectPR", () => {
  it("flags first-ever set as baseline", () => {
    const r = detectPR(80, 5, null);
    expect(r.isPR).toBe(true);
    if (r.isPR) expect(r.isBaseline).toBe(true);
  });
  it("detects a weight PR", () => {
    const r = detectPR(105, 3, { bestWeight: 100, bestE1RM: 116.7 });
    expect(r.isPR).toBe(true);
    if (r.isPR) {
      expect(r.kind).toBe("weight");
      expect(r.isBaseline).toBe(false);
    }
  });
  it("detects a rep (e1RM) PR at the same weight", () => {
    // 100x8 e1RM ≈ 126.7 > previous best 116.7
    const r = detectPR(100, 8, { bestWeight: 100, bestE1RM: 116.7 });
    expect(r.isPR).toBe(true);
    if (r.isPR) expect(r.kind).toBe("e1rm");
  });
  it("returns no PR for a routine set", () => {
    expect(detectPR(80, 5, { bestWeight: 100, bestE1RM: 120 }).isPR).toBe(false);
  });
  it("ignores invalid sets", () => {
    expect(detectPR(0, 5, { bestWeight: 100, bestE1RM: 120 }).isPR).toBe(false);
    expect(detectPR(100, 0, { bestWeight: 100, bestE1RM: 120 }).isPR).toBe(false);
  });
});

describe("platesFor", () => {
  it("loads a 100kg bar correctly", () => {
    const r = platesFor(100, "kg");
    expect(r).not.toBeNull();
    expect(r!.barWeight).toBe(20);
    expect(r!.perSide).toEqual([
      { plate: 25, count: 1 },
      { plate: 15, count: 1 },
    ]);
    expect(r!.achievedTotal).toBe(100);
    expect(r!.remainder).toBe(0);
  });
  it("loads 225 lb with 45s", () => {
    const r = platesFor(225, "lbs");
    expect(r!.perSide).toEqual([{ plate: 45, count: 2 }]);
    expect(r!.achievedTotal).toBe(225);
  });
  it("reports a remainder when the target is unreachable", () => {
    const r = platesFor(101, "kg");
    expect(r!.achievedTotal).toBe(100);
    expect(r!.remainder).toBeCloseTo(1);
  });
  it("returns null when target is below the bar", () => {
    expect(platesFor(15, "kg")).toBeNull();
  });
  it("supports a custom bar weight", () => {
    const r = platesFor(60, "kg", 15);
    expect(r!.barWeight).toBe(15);
    expect(r!.achievedTotal).toBe(60);
  });
});
