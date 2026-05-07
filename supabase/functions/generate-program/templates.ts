// Curated, goal-specific program templates with UNIQUE exercise selections per goal.
// Used as a deterministic fallback when the AI gateway is unavailable, and as a
// strong prior so each goal always swaps in distinct, on-target exercises.

type Ex = { name: string; sets: number; reps: string; rest_sec?: number; rpe?: number; notes?: string };
type Session = { week: number; day: number; title: string; focus: string; duration_min: number; exercises: Ex[] };
type Template = { name: string; style: string; summary: string; weekly_split: string[]; days: { title: string; focus: string; exercises: Ex[] }[] };

const T: Record<string, Template> = {
  "glute-growth": {
    name: "Glute Forge — Shape & Strength",
    style: "Hypertrophy (Glute Specialization)",
    summary: "Glute-focused 4-day split with a dedicated Glute Day, hip-thrust progression, and shape work.",
    weekly_split: ["Mon: Glute Day", "Tue: Upper Body", "Thu: Lower (Quad/Ham)", "Sat: Glute Volume"],
    days: [
      { title: "Glute Day", focus: "Glute activation + heavy hip thrust", exercises: [
        { name: "Banded Glute Bridge (activation)", sets: 2, reps: "20", rest_sec: 45, notes: "Squeeze 2s at top" },
        { name: "Barbell Hip Thrust", sets: 4, reps: "8-10", rest_sec: 120, rpe: 8 },
        { name: "Bulgarian Split Squat (glute-bias forward lean)", sets: 3, reps: "10/leg", rest_sec: 90 },
        { name: "Cable Kickback", sets: 3, reps: "12/leg", rest_sec: 60 },
        { name: "Seated Hip Abduction Machine", sets: 4, reps: "15", rest_sec: 45, notes: "Lean forward for upper glute" },
      ]},
      { title: "Upper Body", focus: "Push/pull balance", exercises: [
        { name: "DB Bench Press", sets: 3, reps: "8-10", rest_sec: 90 },
        { name: "Chest-Supported Row", sets: 3, reps: "10-12", rest_sec: 75 },
        { name: "DB Shoulder Press", sets: 3, reps: "10", rest_sec: 75 },
        { name: "Face Pull", sets: 3, reps: "15", rest_sec: 45 },
      ]},
      { title: "Lower (Quad/Ham)", focus: "Posterior chain", exercises: [
        { name: "Romanian Deadlift", sets: 4, reps: "8", rest_sec: 120, rpe: 8 },
        { name: "Walking Lunge", sets: 3, reps: "12/leg", rest_sec: 75 },
        { name: "Hamstring Curl", sets: 3, reps: "12", rest_sec: 60 },
        { name: "Standing Calf Raise", sets: 4, reps: "15", rest_sec: 45 },
      ]},
      { title: "Glute Volume", focus: "Pump & shape", exercises: [
        { name: "Single-Leg Hip Thrust", sets: 3, reps: "12/leg", rest_sec: 75 },
        { name: "Cable Glute Pull-Through", sets: 4, reps: "12", rest_sec: 60 },
        { name: "Step-Up (knee-high box)", sets: 3, reps: "10/leg", rest_sec: 60 },
        { name: "Banded Lateral Walk", sets: 3, reps: "20 steps", rest_sec: 45 },
        { name: "Frog Pump", sets: 3, reps: "25", rest_sec: 45 },
      ]},
    ],
  },
  "muscle-fat": {
    name: "Recomp Engine",
    style: "Hypertrophy + Metabolic",
    summary: "4-day upper/lower with metabolic finishers to build muscle while losing fat.",
    weekly_split: ["Mon: Upper A", "Tue: Lower A", "Thu: Upper B", "Fri: Lower B + Finisher"],
    days: [
      { title: "Upper A", focus: "Push emphasis", exercises: [
        { name: "Incline DB Press", sets: 4, reps: "8-10", rest_sec: 90 },
        { name: "Pull-Up (or Lat Pulldown)", sets: 4, reps: "8", rest_sec: 90 },
        { name: "Seated DB Shoulder Press", sets: 3, reps: "10", rest_sec: 75 },
        { name: "Cable Tricep Pushdown", sets: 3, reps: "12", rest_sec: 45 },
        { name: "EZ-Bar Curl", sets: 3, reps: "10", rest_sec: 45 },
      ]},
      { title: "Lower A", focus: "Quad-dominant", exercises: [
        { name: "Back Squat", sets: 4, reps: "6-8", rest_sec: 150, rpe: 8 },
        { name: "Leg Press", sets: 3, reps: "12", rest_sec: 90 },
        { name: "Leg Extension", sets: 3, reps: "15", rest_sec: 45 },
        { name: "Plank", sets: 3, reps: "45s", rest_sec: 30 },
      ]},
      { title: "Upper B", focus: "Pull emphasis", exercises: [
        { name: "Barbell Row", sets: 4, reps: "8", rest_sec: 90 },
        { name: "Flat Bench Press", sets: 4, reps: "6-8", rest_sec: 120 },
        { name: "Lateral Raise", sets: 4, reps: "12", rest_sec: 45 },
        { name: "Hammer Curl", sets: 3, reps: "10", rest_sec: 45 },
        { name: "Overhead Tricep Extension", sets: 3, reps: "12", rest_sec: 45 },
      ]},
      { title: "Lower B + Finisher", focus: "Hamstring + conditioning", exercises: [
        { name: "Romanian Deadlift", sets: 4, reps: "8", rest_sec: 120 },
        { name: "Walking Lunge", sets: 3, reps: "12/leg", rest_sec: 75 },
        { name: "Seated Hamstring Curl", sets: 3, reps: "12", rest_sec: 45 },
        { name: "Kettlebell Swing (finisher)", sets: 5, reps: "20", rest_sec: 45 },
        { name: "Sled Push", sets: 4, reps: "20m", rest_sec: 60 },
      ]},
    ],
  },
  "strength": {
    name: "Forge Strength 5x5",
    style: "Strength & Power",
    summary: "Heavy compound lifts with low reps and steady progressive overload.",
    weekly_split: ["Mon: Squat", "Wed: Bench", "Fri: Deadlift", "Sat: Press"],
    days: [
      { title: "Squat Day", focus: "Lower body strength", exercises: [
        { name: "Back Squat", sets: 5, reps: "5", rest_sec: 180, rpe: 8 },
        { name: "Pause Squat", sets: 3, reps: "3", rest_sec: 150 },
        { name: "Bulgarian Split Squat", sets: 3, reps: "6/leg", rest_sec: 90 },
        { name: "Weighted Plank", sets: 3, reps: "45s", rest_sec: 60 },
      ]},
      { title: "Bench Day", focus: "Pressing strength", exercises: [
        { name: "Barbell Bench Press", sets: 5, reps: "5", rest_sec: 180, rpe: 8 },
        { name: "Close-Grip Bench Press", sets: 3, reps: "6", rest_sec: 120 },
        { name: "Weighted Pull-Up", sets: 4, reps: "5", rest_sec: 150 },
        { name: "Barbell Row", sets: 3, reps: "8", rest_sec: 90 },
      ]},
      { title: "Deadlift Day", focus: "Posterior chain power", exercises: [
        { name: "Conventional Deadlift", sets: 5, reps: "3", rest_sec: 210, rpe: 8 },
        { name: "Deficit Deadlift", sets: 3, reps: "5", rest_sec: 180 },
        { name: "Barbell Hip Thrust", sets: 3, reps: "6", rest_sec: 120 },
        { name: "Heavy Farmer Carry", sets: 4, reps: "30m", rest_sec: 90 },
      ]},
      { title: "Press Day", focus: "Overhead strength", exercises: [
        { name: "Overhead Press", sets: 5, reps: "5", rest_sec: 150, rpe: 8 },
        { name: "Push Press", sets: 3, reps: "3", rest_sec: 150 },
        { name: "Weighted Dip", sets: 3, reps: "6", rest_sec: 120 },
        { name: "Chin-Up", sets: 4, reps: "6", rest_sec: 90 },
      ]},
    ],
  },
  "sport": {
    name: "Athlete Forge",
    style: "Sport Performance",
    summary: "Speed, plyometric, and rotational power with repeat-sprint conditioning.",
    weekly_split: ["Mon: Speed/Power", "Tue: Lower Strength", "Thu: Rotational/Upper", "Sat: Conditioning"],
    days: [
      { title: "Speed & Power", focus: "CNS priming, plyometrics", exercises: [
        { name: "Broad Jump", sets: 5, reps: "3", rest_sec: 90 },
        { name: "Box Jump", sets: 4, reps: "5", rest_sec: 90 },
        { name: "Sprint 30m", sets: 6, reps: "1", rest_sec: 120 },
        { name: "Trap Bar Jump", sets: 4, reps: "3", rest_sec: 120 },
      ]},
      { title: "Lower Strength", focus: "Force production", exercises: [
        { name: "Trap Bar Deadlift", sets: 4, reps: "5", rest_sec: 150 },
        { name: "Rear-Foot Elevated Split Squat", sets: 3, reps: "6/leg", rest_sec: 90 },
        { name: "Nordic Hamstring Curl", sets: 3, reps: "6", rest_sec: 90 },
        { name: "Pallof Press", sets: 3, reps: "10/side", rest_sec: 45 },
      ]},
      { title: "Rotational & Upper", focus: "Power transfer", exercises: [
        { name: "Med Ball Rotational Throw", sets: 4, reps: "5/side", rest_sec: 90 },
        { name: "Landmine Press", sets: 3, reps: "8/side", rest_sec: 75 },
        { name: "Single-Arm DB Row", sets: 3, reps: "8/side", rest_sec: 75 },
        { name: "Cable Wood Chop", sets: 3, reps: "10/side", rest_sec: 45 },
      ]},
      { title: "Conditioning", focus: "Repeat sprint capacity", exercises: [
        { name: "Shuttle Run 5-10-5", sets: 8, reps: "1", rest_sec: 60 },
        { name: "Sled Sprint", sets: 6, reps: "20m", rest_sec: 75 },
        { name: "Bike Sprint Intervals", sets: 8, reps: "20s on / 40s off", rest_sec: 0 },
      ]},
    ],
  },
  "postpartum": {
    name: "Postpartum Rebuild",
    style: "Restorative Strength",
    summary: "Diastasis-safe core, pelvic floor, gradual full-body rebuild.",
    weekly_split: ["Mon: Core & Floor", "Wed: Lower Rebuild", "Fri: Upper & Posture"],
    days: [
      { title: "Core & Pelvic Floor", focus: "Reconnection", exercises: [
        { name: "Diaphragmatic Breathing", sets: 3, reps: "10 breaths", rest_sec: 30 },
        { name: "Heel Slide (TVA)", sets: 3, reps: "10/side", rest_sec: 30 },
        { name: "Dead Bug (low load)", sets: 3, reps: "8/side", rest_sec: 45 },
        { name: "Side-Lying Clamshell", sets: 3, reps: "12/side", rest_sec: 30 },
        { name: "Pelvic Tilt Bridge", sets: 3, reps: "12", rest_sec: 45 },
      ]},
      { title: "Lower Rebuild", focus: "Hinge & squat patterning", exercises: [
        { name: "Goblet Squat (light)", sets: 3, reps: "10", rest_sec: 60 },
        { name: "DB Romanian Deadlift", sets: 3, reps: "10", rest_sec: 75 },
        { name: "Glute Bridge March", sets: 3, reps: "10/side", rest_sec: 45 },
        { name: "Step-Up (low box)", sets: 3, reps: "10/leg", rest_sec: 45 },
      ]},
      { title: "Upper & Posture", focus: "Re-stack the ribcage", exercises: [
        { name: "Wall Slide", sets: 3, reps: "12", rest_sec: 30 },
        { name: "DB Row (chest-supported)", sets: 3, reps: "10", rest_sec: 60 },
        { name: "Half-Kneeling Landmine Press", sets: 3, reps: "8/side", rest_sec: 60 },
        { name: "Band Pull-Apart", sets: 3, reps: "15", rest_sec: 30 },
      ]},
    ],
  },
  "arms": {
    name: "Sleeve Buster",
    style: "Arm Specialization",
    summary: "High-frequency biceps, triceps, and shoulder work for definition.",
    weekly_split: ["Mon: Heavy Arms", "Wed: Push", "Fri: Pull", "Sat: Arm Pump"],
    days: [
      { title: "Heavy Arms", focus: "Compound + heavy curls/extensions", exercises: [
        { name: "Close-Grip Bench Press", sets: 4, reps: "8", rest_sec: 90 },
        { name: "Weighted Chin-Up", sets: 4, reps: "6-8", rest_sec: 90 },
        { name: "Barbell Curl", sets: 4, reps: "8", rest_sec: 75 },
        { name: "Skull Crusher", sets: 4, reps: "8", rest_sec: 75 },
      ]},
      { title: "Push", focus: "Chest + shoulders", exercises: [
        { name: "Incline DB Press", sets: 4, reps: "10", rest_sec: 75 },
        { name: "DB Lateral Raise", sets: 4, reps: "12", rest_sec: 45 },
        { name: "Cable Tricep Pushdown", sets: 4, reps: "12", rest_sec: 45 },
        { name: "Overhead Cable Tricep Extension", sets: 3, reps: "12", rest_sec: 45 },
      ]},
      { title: "Pull", focus: "Back + biceps", exercises: [
        { name: "Lat Pulldown", sets: 4, reps: "10", rest_sec: 75 },
        { name: "Seated Cable Row", sets: 4, reps: "10", rest_sec: 75 },
        { name: "Incline DB Curl", sets: 4, reps: "10", rest_sec: 60 },
        { name: "Hammer Curl", sets: 3, reps: "12", rest_sec: 45 },
      ]},
      { title: "Arm Pump", focus: "Volume + finishers", exercises: [
        { name: "Spider Curl", sets: 4, reps: "12", rest_sec: 45 },
        { name: "Cable Concentration Curl", sets: 3, reps: "15", rest_sec: 45 },
        { name: "Rope Tricep Pushdown", sets: 4, reps: "15", rest_sec: 45 },
        { name: "Dip", sets: 3, reps: "AMRAP", rest_sec: 60 },
        { name: "21s (barbell curl)", sets: 3, reps: "21", rest_sec: 60 },
      ]},
    ],
  },
  "posture": {
    name: "Posture Reset",
    style: "Corrective Strength",
    summary: "Upper-back, deep core, and T-spine work to undo desk posture.",
    weekly_split: ["Mon: Upper Back", "Wed: Core & Hips", "Fri: Full-Body Posture"],
    days: [
      { title: "Upper Back", focus: "Scap strength", exercises: [
        { name: "Prone Y-T-W Raise", sets: 3, reps: "10 each", rest_sec: 45 },
        { name: "Face Pull", sets: 4, reps: "15", rest_sec: 45 },
        { name: "Chest-Supported Row", sets: 4, reps: "10", rest_sec: 75 },
        { name: "Band Pull-Apart", sets: 3, reps: "20", rest_sec: 30 },
      ]},
      { title: "Core & Hips", focus: "Anti-extension + hip mobility", exercises: [
        { name: "Dead Bug", sets: 3, reps: "10/side", rest_sec: 30 },
        { name: "90/90 Hip Switch", sets: 3, reps: "8/side", rest_sec: 30 },
        { name: "Couch Stretch", sets: 3, reps: "60s/side", rest_sec: 0 },
        { name: "Hollow Body Hold", sets: 3, reps: "30s", rest_sec: 45 },
      ]},
      { title: "Full-Body Posture", focus: "Integrated strength", exercises: [
        { name: "Goblet Squat", sets: 3, reps: "10", rest_sec: 60 },
        { name: "Romanian Deadlift", sets: 3, reps: "10", rest_sec: 75 },
        { name: "Half-Kneeling Landmine Press", sets: 3, reps: "8/side", rest_sec: 60 },
        { name: "Suitcase Carry", sets: 3, reps: "30m/side", rest_sec: 60 },
      ]},
    ],
  },
  "fat-loss": {
    name: "Burn Circuits",
    style: "Strength + Metabolic",
    summary: "Full-body strength supersets with high-density conditioning blocks.",
    weekly_split: ["Mon: Full-Body A", "Tue: HIIT", "Thu: Full-Body B", "Fri: Density"],
    days: [
      { title: "Full-Body A", focus: "Push/pull/squat", exercises: [
        { name: "Goblet Squat", sets: 4, reps: "12", rest_sec: 60 },
        { name: "DB Bench Press", sets: 4, reps: "10", rest_sec: 60 },
        { name: "DB Row", sets: 4, reps: "10/side", rest_sec: 60 },
        { name: "Burpee", sets: 4, reps: "10", rest_sec: 45 },
      ]},
      { title: "HIIT", focus: "Conditioning", exercises: [
        { name: "Assault Bike Sprint", sets: 10, reps: "20s on / 40s off", rest_sec: 0 },
        { name: "Kettlebell Swing", sets: 5, reps: "20", rest_sec: 45 },
        { name: "Mountain Climber", sets: 4, reps: "30s", rest_sec: 30 },
      ]},
      { title: "Full-Body B", focus: "Hinge/press/pull", exercises: [
        { name: "Trap Bar Deadlift", sets: 4, reps: "8", rest_sec: 90 },
        { name: "DB Push Press", sets: 4, reps: "8", rest_sec: 60 },
        { name: "Lat Pulldown", sets: 4, reps: "10", rest_sec: 60 },
        { name: "Battle Ropes", sets: 4, reps: "30s", rest_sec: 30 },
      ]},
      { title: "Density Day", focus: "EMOM + finisher", exercises: [
        { name: "EMOM 12: 5 KB Swings + 5 Goblet Squats", sets: 12, reps: "1 min", rest_sec: 0 },
        { name: "Sled Push", sets: 5, reps: "20m", rest_sec: 60 },
        { name: "Plank", sets: 3, reps: "60s", rest_sec: 30 },
      ]},
    ],
  },
  "mobility": {
    name: "Move Forever",
    style: "Mobility & Longevity",
    summary: "Joint CARs, low-load strength, balance, and aerobic base.",
    weekly_split: ["Mon: Mobility Flow", "Wed: Strength-Mobility", "Fri: Balance & Aerobic"],
    days: [
      { title: "Mobility Flow", focus: "CARs + tissue prep", exercises: [
        { name: "Shoulder CARs", sets: 2, reps: "5/side", rest_sec: 30 },
        { name: "Hip CARs", sets: 2, reps: "5/side", rest_sec: 30 },
        { name: "Cat-Cow", sets: 2, reps: "10", rest_sec: 0 },
        { name: "World's Greatest Stretch", sets: 2, reps: "5/side", rest_sec: 0 },
        { name: "90/90 Hip Switch", sets: 3, reps: "8/side", rest_sec: 30 },
      ]},
      { title: "Strength-Mobility", focus: "Loaded ROM", exercises: [
        { name: "Cossack Squat", sets: 3, reps: "8/side", rest_sec: 60 },
        { name: "Jefferson Curl (light)", sets: 3, reps: "8", rest_sec: 60 },
        { name: "Single-Leg RDL", sets: 3, reps: "8/leg", rest_sec: 60 },
        { name: "Turkish Get-Up", sets: 3, reps: "3/side", rest_sec: 60 },
      ]},
      { title: "Balance & Aerobic", focus: "Zone 2 + balance", exercises: [
        { name: "Single-Leg Balance (eyes closed)", sets: 3, reps: "30s/side", rest_sec: 30 },
        { name: "Farmer Carry", sets: 4, reps: "40m", rest_sec: 60 },
        { name: "Zone 2 Walk/Bike", sets: 1, reps: "30 min", rest_sec: 0 },
      ]},
    ],
  },
};

