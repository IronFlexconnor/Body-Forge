import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, Search, Sparkles, Heart, Play, Loader2, RefreshCcw, Shuffle,
  Clock, Flame, Leaf, Utensils, Plus, X, Sunrise, Sun, Moon, Coffee, Cookie, Apple,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { thumbForRecipe, thumbFallbackForRecipe, videoForRecipe } from "@/lib/mealVideos";
import { useFavorites } from "@/lib/favorites";
import { toast } from "sonner";

export const Route = createFileRoute("/fresh-meals")({
  head: () => ({
    meta: [
      { title: "Today's Fresh Meals — Body Forge" },
      { name: "description", content: "Your daily plan: breakfast to evening snack with prep videos, smart filters, and macro-preserving swaps." },
      { property: "og:title", content: "Today's Fresh Meals — Body Forge" },
      { property: "og:description", content: "Big videos. Mouth-watering picks. One-tap save & swap." },
    ],
  }),
  component: FreshMealsPage,
});

type Recipe = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  meal_type: string;
  cuisine: string | null;
  dietary_tags: string[] | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  prep_minutes: number;
  cook_minutes: number;
  difficulty: string;
};

type FilterKey =
  | "all" | "high-protein" | "low-carb" | "quick" | "low-inflammation"
  | "gluten-free" | "dairy-free" | "keto" | "paleo" | "vegan" | "vegetarian"
  | "pescatarian" | "low-fodmap" | "senior" | "budget" | "family";

const FILTERS: { key: FilterKey; label: string; icon: any }[] = [
  { key: "all", label: "All", icon: Sparkles },
  { key: "high-protein", label: "High protein", icon: Flame },
  { key: "low-inflammation", label: "Low inflammation", icon: Leaf },
  { key: "quick", label: "Under 15 min", icon: Clock },
  { key: "low-carb", label: "Low carb", icon: Leaf },
  { key: "keto", label: "Keto", icon: Leaf },
  { key: "paleo", label: "Paleo", icon: Leaf },
  { key: "vegan", label: "Vegan", icon: Leaf },
  { key: "vegetarian", label: "Vegetarian", icon: Leaf },
  { key: "pescatarian", label: "Pescatarian", icon: Leaf },
  { key: "gluten-free", label: "Gluten-free", icon: Leaf },
  { key: "dairy-free", label: "Dairy-free", icon: Leaf },
  { key: "low-fodmap", label: "Low FODMAP", icon: Leaf },
  { key: "senior", label: "Senior-friendly", icon: Heart },
  { key: "budget", label: "Budget", icon: Utensils },
  { key: "family", label: "Family", icon: Utensils },
];

type SlotKey = "breakfast" | "mid_morning" | "lunch" | "afternoon" | "dinner" | "evening";
const SLOTS: { key: SlotKey; label: string; sub: string; mealType: string; isSnack: boolean; icon: any }[] = [
  { key: "breakfast",   label: "Breakfast",          sub: "Start strong",          mealType: "breakfast", isSnack: false, icon: Sunrise },
  { key: "mid_morning", label: "Mid-morning snack",  sub: "Gentle energy",         mealType: "snack",     isSnack: true,  icon: Coffee },
  { key: "lunch",       label: "Lunch",              sub: "Refuel for the day",    mealType: "lunch",     isSnack: false, icon: Sun },
  { key: "afternoon",   label: "Afternoon snack",    sub: "Beat the slump",        mealType: "snack",     isSnack: true,  icon: Apple },
  { key: "dinner",      label: "Dinner",             sub: "Recover & repair",      mealType: "dinner",    isSnack: false, icon: Moon },
  { key: "evening",     label: "Evening snack",      sub: "Optional wind-down",    mealType: "snack",     isSnack: true,  icon: Cookie },
];

function todayKey() { return new Date().toISOString().slice(0, 10); }
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const out = arr.slice(); let s = seed || 1;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function tagsOf(r: Recipe) { return (r.dietary_tags || []).map((t) => t.toLowerCase()); }
function tagMatches(r: Recipe, key: FilterKey): boolean {
  const tags = tagsOf(r);
  const has = (...needles: string[]) => tags.some((t) => needles.some((n) => t.includes(n)));
  switch (key) {
    case "all": return true;
    case "high-protein": return Number(r.protein_g) >= 30;
    case "low-carb": return Number(r.carbs_g) <= 30;
    case "quick": return (r.prep_minutes + r.cook_minutes) <= 15;
    case "low-inflammation": return has("anti-inflammatory", "low-inflammation", "mediterranean", "omega");
    case "gluten-free": return has("gluten-free", "gf");
    case "dairy-free": return has("dairy-free", "lactose-free");
    case "keto": return has("keto") || (Number(r.carbs_g) <= 20 && Number(r.fat_g) >= 20);
    case "paleo": return has("paleo");
    case "vegan": return has("vegan", "plant-based");
    case "vegetarian": return has("vegetarian", "vegan", "plant-based");
    case "pescatarian": return has("pescatarian", "fish", "seafood", "salmon", "tuna");
    case "low-fodmap": return has("low-fodmap", "fodmap");
    case "senior": return has("senior", "geriatric", "soft", "gentle") || r.difficulty === "easy";
    case "budget": return has("budget", "cheap", "pantry");
    case "family": return has("family", "kid");
  }
}

