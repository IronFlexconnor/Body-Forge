import { useEffect, useMemo, useState } from "react";
import { Scale, Check, Loader2, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { type Units, kgToLb, lbToKg, weightLabel } from "@/lib/units";

type Entry = { value: number; recorded_at: string };

/**
 * Quick daily weigh-in. Stores kg in progress_metrics (metric_type "weight"),
 * mirrors the latest value onto profiles.weight, and shows a 30-day trend.
 * This series powers the adaptive-macros engine (weekly calorie auto-tuning).
 */
export function WeighInCard({ userId, units }: { userId: string; units: Units }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const refresh = async () => {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from("progress_metrics")
      .select("value, recorded_at")
      .eq("user_id", userId)
      .eq("metric_type", "weight")
      .gte("recorded_at", since)
      .order("recorded_at", { ascending: true });
    setEntries(((data ?? []) as Entry[]).filter((e) => Number.isFinite(Number(e.value))));
    setLoaded(true);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const todayKey = new Date().toISOString().slice(0, 10);
  const loggedToday = entries.some((e) => e.recorded_at.slice(0, 10) === todayKey);

  const display = (kg: number) => Math.round((units === "imperial" ? kgToLb(kg) : kg) * 10) / 10;

  // Weekly trend: average of last 7 days vs the 7 days before that.
  const trend = useMemo(() => {
    if (entries.length < 4) return null;
    const now = Date.now();
    const wk = 7 * 24 * 60 * 60 * 1000;
    const recent = entries.filter((e) => now - new Date(e.recorded_at).getTime() < wk);
    const prior = entries.filter((e) => {
      const age = now - new Date(e.recorded_at).getTime();
      return age >= wk && age < 2 * wk;
    });
    if (recent.length < 2 || prior.length < 2) return null;
    const avg = (xs: Entry[]) => xs.reduce((a, x) => a + Number(x.value), 0) / xs.length;
    return avg(recent) - avg(prior); // kg per week, negative = losing
  }, [entries]);

  const save = async () => {
    const n = parseFloat(input);
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("Enter a valid weight");
      return;
    }
    setBusy(true);
    const kg = units === "imperial" ? lbToKg(n) : n;
    const { error } = await supabase.from("progress_metrics").insert({
      user_id: userId,
      metric_type: "weight",
      value: Math.round(kg * 100) / 100,
      unit: "kg",
    });
    if (error) {
      toast.error("Couldn't save weigh-in");
    } else {
      // Keep profile weight in sync so the coach always sees the latest.
      await supabase
        .from("profiles")
        .update({ weight: Math.round(kg * 100) / 100 })
        .eq("user_id", userId);
      toast.success("Weigh-in logged");
      setInput("");
      refresh();
    }
    setBusy(false);
  };

  const latest = entries.length ? Number(entries[entries.length - 1].value) : null;

  // Sparkline over the 30-day window
  const spark = useMemo(() => {
    if (entries.length < 2) return null;
    const vals = entries.map((e) => Number(e.value));
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;
    const W = 120;
    const H = 32;
    const pts = vals
      .map(
        (v, i) =>
          `${((i / (vals.length - 1)) * W).toFixed(1)},${(H - 4 - ((v - min) / range) * (H - 8)).toFixed(1)}`,
      )
      .join(" ");
    return { pts, W, H };
  }, [entries]);

  const TrendIcon =
    trend == null ? Minus : trend < -0.05 ? TrendingDown : trend > 0.05 ? TrendingUp : Minus;
  const trendLabel =
    trend == null
      ? "Log a few weigh-ins to unlock your trend"
      : `${trend > 0 ? "+" : ""}${display(trend)} ${weightLabel(units)}/week`;

  return (
    <div className="mb-6 rounded-3xl border border-primary/20 bg-gradient-card p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-primary text-primary-foreground">
            <Scale className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold leading-tight">Body weight</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendIcon aria-hidden="true" className="h-3 w-3" />
              {trendLabel}
            </div>
          </div>
        </div>
        {latest != null && (
          <div className="text-right">
            <div className="text-xl font-bold tabular-nums leading-tight">
              {display(latest)}
              <span className="ml-1 text-xs font-medium text-muted-foreground">
                {weightLabel(units)}
              </span>
            </div>
            {spark && (
              <svg
                viewBox={`0 0 ${spark.W} ${spark.H}`}
                className="mt-0.5 h-6 w-24"
                aria-label="30-day weight trend"
              >
                <polyline
                  points={spark.pts}
                  fill="none"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="stroke-primary"
                />
              </svg>
            )}
          </div>
        )}
      </div>

      {loaded && !loggedToday ? (
        <div className="flex gap-2">
          <Input
            inputMode="decimal"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Today's weight (${weightLabel(units)})`}
            className="h-11 flex-1"
            aria-label={`Today's weight in ${weightLabel(units)}`}
            onKeyDown={(e) => e.key === "Enter" && save()}
          />
          <Button
            onClick={save}
            disabled={busy || !input}
            className="h-11 rounded-xl bg-gradient-primary px-4 font-semibold text-primary-foreground shadow-glow"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          </Button>
        </div>
      ) : loaded ? (
        <div className="rounded-xl bg-primary/10 px-3 py-2 text-center text-xs font-medium text-primary">
          Logged for today — consistency is what makes your coach smarter 📈
        </div>
      ) : null}
    </div>
  );
}