function detectGoalKey(label?: string, prompt?: string): string {
  const t = `${label ?? ""} ${prompt ?? ""}`.toLowerCase();
  if (/glute|booty|butt/.test(t)) return "glute-growth";
  if (/postpartum|c-section|pelvic floor/.test(t)) return "postpartum";
  if (/arm|biceps|triceps|sleeve/.test(t)) return "arms";
  if (/posture|rounded shoulder|forward head/.test(t)) return "posture";
  if (/strength|powerlift|squat|bench|deadlift|power/.test(t)) return "strength";
  if (/sport|speed|agility|athlete|soccer|basketball/.test(t)) return "sport";
  if (/mobility|longevity|pain-free|flexibility/.test(t)) return "mobility";
  if (/fat loss|cut|lean down|hiit|circuit/.test(t)) return "fat-loss";
  if (/recomp|build muscle.*lose fat|muscle.*fat/.test(t)) return "muscle-fat";
  return "muscle-fat";
}

export function buildTemplateProgram(opts: { goalLabel?: string; goalPrompt?: string; daysPerWeek?: number; weeks?: number }) {
  const key = detectGoalKey(opts.goalLabel, opts.goalPrompt);
  const tpl = T[key];
  const weeks = Math.max(4, Math.min(opts.weeks ?? 8, 12));
  const dpw = Math.max(2, Math.min(opts.daysPerWeek ?? tpl.days.length, tpl.days.length));
  const sessions: Session[] = [];
  for (let w = 1; w <= weeks; w++) {
    for (let d = 1; d <= dpw; d++) {
      const day = tpl.days[(d - 1) % tpl.days.length];
      // Light progressive overload note
      const exs = day.exercises.map((e) => ({ ...e, notes: e.notes ?? (w > 1 ? `Add 2.5kg/5lb or +1 rep vs last week` : undefined) }));
      sessions.push({ week: w, day: d, title: day.title, focus: day.focus, duration_min: 50, exercises: exs });
    }
  }
  return {
    name: tpl.name,
    style: tpl.style,
    weeks,
    summary: tpl.summary,
    weekly_split: tpl.weekly_split,
    sessions,
    progression_notes: "Add load or reps weekly. Deload week 4/8 by reducing top sets ~30%.",
    deload_week: weeks >= 8 ? 8 : 4,
    _goal_key: key,
  };
}

export function summarizeChanges(plan: any): string {
  const sessions = Array.isArray(plan?.sessions) ? plan.sessions : [];
  const week1 = sessions.filter((s: any) => (s.week ?? 1) === 1);
  const titles = week1.map((s: any) => s.title).filter(Boolean);
  const exs = new Set<string>();
  week1.forEach((s: any) => (s.exercises ?? []).forEach((e: any) => e?.name && exs.add(e.name)));
  const sample = Array.from(exs).slice(0, 6);
  return `New ${plan?.name ?? "program"} — ${titles.join(" · ")}. Featuring: ${sample.join(", ")}.`;
}
