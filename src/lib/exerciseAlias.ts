// Exercise name normalization + alias matching.
// Goal: "bench press" should match "Barbell Bench Press", "DB Bench", "Flat BB Bench", etc.

const EQUIPMENT_WORDS = [
  "barbell", "bb", "dumbbell", "db", "kettlebell", "kb", "cable", "machine",
  "smith", "ez", "ezbar", "ez-bar", "trap", "trapbar", "hex", "band", "banded",
  "landmine", "bodyweight", "bw", "weighted", "plate",
];

const MODIFIER_WORDS = [
  "flat", "incline", "decline", "seated", "standing", "kneeling", "lying",
  "supine", "prone", "single", "single-arm", "single-leg", "one-arm", "one-leg",
  "alternating", "alt", "tempo", "paused", "pause", "slow", "explosive",
  "high", "low", "neutral", "reverse", "wide", "narrow", "close", "close-grip",
  "wide-grip", "overhand", "underhand", "pronated", "supinated", "front", "back",
  "rear", "side", "lateral", "bilateral", "unilateral",
];

const STOPWORDS = new Set([
  "the", "a", "an", "with", "and", "of", "to", "for", "on", "in",
  ...EQUIPMENT_WORDS, ...MODIFIER_WORDS,
]);

// Canonical movement aliases — left side is the canonical token, right side are synonyms.
const ALIAS_GROUPS: Array<{ canonical: string; aliases: string[] }> = [
  { canonical: "bench press", aliases: ["bench", "bench press", "chest press", "flat press", "press bench"] },
  { canonical: "incline press", aliases: ["incline press", "incline bench", "incline chest press"] },
  { canonical: "overhead press", aliases: ["overhead press", "ohp", "shoulder press", "military press", "press overhead", "strict press"] },
  { canonical: "squat", aliases: ["squat", "back squat", "front squat", "goblet squat", "high bar squat", "low bar squat"] },
  { canonical: "deadlift", aliases: ["deadlift", "dl", "conventional deadlift", "sumo deadlift", "rdl", "romanian deadlift", "stiff leg deadlift", "stiff-leg deadlift"] },
  { canonical: "row", aliases: ["row", "bent over row", "bent-over row", "barbell row", "pendlay row", "seated row", "cable row", "chest supported row", "t-bar row", "tbar row"] },
  { canonical: "pull up", aliases: ["pull up", "pullup", "pull-up", "chin up", "chinup", "chin-up", "lat pulldown", "pulldown"] },
  { canonical: "lunge", aliases: ["lunge", "split squat", "bulgarian split squat", "bss", "reverse lunge", "walking lunge", "step-up", "stepup"] },
  { canonical: "hip thrust", aliases: ["hip thrust", "glute bridge", "bridge"] },
  { canonical: "curl", aliases: ["curl", "bicep curl", "biceps curl", "hammer curl", "preacher curl"] },
  { canonical: "tricep extension", aliases: ["tricep extension", "triceps extension", "skullcrusher", "skull crusher", "pushdown", "tricep pushdown"] },
  { canonical: "lateral raise", aliases: ["lateral raise", "side raise", "side lateral", "lat raise"] },
  { canonical: "calf raise", aliases: ["calf raise", "calves", "standing calf", "seated calf"] },
  { canonical: "leg press", aliases: ["leg press", "hack squat"] },
  { canonical: "leg curl", aliases: ["leg curl", "hamstring curl"] },
  { canonical: "leg extension", aliases: ["leg extension", "quad extension"] },
  { canonical: "dip", aliases: ["dip", "dips", "bench dip"] },
  { canonical: "push up", aliases: ["push up", "pushup", "push-up"] },
  { canonical: "plank", aliases: ["plank", "side plank", "front plank"] },
];

function normalize(raw: string): string {
  return (raw || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(raw: string): string[] {
  return normalize(raw).split(" ").filter((t) => t && !STOPWORDS.has(t));
}

/**
 * Returns canonical movement keys present in the name.
 * e.g. "Barbell Bench Press" → ["bench press"]
 *      "Incline DB Bench"    → ["incline press", "bench press"]
 */
export function canonicalKeys(name: string): string[] {
  const norm = " " + normalize(name) + " ";
  const hits: string[] = [];
  for (const group of ALIAS_GROUPS) {
    for (const alias of group.aliases) {
      if (norm.includes(" " + alias + " ")) {
        if (!hits.includes(group.canonical)) hits.push(group.canonical);
        break;
      }
    }
  }
  return hits;
}

/**
 * Confidence score (0-1) that two exercise names refer to the same movement.
 * Considers canonical aliases first, then meaningful token overlap.
 */
export function aliasMatchScore(a: string, b: string): number {
  if (!a || !b) return 0;
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;

  const ka = canonicalKeys(a);
  const kb = canonicalKeys(b);
  const sharedCanonical = ka.filter((k) => kb.includes(k));
  if (sharedCanonical.length) {
    // Boost when modifiers also align (incline vs incline)
    const ta = new Set(normalize(a).split(" "));
    const tb = new Set(normalize(b).split(" "));
    const sharedModifiers = MODIFIER_WORDS.filter((m) => ta.has(m) && tb.has(m)).length;
    const conflictingModifiers = MODIFIER_WORDS.filter(
      (m) => (ta.has(m) && !tb.has(m) && ["incline", "decline", "flat", "front", "back", "reverse"].includes(m)) ||
             (tb.has(m) && !ta.has(m) && ["incline", "decline", "flat", "front", "back", "reverse"].includes(m)),
    ).length;
    return Math.max(0, Math.min(1, 0.85 + 0.05 * sharedModifiers - 0.25 * conflictingModifiers));
  }

  // Fallback: meaningful token overlap (ignore equipment/modifier stopwords)
  const sa = new Set(tokens(a));
  const sb = new Set(tokens(b));
  if (!sa.size || !sb.size) return 0;
  let shared = 0;
  sa.forEach((t) => { if (sb.has(t)) shared++; });
  const denom = Math.min(sa.size, sb.size);
  return denom ? shared / denom : 0;
}

/** True if two exercise names refer to the same lift (default threshold 0.6). */
export function isSameExercise(a: string, b: string, threshold = 0.6): boolean {
  return aliasMatchScore(a, b) >= threshold;
}
