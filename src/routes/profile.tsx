import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Settings, Bell, Heart, Dumbbell, Apple, Shield, LogOut } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { loadOnboarding } from "@/lib/onboarding";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — Body Forge" }] }),
  component: Profile,
});

function Profile() {
  const navigate = useNavigate();
  const p = loadOnboarding();
  const name = p.name || "Athlete";

  return (
    <AppShell>
      <div className="px-5 pt-12">
        <h1 className="mb-6 text-2xl font-bold">Profile</h1>

        {/* Card */}
        <div className="mb-6 rounded-3xl border border-border/60 bg-gradient-card p-5 shadow-card">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-primary text-2xl font-bold text-primary-foreground shadow-glow">
              {name.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <div className="text-lg font-semibold">{name}</div>
              <div className="text-sm text-muted-foreground">
                {p.level || "—"} · {p.goal || "No goal set"}
              </div>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 divide-x divide-border/60 rounded-2xl bg-background/40 py-3 text-center">
            <Mini label="Age" value={p.age || "—"} />
            <Mini label="Weight" value={p.weight ? `${p.weight}kg` : "—"} />
            <Mini label="Height" value={p.height ? `${p.height}cm` : "—"} />
          </div>
        </div>

        <Section title="Training">
          <Row icon={Dumbbell} label="Current program" value="Upper/Lower · 8 wk" />
          <Row icon={Heart} label="Days per week" value={`${p.daysPerWeek ?? 4}`} />
        </Section>

        <Section title="Nutrition">
          <Row icon={Apple} label="Diet preference" value={p.diet || "Not set"} />
        </Section>

        <Section title="App">
          <Row icon={Bell} label="Notifications" value="On" />
          <Row icon={Settings} label="Preferences" value="" />
          <Row icon={Shield} label="Privacy & data" value="" />
        </Section>

        <Button
          variant="outline"
          onClick={() => {
            if (typeof window !== "undefined") {
              localStorage.removeItem("bodyforge:onboarded");
              localStorage.removeItem("bodyforge:onboarding");
            }
            navigate({ to: "/welcome" });
          }}
          className="mt-4 h-12 w-full rounded-xl border-border bg-surface text-destructive hover:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" /> Reset & restart
        </Button>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-muted-foreground">
          Body Forge AI is not medical advice. Always consult your physician before starting a new exercise or
          nutrition program.
        </p>
      </div>
    </AppShell>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-base font-bold tabular-nums">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-gradient-card shadow-card">{children}</div>
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: typeof Heart; label: string; value: string }) {
  return (
    <button className="flex w-full items-center gap-3 border-b border-border/40 px-4 py-3.5 text-left last:border-0 hover:bg-surface-elevated">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 text-sm font-medium">{label}</div>
      {value && <div className="text-sm text-muted-foreground">{value}</div>}
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}
