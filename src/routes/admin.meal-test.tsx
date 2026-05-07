import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, PlayCircle, Loader2 } from "lucide-react";
import {
  buildMealPlan,
  calculateMacroTargets,
  type MacroTargets,
} from "../../supabase/functions/nutrition-coach/planner";

export const Route = createFileRoute("/admin/meal-test")({
  head: () => ({
    meta: [
      { title: "Admin · Meal Plan Test Console" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: MealTestConsole,
});

type Scenario = {
  id: string;
  label: string;
  description: string;
  profile: Record<string, any>;
  nutritionPrefs: Record<string, any>;
  program?: Record<string, any> | null;
  upcoming?: Array<Record<string, any>>;
  expect: {
    minProteinPerKg?: number;
    maxProteinPerKg?: number;
    calorieRange?: [number, number];
    forbiddenWords?: string[];
    requireKetoCarbsBelow?: number;
    bodyweightGoal?: string;
  };
};

const today = (offset = 0) => {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};

const SCENARIOS: Scenario[] = [
  {
    id: "cut-imperial-peanut",
    label: "Fat-loss · Imperial · Peanut allergy",
    description: "85kg male cutting on imperial units, peanut + tree-nut allergy, 5x/week hypertrophy.",
    profile: { gender: "male", age: 31, height: 180, weight: 187, units: "imperial", days_per_week: 5, level: "intermediate", goal: "lose fat" },
    nutritionPrefs: { allergies: ["peanut", "tree nut"], bodyweightGoal: "lose_fat", diets: [] },
    program: { name: "Hypertrophy Block", style: "hypertrophy", current_week: 3, weeks: 8 },
    upcoming: [
      { scheduled_date: today(0), focus: "Heavy push", title: "Chest + shoulders" },
      { scheduled_date: today(1), focus: "Heavy pull", title: "Back" },
      { scheduled_date: today(2), focus: "Rest", title: "Recovery" },
      { scheduled_date: today(3), focus: "Heavy legs", title: "Squat day" },
    ],
    expect: { minProteinPerKg: 1.9, maxProteinPerKg: 2.6, calorieRange: [1800, 2700], forbiddenWords: ["peanut", "almond", "cashew", "walnut"], bodyweightGoal: "lose_fat" },
  },
  {
    id: "bulk-metric-vegan",
    label: "Muscle gain · Metric · Vegan + soy-free",
    description: "72kg female building muscle, vegan, soy-free, 4x/week strength.",
    profile: { gender: "female", age: 28, height: 168, weight: 72, units: "metric", days_per_week: 4, level: "intermediate", goal: "build muscle" },
    nutritionPrefs: { allergies: ["soy"], diets: ["vegan"], bodyweightGoal: "build_muscle" },
    program: { name: "Strength Foundations", style: "strength", current_week: 2, weeks: 6 },
    upcoming: [
      { scheduled_date: today(0), focus: "Heavy squat", title: "Legs" },
      { scheduled_date: today(2), focus: "Heavy press", title: "Push" },
    ],
    expect: { minProteinPerKg: 1.7, maxProteinPerKg: 2.4, calorieRange: [2000, 3200], forbiddenWords: ["tofu", "tempeh", "edamame", "whey", "chicken", "salmon", "turkey"], bodyweightGoal: "build_muscle" },
  },
  {
    id: "recomp-keto-glutenfree",
    label: "Recomp · Keto · Gluten-free",
    description: "90kg male recomp, keto + gluten-free, 4x/week.",
    profile: { gender: "male", age: 38, height: 183, weight: 90, units: "metric", days_per_week: 4, level: "advanced", goal: "recomp" },
    nutritionPrefs: { allergies: ["gluten"], diets: ["keto"], bodyweightGoal: "recomp" },
    program: { name: "Performance Recomp", style: "recomp", current_week: 1, weeks: 8 },
    upcoming: [{ scheduled_date: today(0), focus: "Heavy deadlift", title: "Pull" }],
    expect: { minProteinPerKg: 1.7, maxProteinPerKg: 2.3, calorieRange: [2100, 3200], forbiddenWords: ["wheat", "bread", "oats"], requireKetoCarbsBelow: 60, bodyweightGoal: "recomp" },
  },
  {
    id: "maintain-dairy",
    label: "Maintain · Dairy-free · Deload week",
    description: "78kg male maintenance, dairy + lactose allergy, deload phase.",
    profile: { gender: "male", age: 42, height: 178, weight: 78, units: "metric", days_per_week: 3, level: "intermediate", goal: "maintain" },
    nutritionPrefs: { allergies: ["dairy"], diets: [], bodyweightGoal: "maintain" },
    program: { name: "Deload Week", style: "deload", current_week: 4, weeks: 4 },
    upcoming: [
      { scheduled_date: today(0), focus: "Mobility", title: "Recovery" },
      { scheduled_date: today(2), focus: "Light technique", title: "Skill" },
    ],
    expect: { minProteinPerKg: 1.5, maxProteinPerKg: 2.2, calorieRange: [1900, 2900], forbiddenWords: ["whey", "milk", "yogurt", "cheese"], bodyweightGoal: "maintain" },
  },
  {
    id: "cut-shellfish-egg",
    label: "Cut · Shellfish + egg allergy",
    description: "65kg female cutting, shellfish + egg allergy, 5x/week.",
    profile: { gender: "female", age: 26, height: 165, weight: 65, units: "metric", days_per_week: 5, level: "beginner", goal: "lose fat" },
    nutritionPrefs: { allergies: ["shellfish", "egg"], diets: [], bodyweightGoal: "lose_fat" },
    program: { name: "Lean Build", style: "hypertrophy", current_week: 2, weeks: 8 },
    upcoming: [{ scheduled_date: today(0), focus: "Heavy push", title: "Push" }],
    expect: { minProteinPerKg: 1.9, maxProteinPerKg: 2.6, calorieRange: [1400, 2300], forbiddenWords: ["shrimp", "prawn", "crab", "lobster", "egg"], bodyweightGoal: "lose_fat" },
  },
];

type Check = { name: string; pass: boolean; detail: string };
type Result = {
  id: string;
  scenario: Scenario;
  targets: MacroTargets;
  plan: any;
  checks: Check[];
  pass: boolean;
  ms: number;
};

function runScenario(s: Scenario): Result {
  const start = performance.now();
  const targets = calculateMacroTargets(s.profile, s.nutritionPrefs, s.program, s.upcoming ?? []);
  const plan = buildMealPlan({
    profile: { ...s.profile, macro_targets: targets },
    nutritionPrefs: s.nutritionPrefs,
    program: s.program ?? null,
    upcoming: s.upcoming ?? [],
  }, targets);
  const ms = Math.round(performance.now() - start);

  const weightKg = s.profile.units === "imperial" && s.profile.weight > 220
    ? s.profile.weight * 0.45359237
    : s.profile.weight;

  const checks: Check[] = [];
  const proteinPerKg = targets.protein_g / weightKg;
  if (s.expect.minProteinPerKg) {
    checks.push({
      name: `Protein ≥ ${s.expect.minProteinPerKg} g/kg`,
      pass: proteinPerKg >= s.expect.minProteinPerKg,
      detail: `${proteinPerKg.toFixed(2)} g/kg (target ${targets.protein_g} g)`,
    });
  }
  if (s.expect.maxProteinPerKg) {
    checks.push({
      name: `Protein ≤ ${s.expect.maxProteinPerKg} g/kg`,
      pass: proteinPerKg <= s.expect.maxProteinPerKg,
      detail: `${proteinPerKg.toFixed(2)} g/kg`,
    });
  }
  if (s.expect.calorieRange) {
    const [lo, hi] = s.expect.calorieRange;
    checks.push({
      name: `Calories in [${lo}, ${hi}]`,
      pass: targets.calories >= lo && targets.calories <= hi,
      detail: `${targets.calories} kcal`,
    });
  }
  if (s.expect.requireKetoCarbsBelow != null) {
    checks.push({
      name: `Keto carbs < ${s.expect.requireKetoCarbsBelow} g`,
      pass: targets.carbs_g < s.expect.requireKetoCarbsBelow,
      detail: `${targets.carbs_g} g`,
    });
  }
  // 7 days
  checks.push({ name: "Plan returns 7 days", pass: plan.days?.length === 7, detail: `${plan.days?.length ?? 0} days` });

  // Each day has 4 meals with prep videos
  const allMeals: any[] = (plan.days ?? []).flatMap((d: any) => d.meals ?? []);
  const slotsOk = (plan.days ?? []).every((d: any) => (d.meals ?? []).length === 4);
  checks.push({ name: "Each day has 4 meal slots", pass: slotsOk, detail: `${allMeals.length} total meals` });

  const videosOk = allMeals.every((m) => !!m.prep_video?.url);
  checks.push({ name: "Every meal has a prep video", pass: videosOk, detail: videosOk ? "All linked" : "Missing video(s)" });

  // Allergens
  if (s.expect.forbiddenWords?.length) {
    const hits: string[] = [];
    for (const m of allMeals) {
      const text = `${m.title} ${(m.ingredients_with_units ?? []).join(" ")}`.toLowerCase();
      for (const w of s.expect.forbiddenWords) {
        if (text.includes(w.toLowerCase())) hits.push(`${m.title}: "${w}"`);
      }
    }
    checks.push({
      name: `Excludes: ${s.expect.forbiddenWords.join(", ")}`,
      pass: hits.length === 0,
      detail: hits.length ? hits.slice(0, 3).join(" · ") : "Clean",
    });
  }

  // Macro tolerance per day (within 5% calories)
  const dayTolOk = (plan.days ?? []).every((d: any) => {
    const t = d.daily_totals ?? {};
    const target = d.calorie_target ?? t.calories ?? 0;
    if (!target) return false;
    return Math.abs(t.calories - target) / target <= 0.05;
  });
  checks.push({ name: "Daily totals within 5% of target", pass: dayTolOk, detail: dayTolOk ? "OK" : "Out of tolerance" });

  // Periodization: heavy day calories > rest day calories (when both exist & not keto override)
  const days = plan.days ?? [];
  const heavyDays = days.filter((d: any) => /\(heavy\)/.test(d.training_focus));
  const restDays = days.filter((d: any) => /\(rest\)/.test(d.training_focus));
  if (heavyDays.length && restDays.length) {
    const heavyAvg = heavyDays.reduce((a: number, d: any) => a + d.calorie_target, 0) / heavyDays.length;
    const restAvg = restDays.reduce((a: number, d: any) => a + d.calorie_target, 0) / restDays.length;
    checks.push({
      name: "Heavy-day calories > rest-day calories",
      pass: heavyAvg > restAvg,
      detail: `heavy ${Math.round(heavyAvg)} vs rest ${Math.round(restAvg)} kcal`,
    });
  }

  // Validation passed
  checks.push({
    name: "Internal validator passed",
    pass: !!plan.validation?.passed,
    detail: plan.validation?.passed ? "OK" : (plan.validation?.issues ?? []).slice(0, 2).join(" · "),
  });

  const pass = checks.every((c) => c.pass);
  return { id: s.id, scenario: s, targets, plan, checks, pass, ms };
}

function MealTestConsole() {
  const [results, setResults] = useState<Result[]>([]);
  const [running, setRunning] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const summary = useMemo(() => {
    const total = results.length;
    const passed = results.filter((r) => r.pass).length;
    return { total, passed, failed: total - passed };
  }, [results]);

  const runAll = async () => {
    setRunning(true);
    setResults([]);
    const out: Result[] = [];
    for (const s of SCENARIOS) {
      // Yield to UI between scenarios
      await new Promise((r) => setTimeout(r, 10));
      try {
        out.push(runScenario(s));
      } catch (e: any) {
        out.push({
          id: s.id,
          scenario: s,
          targets: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
          plan: null,
          checks: [{ name: "Run scenario", pass: false, detail: String(e?.message ?? e) }],
          pass: false,
          ms: 0,
        });
      }
      setResults([...out]);
    }
    setRunning(false);
  };

  const runOne = (id: string) => {
    const s = SCENARIOS.find((x) => x.id === id);
    if (!s) return;
    const r = runScenario(s);
    setResults((prev) => {
      const others = prev.filter((x) => x.id !== id);
      return [...others, r].sort((a, b) => SCENARIOS.findIndex((s) => s.id === a.id) - SCENARIOS.findIndex((s) => s.id === b.id));
    });
  };

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Meal Plan Test Console</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Runs the deterministic planner against representative profiles and records pass/fail across macros, allergens, periodization, and videos.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {results.length > 0 && (
              <div className="text-sm">
                <Badge variant={summary.failed === 0 ? "default" : "destructive"}>
                  {summary.passed}/{summary.total} passed
                </Badge>
              </div>
            )}
            <Button onClick={runAll} disabled={running} className="gap-2">
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
              Run all scenarios
            </Button>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {SCENARIOS.map((s) => {
            const r = results.find((x) => x.id === s.id);
            const open = openId === s.id;
            return (
              <Card key={s.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {r ? (
                        r.pass ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-destructive" />
                      ) : (
                        <span className="h-5 w-5 rounded-full border border-muted" />
                      )}
                      <h2 className="text-base font-semibold">{s.label}</h2>
                      {r && <span className="text-xs text-muted-foreground">{r.ms} ms</span>}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                    {r && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Targets: {r.targets.calories} kcal · P {r.targets.protein_g} / C {r.targets.carbs_g} / F {r.targets.fat_g}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button variant="outline" size="sm" onClick={() => runOne(s.id)}>Run</Button>
                    <Button variant="ghost" size="sm" onClick={() => setOpenId(open ? null : s.id)}>
                      {open ? "Hide" : "Details"}
                    </Button>
                  </div>
                </div>

                {open && r && (
                  <div className="mt-4 space-y-3">
                    <div className="rounded-md border bg-muted/30 p-3">
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Checks</h3>
                      <ul className="space-y-1.5 text-sm">
                        {r.checks.map((c, i) => (
                          <li key={i} className="flex items-start gap-2">
                            {c.pass ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />}
                            <div className="min-w-0">
                              <span className="font-medium">{c.name}</span>
                              <span className="ml-2 text-muted-foreground">{c.detail}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {r.plan?.days && (
                      <div className="rounded-md border p-3">
                        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">7-Day Summary</h3>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                          {r.plan.days.map((d: any) => (
                            <div key={d.date} className="rounded bg-muted/40 p-2 text-xs">
                              <div className="font-semibold">{d.day}</div>
                              <div className="text-muted-foreground">{d.training_focus}</div>
                              <div className="mt-1">{d.calorie_target} kcal</div>
                              <div className="text-muted-foreground">P{d.daily_totals?.protein_g} C{d.daily_totals?.carbs_g} F{d.daily_totals?.fat_g}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