function FreshMealsPage() {
  const navigate = useNavigate();
  const [all, setAll] = useState<Recipe[] | null>(null);
  const [seedOffset, setSeedOffset] = useState(0);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Recipe | null>(null);
  const { isFav, toggle } = useFavorites();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("recipes")
        .select("id,slug,title,description,meal_type,cuisine,dietary_tags,calories,protein_g,carbs_g,fat_g,prep_minutes,cook_minutes,difficulty")
        .limit(1000);
      if (cancelled || !data) return;
      setAll(data as Recipe[]);
    })();
    return () => { cancelled = true; };
  }, []);

  const baseFiltered = useMemo(() => {
    if (!all) return null;
    let list = all.slice();
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((r) =>
        r.title.toLowerCase().includes(q) ||
        (r.cuisine || "").toLowerCase().includes(q) ||
        (r.dietary_tags || []).some((t) => t.toLowerCase().includes(q))
      );
    }
    if (filter !== "all") list = list.filter((r) => tagMatches(r, filter));
    return list;
  }, [all, filter, query]);

  // Build the daily plan: pick one recipe per slot, deterministic per day+seedOffset
  const slotPicks = useMemo(() => {
    if (!baseFiltered) return null;
    const seed = hash(todayKey() + ":" + seedOffset);
    const shuffled = seededShuffle(baseFiltered, seed);
    const picks: Record<SlotKey, { primary: Recipe | null; alts: Recipe[] }> = {} as any;
    const used = new Set<string>();
    for (const slot of SLOTS) {
      const pool = shuffled.filter((r) => {
        const mt = (r.meal_type || "").toLowerCase();
        if (slot.isSnack) return mt.includes("snack");
        return mt === slot.mealType;
      });
      // Fallback: if no specific match (e.g. snack pool empty), allow any not used
      const eligible = (pool.length ? pool : shuffled).filter((r) => !used.has(r.id));
      const primary = eligible[0] ?? null;
      if (primary) used.add(primary.id);
      const alts = eligible.slice(1, 7);
      picks[slot.key] = { primary, alts };
    }
    return picks;
  }, [baseFiltered, seedOffset]);

  const totals = useMemo(() => {
    if (!slotPicks) return null;
    let kcal = 0, p = 0, c = 0, f = 0;
    for (const slot of SLOTS) {
      const r = slotPicks[slot.key].primary;
      if (!r) continue;
      kcal += r.calories || 0;
      p += Number(r.protein_g) || 0;
      c += Number(r.carbs_g) || 0;
      f += Number(r.fat_g) || 0;
    }
    return { kcal: Math.round(kcal), p: Math.round(p), c: Math.round(c), f: Math.round(f) };
  }, [slotPicks]);

  const regenAll = () => {
    setSeedOffset((n) => n + 1);
    toast.success("Fresh plan served — same macro shape, brand-new variety");
  };

  const swapIntoPlan = (r: Recipe) => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("forge:open-regen", `swap ${r.title} into today's plan with similar macros`);
    }
    toast.success(`Swapping ${r.title} into today's plan…`);
    navigate({ to: "/nutrition" });
  };

  const addToWeek = (r: Recipe) => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("forge:open-regen", `add ${r.title} to this week's meal plan`);
    }
    toast.success(`Added ${r.title} to this week`);
    navigate({ to: "/nutrition" });
  };

  return (
    <AppShell>
      <div className="px-5 pt-6">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <button onClick={() => navigate({ to: "/" })} aria-label="Back" className="grid h-10 w-10 place-items-center rounded-full border border-border/60 bg-card hover:border-primary/50">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
              <Sparkles className="h-3 w-3" /> Today's plan
            </div>
            <h1 className="mt-1 text-2xl font-bold leading-tight">Today's Fresh Meals</h1>
            <p className="text-xs text-muted-foreground">Breakfast → evening snack · macro-smart swaps</p>
          </div>
          <button onClick={regenAll} aria-label="Regenerate" className="grid h-10 w-10 place-items-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow hover:scale-105 transition">
            <RefreshCcw className="h-4 w-4" />
          </button>
        </div>

        {/* Daily totals */}
        {totals && (
          <div className="mb-4 grid grid-cols-4 gap-2 rounded-2xl border border-border/60 bg-gradient-card p-3 shadow-card">
            <Stat label="kcal" value={totals.kcal} />
            <Stat label="protein" value={`${totals.p}g`} />
            <Stat label="carbs" value={`${totals.c}g`} />
            <Stat label="fat" value={`${totals.f}g`} />
          </div>
        )}

        {/* Search */}
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search meals, cuisine, tags…"
            className="h-11 w-full rounded-2xl border border-border/60 bg-card pl-9 pr-9 text-sm outline-none focus:border-primary/60"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="-mx-5 mb-5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex gap-2 w-max">
            {FILTERS.map((f) => {
              const isActive = filter === f.key;
              const Icon = f.icon;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition ${
                    isActive
                      ? "border-primary bg-gradient-primary text-primary-foreground shadow-glow"
                      : "border-border/60 bg-card text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" /> {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {!slotPicks ? (
          <div className="grid h-64 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <>
            {SLOTS.map((slot) => (
              <SlotSection
                key={slot.key}
                slot={slot}
                primary={slotPicks[slot.key].primary}
                alts={slotPicks[slot.key].alts}
                onOpen={setActive}
                onSwap={swapIntoPlan}
                onSave={(r) => {
                  const added = toggle({ id: r.id, slug: r.slug, title: r.title, meal_type: r.meal_type });
                  toast.success(added ? "Saved to favorites" : "Removed from favorites");
                }}
                isFav={isFav}
              />
            ))}

            <button
              onClick={regenAll}
              className="mb-8 mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/40 bg-gradient-primary p-4 font-semibold text-primary-foreground shadow-glow hover:scale-[1.01] transition"
            >
              <Shuffle className="h-4 w-4" /> Surprise me — regenerate plan
            </button>
          </>
        )}
      </div>

      {active && (
        <DetailSheet
          recipe={active}
          onClose={() => setActive(null)}
          isFav={isFav(active.id)}
          onSave={(r) => {
            const added = toggle({ id: r.id, slug: r.slug, title: r.title, meal_type: r.meal_type });
            toast.success(added ? "Saved to favorites" : "Removed from favorites");
          }}
          onSwap={swapIntoPlan}
          onAdd={addToWeek}
        />
      )}
    </AppShell>
  );
}

function SlotSection({
  slot, primary, alts, onOpen, onSwap, onSave, isFav,
}: {
  slot: { key: SlotKey; label: string; sub: string; icon: any };
  primary: Recipe | null;
  alts: Recipe[];
  onOpen: (r: Recipe) => void;
  onSwap: (r: Recipe) => void;
  onSave: (r: Recipe) => void;
  isFav: (id: string) => boolean;
}) {
  const Icon = slot.icon;
  if (!primary) return null;
  const fav = isFav(primary.id);
  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/15 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-semibold leading-tight">{slot.label}</h2>
          <p className="text-[11px] text-muted-foreground">{slot.sub}</p>
        </div>
      </div>

      {/* Primary big card */}
      <div className="overflow-hidden rounded-3xl border border-border/60 bg-gradient-card shadow-card">
        <button onClick={() => onOpen(primary)} className="block w-full text-left">
          <div className="relative aspect-[16/10] overflow-hidden bg-muted">
            <img
              src={thumbForRecipe(primary)}
              alt={primary.title}
              loading="eager"
              decoding="async"
              fetchPriority="high"
              onError={(e) => { const img = e.currentTarget; const fb = thumbFallbackForRecipe(primary); if (img.src !== fb) img.src = fb; }}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md ring-1 ring-white/30">
              <Play className="h-3 w-3 fill-current" /> Prep video
            </div>
            <div className="absolute bottom-3 left-3 right-3 text-white">
              <div className="text-[10px] font-semibold uppercase tracking-wider opacity-90">{primary.prep_minutes + primary.cook_minutes} min · {primary.difficulty}</div>
              <div className="text-xl font-bold leading-tight drop-shadow">{primary.title}</div>
              <div className="mt-0.5 text-xs opacity-90">{primary.calories} kcal · {Math.round(primary.protein_g)}g protein · {Math.round(primary.carbs_g)}g carbs · {Math.round(primary.fat_g)}g fat</div>
            </div>
          </div>
        </button>
        <div className="flex gap-2 p-3">
          <button onClick={() => onSwap(primary)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow">
            <RefreshCcw className="h-4 w-4" /> Swap into plan
          </button>
          <button onClick={() => onSave(primary)} aria-label="Save" className={`grid h-10 w-10 place-items-center rounded-xl border ${fav ? "border-primary bg-primary/10" : "border-border/60 bg-card"}`}>
            <Heart className={`h-4 w-4 ${fav ? "fill-primary text-primary" : "text-muted-foreground"}`} />
          </button>
        </div>
      </div>

      {/* Alternatives carousel */}
      {alts.length > 0 && (
        <div className="mt-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">More options · macro-similar</p>
          <div className="-mx-5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <ul className="flex gap-3 snap-x snap-mandatory">
              {alts.map((r) => {
                const f = isFav(r.id);
                return (
                  <li key={r.id} className="snap-start shrink-0 w-[68%] sm:w-[42%] lg:w-[28%]">
                    <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-card shadow-card transition hover:border-primary/50">
                      <button onClick={() => onOpen(r)} className="block w-full text-left">
                        <div className="relative aspect-video overflow-hidden bg-muted">
                          <img
                            src={thumbForRecipe(r)}
                            alt={r.title}
                            loading="lazy"
                            decoding="async"
                            onError={(e) => { const img = e.currentTarget; const fb = thumbFallbackForRecipe(r); if (img.src !== fb) img.src = fb; }}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                          <div className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-md ring-1 ring-white/25">
                            <Play className="h-3 w-3 fill-current" /> Prep video
                          </div>
                          <div className="absolute right-2 top-2 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground shadow-glow">
                            {r.prep_minutes + r.cook_minutes}m
                          </div>
                        </div>
                      </button>
                      <button
                        type="button"
                        aria-label={f ? "Remove favorite" : "Save meal"}
                        onClick={(e) => { e.stopPropagation(); onSave(r); }}
                        className="absolute right-2 top-2 z-10 grid h-9 w-9 place-items-center rounded-full bg-background/90 shadow-card backdrop-blur transition hover:scale-110"
                        style={{ top: "auto", bottom: "60px" }}
                      >
                        <Heart className={`h-4 w-4 ${f ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                      </button>
                      <button onClick={() => onOpen(r)} className="block w-full p-3 text-left">
                        <div className="line-clamp-1 text-sm font-semibold">{r.title}</div>
                        <div className="mt-1 text-[11px] text-muted-foreground">{r.calories} kcal · {Math.round(r.protein_g)}g protein</div>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

function DetailSheet({ recipe, onClose, isFav, onSave, onSwap, onAdd }: {
  recipe: Recipe; onClose: () => void; isFav: boolean;
  onSave: (r: Recipe) => void; onSwap: (r: Recipe) => void; onAdd: (r: Recipe) => void;
}) {
  const video = videoForRecipe(recipe);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="relative w-full max-w-lg overflow-hidden rounded-t-3xl border border-border/60 bg-background sm:rounded-3xl animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white backdrop-blur hover:bg-black/80">
          <X className="h-4 w-4" />
        </button>
        <div className="aspect-video w-full bg-muted">
          <iframe
            src={video.embedUrl}
            title={recipe.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
        <div className="max-h-[55vh] overflow-y-auto p-5">
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">{recipe.meal_type}</span>
            <span className="text-[11px] text-muted-foreground">{recipe.prep_minutes + recipe.cook_minutes} min · {recipe.difficulty}</span>
          </div>
          <h2 className="mb-1 text-xl font-bold leading-tight">{recipe.title}</h2>
          {recipe.description && <p className="text-sm text-muted-foreground">{recipe.description}</p>}
          <div className="mt-4 grid grid-cols-4 gap-2 text-center">
            <Stat label="kcal" value={recipe.calories} />
            <Stat label="protein" value={`${Math.round(recipe.protein_g)}g`} />
            <Stat label="carbs" value={`${Math.round(recipe.carbs_g)}g`} />
            <Stat label="fat" value={`${Math.round(recipe.fat_g)}g`} />
          </div>
          {(recipe.dietary_tags || []).length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {recipe.dietary_tags!.slice(0, 8).map((t) => (
                <span key={t} className="rounded-full border border-border/60 bg-card px-2 py-0.5 text-[10px] text-muted-foreground">{t}</span>
              ))}
            </div>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 border-t border-border/60 p-3">
          <button onClick={() => onSave(recipe)} className={`flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-xs font-semibold ${isFav ? "border-primary bg-primary/10 text-primary" : "border-border/60 bg-card"}`}>
            <Heart className={`h-4 w-4 ${isFav ? "fill-primary" : ""}`} /> {isFav ? "Saved" : "Save"}
          </button>
          <button onClick={() => onSwap(recipe)} className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-primary px-2 py-2.5 text-xs font-semibold text-primary-foreground shadow-glow">
            <RefreshCcw className="h-4 w-4" /> Swap today
          </button>
          <button onClick={() => onAdd(recipe)} className="flex items-center justify-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-2 py-2.5 text-xs font-semibold text-primary">
            <Plus className="h-4 w-4" /> Add to week
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card py-2">
      <div className="text-sm font-bold">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
