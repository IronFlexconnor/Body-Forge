// Unit conversion helpers. Internally we ALWAYS store metric (kg, cm)
// in the database so existing edge functions and calculations keep working.
// The user's preferred display unit is stored in profiles.units.

export type Units = "imperial" | "metric";
export type WeightUnit = "lbs" | "kg";

export const DEFAULT_UNITS: Units = "imperial";
export const DEFAULT_WEIGHT_UNIT: WeightUnit = "lbs";

export const unitsToWeightUnit = (u: Units): WeightUnit => (u === "imperial" ? "lbs" : "kg");
export const weightUnitToUnits = (w: WeightUnit): Units => (w === "lbs" ? "imperial" : "metric");

export const KG_PER_LB = 0.45359237;
export const CM_PER_IN = 2.54;

export const lbToKg = (lb: number) => lb * KG_PER_LB;
export const kgToLb = (kg: number) => kg / KG_PER_LB;
export const inToCm = (inch: number) => inch * CM_PER_IN;
export const cmToIn = (cm: number) => cm / CM_PER_IN;

export const weightLabel = (u: Units) => (u === "imperial" ? "lbs" : "kg");
export const heightLabel = (u: Units) => (u === "imperial" ? "in" : "cm");

/** Convert metric DB value -> display string in chosen units */
export function fromMetricWeight(kg: number | null | undefined, u: Units): string {
  if (kg == null || isNaN(Number(kg))) return "";
  const v = u === "imperial" ? kgToLb(Number(kg)) : Number(kg);
  return String(Math.round(v * 10) / 10);
}
export function fromMetricHeight(cm: number | null | undefined, u: Units): string {
  if (cm == null || isNaN(Number(cm))) return "";
  const v = u === "imperial" ? cmToIn(Number(cm)) : Number(cm);
  return String(Math.round(v * 10) / 10);
}

/** Convert user-entered display string -> metric number for DB */
export function toMetricWeight(input: string, u: Units): number | null {
  if (!input) return null;
  const n = parseFloat(input);
  if (isNaN(n)) return null;
  return u === "imperial" ? lbToKg(n) : n;
}
export function toMetricHeight(input: string, u: Units): number | null {
  if (!input) return null;
  const n = parseFloat(input);
  if (isNaN(n)) return null;
  return u === "imperial" ? inToCm(n) : n;
}

/**
 * Normalize a set_logs row weight into a target unit.
 * Rows are stored in whatever unit the user was logging with at the time
 * (weight_unit column: "kg" | "lb" | "lbs"; legacy rows may be null).
 * A null/unknown row unit passes through unchanged — the pre-migration
 * behavior — so legacy data is never silently corrupted.
 */
export function convertRowWeight(
  weight: number | null | undefined,
  rowUnit: string | null | undefined,
  targetUnit: WeightUnit,
): number | null {
  if (weight == null || !Number.isFinite(Number(weight))) return null;
  const w = Number(weight);
  const from = rowUnit === "kg" ? "kg" : rowUnit === "lb" || rowUnit === "lbs" ? "lbs" : null;
  if (from == null || from === targetUnit) return w;
  return from === "lbs" ? lbToKg(w) : kgToLb(w);
}

/** convertRowWeight rounded for display (1 decimal). */
export function convertRowWeightRounded(
  weight: number | null | undefined,
  rowUnit: string | null | undefined,
  targetUnit: WeightUnit,
): number | null {
  const v = convertRowWeight(weight, rowUnit, targetUnit);
  return v == null ? null : Math.round(v * 10) / 10;
}

/** Display a metric DB weight in user's preferred units, e.g. "165 lbs" */
export function displayWeight(kg: number | null | undefined, u: Units): string {
  if (kg == null) return "—";
  const n = u === "imperial" ? kgToLb(Number(kg)) : Number(kg);
  return `${Math.round(n)} ${weightLabel(u)}`;
}
export function displayHeight(cm: number | null | undefined, u: Units): string {
  if (cm == null) return "—";
  const n = u === "imperial" ? cmToIn(Number(cm)) : Number(cm);
  return `${Math.round(n)} ${heightLabel(u)}`;
}
