import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  Flame, Play, MessageCircle, TrendingUp, Activity, Heart, Zap, ChevronRight, CheckCircle2,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { isOnboarded, loadOnboarding } from "@/lib/onboarding";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Today — Body Forge AI Coach" },
      { name: "description", content: "Your daily training plan, AI coach, and progress at a glance." },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  useEffect(() => {
    if (!isOnboarded()) navigate({ to: "/welcome" });
  }, [navigate]);

  const profile = loadOnboarding();
  const name = profile.name || "Athlete";

  return (
    <AppShell>
      <div className="px-5 pt-12">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Good to see you,</p>
            <h1 className="text-2xl font-bold">{name} 👋</h1>
          </div>
          <Link to="/profile" className="grid h-11 w-11 place-items-center rounded-full bg-gradient-primary text-base font-bold text-primary-foreground shadow-glow">
            {name.slice(0, 1).toUpperCase()}
          </Link>
        </div>

        {/* Readiness */}
        <div className="mb-5 flex gap-3">
          <Stat icon={Heart} value="86" label="Readiness" tone="primary" />
          <Stat icon={Flame} value="12" label="Day streak" tone="warning" />
          <Stat icon={Activity} value="4/5" label="This week" tone="default" />
        </div>

        {/* Today's workout — hero card */}
        <Link
          to="/workouts"
          className="group relative mb-6 block overflow-hidden rounded-3xl border border-primary/20 bg-gradient-card p-6 shadow-card"
        >
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
              <Zap className="h-3 w-3" /> Today's Session
            </div>
            <h2 className="mb-1 text-2xl font-bold">Upper Body — Push Focus</h2>
            <p className="mb-5 text-sm text-muted-foreground">6 exercises · ~{profile.sessionLength ?? 45} min · Hypertrophy block</p>

            <div className="mb-5 grid grid-cols-3 gap-2 text-center">
              <MiniStat label="Volume" value="12.4k" />
              <MiniStat label="Sets" value="22" />
              <MiniStat label="Intensity" value="RPE 7" />
            </div>

            <Button className="h-12 w-full rounded-xl bg-gradient-primary text-sm font-semibold text-primary-foreground shadow-glow group-hover:opacity-95">
              <Play className="mr-2 h-4 w-4 fill-current" />
              Start workout
            </Button>
          </div>
        </Link>

        {/* AI Coach widget */}
        <Link
          to="/chat"
          className="mb-6 flex items-center gap-4 rounded-2xl border border-border/60 bg-gradient-card p-4 shadow-card transition-all hover:border-primary/40"
        >
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Coach Forge</span>
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            </div>
            <p className="truncate text-sm text-muted-foreground">
              Ready when you are — ask me anything about today's plan.
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </Link>

        {/* Progress snapshot */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">This week</h3>
          <Link to="/progress" className="text-sm font-medium text-primary">See all</Link>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3">
          <ProgressCard icon={TrendingUp} title="Bench Press" value="+5kg" sub="vs last 4 weeks" />
          <ProgressCard icon={Activity} title="Avg RPE" value="7.2" sub="On target" />
        </div>

        {/* Habits */}
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Daily habits</h3>
          <span className="text-sm text-muted-foreground">3 / 4</span>
        </div>
        <div className="space-y-2">
          {[
            { label: "Hit protein target (160g)", done: true },
            { label: "8 glasses of water", done: true },
            { label: "Mobility (10 min)", done: true },
            { label: "Sleep 7+ hours", done: false },
          ].map((h) => (
            <div
              key={h.label}
              className={cn(
                "flex items-center gap-3 rounded-xl border bg-gradient-card px-4 py-3 transition-colors",
                h.done ? "border-primary/30" : "border-border/60"
              )}
            >
              <CheckCircle2
                className={cn("h-5 w-5", h.done ? "text-primary fill-primary/20" : "text-muted-foreground")}
              />
              <span className={cn("text-sm font-medium", h.done && "line-through text-muted-foreground")}>
                {h.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function Stat({
  icon: Icon, value, label, tone,
}: { icon: typeof Heart; value: string; label: string; tone: "primary" | "warning" | "default" }) {
  return (
    <div className="flex-1 rounded-2xl border border-border/60 bg-gradient-card p-3 shadow-card">
      <Icon
        className={cn(
          "mb-1.5 h-4 w-4",
          tone === "primary" && "text-primary",
          tone === "warning" && "text-[oklch(0.82_0.16_75)]",
          tone === "default" && "text-muted-foreground"
        )}
      />
      <div className="text-lg font-bold tabular-nums leading-none">{value}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-background/40 py-2.5">
      <div className="text-base font-bold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function ProgressCard({ icon: Icon, title, value, sub }: { icon: typeof TrendingUp; title: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-gradient-card p-4 shadow-card">
      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {title}
      </div>
      <div className="text-2xl font-bold text-gradient-primary">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}
