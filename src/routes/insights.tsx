import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, Loader2, Wand2, Check, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { loadInsights, type InsightCard } from "@/components/InsightsCarousel";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { celebrate } from "@/lib/celebrate";

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { title: "Insights — Body Forge AI Coach" },
      { name: "description", content: "Bite-sized daily insights from the latest health & fitness science." },
    ],
  }),
  component: InsightsPage,
});

const CATEGORY_COLORS: Record<string, string> = {
  recovery: "from-cyan-500/20 to-emerald-500/10",
  training: "from-emerald-500/25 to-teal-500/10",
  nutrition: "from-amber-500/20 to-emerald-500/10",
  supplements: "from-violet-500/20 to-emerald-500/10",
  sleep: "from-indigo-500/25 to-emerald-500/10",
  mindset: "from-rose-500/20 to-emerald-500/10",
  performance: "from-emerald-500/30 to-cyan-500/10",
};

function InsightsPage() {
  const [cards, setCards] = useState<InsightCard[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [appliedIdx, setAppliedIdx] = useState<Set<number>>(new Set());
  const [busyIdx, setBusyIdx] = useState<number | null>(null);

  useEffect(() => { loadInsights().then(setCards).catch(() => setCards([])); }, []);

  const refresh = async () => {
    setRefreshing(true);
    const fresh = await loadInsights(true);
    setCards(fresh);
    setRefreshing(false);
  };

  const apply = async (c: InsightCard, idx: number) => {
    setBusyIdx(idx);
    try {
      const user_request = `Apply this insight to my plan: "${c.headline}". Action: ${c.apply_action}. Make a small, smart adjustment now.`;
      const { data, error } = await supabase.functions.invoke("auto-adjust", {
        body: { trigger: "insight", auto_apply: true, user_request },
      });
      if (error) throw error;
      const d = data as any;
      if (d?.summary) toast.success(`Plan tuned — ${d.summary}`);
      else toast.success("Coach applied this insight to your plan");
      celebrate();
      setAppliedIdx((s) => new Set(s).add(idx));
    } catch (e: any) {
      toast.error(e?.message ?? "Could not apply right now");
    } finally {
      setBusyIdx(null);
    }
  };

  return (
    <AppShell>
      <div className="px-5 pt-12">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
              <Sparkles className="h-3 w-3" /> Fresh today
            </div>
            <h1 className="mt-1.5 text-2xl font-bold leading-tight">Latest Insights</h1>
            <p className="text-sm text-muted-foreground">Curated by Coach from the newest health & fitness science.</p>
          </div>
          <button
            onClick={refresh}
            disabled={refreshing}
            className="grid h-10 w-10 place-items-center rounded-full border border-border/60 bg-gradient-card text-muted-foreground shadow-card hover:border-primary/40"
            aria-label="Refresh"
          >
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </button>
        </div>

        {!cards ? (
          <div className="grid h-40 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : cards.length === 0 ? (
          <div className="rounded-2xl border border-border/60 bg-gradient-card p-6 text-center shadow-card">
            <p className="text-sm text-muted-foreground">Coach is brewing today's insights. Tap refresh in a moment.</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {cards.map((c, i) => {
              const grad = CATEGORY_COLORS[c.category] ?? "from-primary/20 to-primary/5";
              const applied = appliedIdx.has(i);
              return (
                <li key={i} className={`relative overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-br ${grad} p-5 shadow-card animate-fade-in`}>
                  <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 rounded-full bg-background/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary backdrop-blur">
                        {c.emoji} {c.category}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{c.read_minutes} min read</span>
                    </div>
                    <h2 className="mt-3 text-xl font-bold leading-tight">{c.headline}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-foreground/90">{c.summary}</p>
                    <div className="mt-3 rounded-2xl border border-border/40 bg-background/60 p-3 text-sm leading-relaxed">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-primary">Why it matters for you</div>
                      <p className="mt-0.5 text-foreground/90">{c.why_it_matters}</p>
                    </div>
                    <Button
                      onClick={() => apply(c, i)}
                      disabled={busyIdx === i || applied}
                      className="mt-4 h-11 w-full rounded-xl bg-gradient-primary font-semibold text-primary-foreground shadow-glow"
                    >
                      {applied ? <><Check className="mr-2 h-4 w-4" /> Applied to your plan</>
                        : busyIdx === i ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Applying…</>
                        : <><Wand2 className="mr-2 h-4 w-4" /> Apply to my plan</>}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
