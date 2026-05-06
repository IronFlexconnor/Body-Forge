import { createFileRoute } from "@tanstack/react-router";
import { Play, Video, Plus, Calendar } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/workouts")({
  head: () => ({ meta: [{ title: "Workouts — Body Forge" }] }),
  component: Workouts,
});

const week = [
  { day: "Mon", title: "Upper Push", done: true },
  { day: "Tue", title: "Lower Power", done: true },
  { day: "Wed", title: "Rest / Mobility", done: true },
  { day: "Thu", title: "Upper Pull", done: true },
  { day: "Fri", title: "Upper Push", done: false, today: true },
  { day: "Sat", title: "Lower Hypertrophy", done: false },
  { day: "Sun", title: "Rest", done: false },
];

const exercises = [
  { name: "Barbell Bench Press", sets: "4 × 6-8", rest: "2:30", rpe: "RPE 8" },
  { name: "Incline Dumbbell Press", sets: "3 × 8-10", rest: "2:00", rpe: "RPE 8" },
  { name: "Weighted Dips", sets: "3 × 8-12", rest: "2:00", rpe: "RPE 9" },
  { name: "Cable Lateral Raise", sets: "4 × 12-15", rest: "1:00", rpe: "RPE 9" },
  { name: "Overhead Tricep Extension", sets: "3 × 10-12", rest: "1:30", rpe: "RPE 8" },
  { name: "Cable Fly", sets: "3 × 12-15", rest: "1:00", rpe: "RPE 9" },
];

function Workouts() {
  return (
    <AppShell>
      <div className="px-5 pt-12">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Week 3 of 8 · Hypertrophy</p>
            <h1 className="text-2xl font-bold">Your Program</h1>
          </div>
          <Button size="icon" variant="outline" className="h-10 w-10 rounded-full border-border bg-surface">
            <Calendar className="h-4 w-4" />
          </Button>
        </div>

        {/* Week strip */}
        <div className="mb-6 -mx-5 overflow-x-auto px-5">
          <div className="flex gap-2 pb-2">
            {week.map((d) => (
              <div
                key={d.day}
                className={`min-w-[68px] flex-1 rounded-2xl border p-3 text-center ${
                  d.today
                    ? "border-primary bg-primary/15 shadow-glow"
                    : d.done
                    ? "border-border/60 bg-surface text-muted-foreground"
                    : "border-border/60 bg-surface"
                }`}
              >
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{d.day}</div>
                <div className="mt-2 text-xs font-semibold leading-tight">{d.title}</div>
                {d.done && <div className="mt-1 text-[10px] text-primary">✓ Done</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Today's workout detail */}
        <div className="mb-4 rounded-3xl border border-primary/20 bg-gradient-card p-5 shadow-card">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">Today · Friday</div>
          <h2 className="mb-1 text-xl font-bold">Upper Body — Push Focus</h2>
          <p className="mb-4 text-sm text-muted-foreground">6 exercises · 22 sets · ~50 min</p>
          <Button className="h-12 w-full rounded-xl bg-gradient-primary font-semibold text-primary-foreground shadow-glow">
            <Play className="mr-2 h-4 w-4 fill-current" /> Start workout
          </Button>
        </div>

        {/* Exercise list */}
        <h3 className="mb-3 text-lg font-semibold">Exercises</h3>
        <div className="space-y-2">
          {exercises.map((ex, i) => (
            <div key={ex.name} className="rounded-2xl border border-border/60 bg-gradient-card p-4 shadow-card">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-sm font-bold text-primary">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold leading-tight">{ex.name}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {ex.sets} · Rest {ex.rest} · {ex.rpe}
                  </div>
                </div>
                <button className="grid h-9 w-9 place-items-center rounded-lg bg-surface-elevated text-muted-foreground hover:text-primary">
                  <Video className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <Button variant="outline" className="mt-4 h-12 w-full rounded-xl border-dashed border-border bg-transparent">
          <Plus className="mr-2 h-4 w-4" /> Add exercise
        </Button>
      </div>
    </AppShell>
  );
}
