import { createFileRoute } from "@tanstack/react-router";
import { TrendingUp, Award, Flame, Activity, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/progress")({
  head: () => ({ meta: [{ title: "Progress — Body Forge" }] }),
  component: Progress,
});

const lifts = [
  { name: "Bench Press", current: "82.5kg", change: "+5kg", trend: [50, 55, 60, 65, 70, 75, 80, 82.5] },
  { name: "Back Squat", current: "120kg", change: "+10kg", trend: [80, 90, 95, 100, 105, 110, 115, 120] },
  { name: "Deadlift", current: "150kg", change: "+12.5kg", trend: [100, 110, 120, 125, 130, 140, 145, 150] },
];

function Progress() {
  return (
    <AppShell>
      <div className="px-5 pt-12">
        <h1 className="mb-1 text-2xl font-bold">Progress</h1>
        <p className="mb-6 text-sm text-muted-foreground">Last 8 weeks</p>

        {/* Top stats */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          <BigStat icon={Flame} value="34" label="Workouts" sub="92% adherence" />
          <BigStat icon={Award} value="12" label="PRs hit" sub="In 8 weeks" />
          <BigStat icon={Activity} value="156k" label="Total volume" sub="kg lifted" />
          <BigStat icon={TrendingUp} value="-3.2kg" label="Body weight" sub="On track" />
        </div>

        {/* AI Weekly review */}
        <div className="mb-6 rounded-3xl border border-primary/20 bg-gradient-card p-5 shadow-card">
          <div className="mb-3 flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-primary">AI Weekly Review</div>
              <div className="text-xs text-muted-foreground">Generated this morning</div>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-foreground/90">
            Strong week — bench press up <span className="font-semibold text-primary">5kg</span> and recovery scores
            stayed above 80%. Your push volume is climbing nicely. Next week we'll deload lower body slightly to keep
            squats progressing without fatigue spillover. Keep protein at <span className="font-semibold">160g+</span>.
          </p>
        </div>

        {/* Lift trends */}
        <h2 className="mb-3 text-lg font-semibold">Strength trends</h2>
        <div className="space-y-3">
          {lifts.map((lift) => (
            <div key={lift.name} className="rounded-2xl border border-border/60 bg-gradient-card p-4 shadow-card">
              <div className="mb-3 flex items-baseline justify-between">
                <div>
                  <div className="font-semibold">{lift.name}</div>
                  <div className="text-2xl font-bold tabular-nums">{lift.current}</div>
                </div>
                <div className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary">
                  ↑ {lift.change}
                </div>
              </div>
              <Sparkline data={lift.trend} />
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function BigStat({
  icon: Icon, value, label, sub,
}: { icon: typeof Flame; value: string; label: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-gradient-card p-4 shadow-card">
      <Icon className="mb-2 h-4 w-4 text-primary" />
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs font-medium">{label}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 280;
  const h = 50;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");
  const area = `0,${h} ${pts} ${w},${h}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-12 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.78 0.17 165)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="oklch(0.78 0.17 165)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#sparkFill)" />
      <polyline points={pts} fill="none" stroke="oklch(0.78 0.17 165)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
