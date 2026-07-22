import { describe, it, expect } from "vitest";
import {
  weeklyTrend,
  targetTrendFor,
  computeAdjustment,
} from "../../supabase/functions/_shared/adaptive-math";

const day = (n: number) => new Date(Date.UTC(2026, 6, 1 + n)).toISOString();

describe("weeklyTrend", () => {
  it("needs at least 4 entries", () => {
    expect(weeklyTrend([{ value: 80, recorded_at: day(0) }])).toBeNull();
  });
  it("needs at least 10 days of spread", () => {
    const entries = [0, 2, 4, 6].map((d) => ({ value: 80, recorded_at: day(d) }));
    expect(weeklyTrend(entries)).toBeNull();
  });
  it("detects a steady 0.5 kg/week loss", () => {
    // 80kg dropping ~71g/day over 14 days
    const entries = [0, 3, 7, 10, 14].map((d) => ({ value: 80 - d * 0.0714, recorded_at: day(d) }));
    expect(weeklyTrend(entries)!).toBeCloseTo(-0.5, 1);
  });
  it("returns ~0 for stable weight", () => {
    const entries = [0, 4, 8, 12].map((d, i) => ({
      value: 80 + (i % 2 ? 0.1 : -0.1),
      recorded_at: day(d),
    }));
    expect(Math.abs(weeklyTrend(entries)!)).toBeLessThan(0.15);
  });
});

describe("targetTrendFor", () => {
  it("maps fat-loss goals to -0.5", () => {
    expect(targetTrendFor("Lose fat")).toBe(-0.5);
    expect(targetTrendFor("weight loss")).toBe(-0.5);
    expect(targetTrendFor("Get lean")).toBe(-0.5);
  });
  it("maps building goals to +0.25", () => {
    expect(targetTrendFor("Build muscle")).toBe(0.25);
    expect(targetTrendFor("bulk")).toBe(0.25);
  });
  it("defaults to maintenance", () => {
    expect(targetTrendFor("General fitness")).toBe(0);
    expect(targetTrendFor(null)).toBe(0);
  });
});

describe("computeAdjustment", () => {
  it("returns null when on track", () => {
    // observed -0.45 vs target -0.5 → ~55 kcal gap, below threshold
    expect(computeAdjustment(2000, -0.45, -0.5)).toBeNull();
  });
  it("cuts calories when fat loss has stalled", () => {
    // observed 0 vs target -0.5 → -550 raw, clamped to -200
    const adj = computeAdjustment(2200, 0, -0.5);
    expect(adj).not.toBeNull();
    expect(adj!.delta).toBe(-200);
    expect(adj!.newCalories).toBe(2000);
  });
  it("adds calories when losing too fast", () => {
    // observed -1.0 vs target -0.5 → +550 raw, clamped to +200
    const adj = computeAdjustment(1800, -1.0, -0.5);
    expect(adj!.delta).toBe(200);
    expect(adj!.newCalories).toBe(2000);
  });
  it("never goes below the safety floor", () => {
    const adj = computeAdjustment(1250, 0.5, -0.5);
    expect(adj!.newCalories).toBeGreaterThanOrEqual(1200);
  });
  it("makes proportional small corrections inside the clamp", () => {
    // observed -0.35 vs target -0.5 → gap 0.15 kg/wk → ~165 kcal → rounds to 175
    const adj = computeAdjustment(2000, -0.35, -0.5);
    expect(adj).not.toBeNull();
    expect(Math.abs(adj!.delta)).toBeLessThanOrEqual(200);
    expect(adj!.delta).toBeLessThan(0);
  });
});
