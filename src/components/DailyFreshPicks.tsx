import { useNavigate } from "@tanstack/react-router";
import { Play, Sparkles, ChevronRight } from "lucide-react";
import { thumbForRecipe } from "@/lib/mealVideos";

const PICKS = [
  { slug: "high-protein-chicken-bowl", title: "High-Protein Chicken Bowl", meal_type: "lunch", kcal: 540, p: 48, dietary_tags: ["high-protein"] },
  { slug: "tofu-buddha-bowl", title: "Tofu Buddha Bowl", meal_type: "lunch", kcal: 510, p: 32, dietary_tags: ["vegan", "plant-based"] },
  { slug: "freezer-egg-burritos", title: "Freezer Egg Burritos", meal_type: "breakfast", kcal: 420, p: 28, dietary_tags: ["high-protein", "freezer", "breakfast"] },
  { slug: "one-pot-beef-pasta", title: "One-Pot Beef Pasta", meal_type: "dinner", kcal: 620, p: 44, dietary_tags: ["high-protein", "one-pot"] },
  { slug: "salmon-quinoa-salad", title: "Salmon & Quinoa Salad", meal_type: "dinner", kcal: 560, p: 42, dietary_tags: ["high-protein", "fiber"] },
  { slug: "chickpea-tikka-bowl", title: "Chickpea Tikka Bowl", meal_type: "dinner", kcal: 480, p: 24, dietary_tags: ["vegetarian", "plant-based", "fiber"] },
];

export function DailyFreshPicks() {
  const navigate = useNavigate();
  const open = () => {
    if (typeof window !== "undefined") sessionStorage.setItem("forge:open-regen", "1");
    navigate({ to: "/nutrition" });
  };
  return (
    <div className="mb-6">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
            <Sparkles className="h-3 w-3" /> Daily Fresh Picks
          </div>
          <h3 className="mt-1.5 text-lg font-semibold leading-tight">Mouth-watering ideas, ready in minutes</h3>
        </div>
        <button onClick={open} className="flex shrink-0 items-center gap-0.5 text-sm font-medium text-primary">
          See all <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="-mx-5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ul className="flex gap-3 snap-x snap-mandatory">
          {PICKS.map((p) => {
            const thumb = thumbForRecipe(p);
            return (
              <li key={p.slug} className="snap-start shrink-0 w-[68%] sm:w-[46%]">
                <button
                  onClick={open}
                  className="group block w-full overflow-hidden rounded-2xl border border-border/60 bg-gradient-card text-left shadow-card transition hover:border-primary/50 active:scale-[0.98]"
                >
                  <div className="relative aspect-video overflow-hidden bg-muted">
                    <img
                      src={thumb}
                      alt={p.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                    <div className="absolute inset-0 grid place-items-center">
                      <span className="grid h-11 w-11 place-items-center rounded-full bg-white/90 text-foreground shadow-glow">
                        <Play className="h-5 w-5 fill-current" />
                      </span>
                    </div>
                    <div className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur">
                      {p.meal_type}
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="line-clamp-1 text-sm font-semibold">{p.title}</div>
                    <div className="mt-1 text-[11px] text-muted-foreground">{p.kcal} kcal · {p.p}g protein</div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
