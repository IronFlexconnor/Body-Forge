// Inline editor for the user's upcoming workouts. Lets them tweak
// exercises/sets/reps directly from Profile and saves to Supabase.
import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, ChevronDown, ChevronRight, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

type Exercise = { name: string; sets: number; reps: string; rest_sec?: number; rpe?: number; notes?: string };
type Workout = { id: string; title: string; scheduled_date: string | null; exercises: Exercise[] };

export function ProgramEditor() {
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    supabase.from("workouts").select("id, title, scheduled_date, exercises")
      .eq("user_id", user.id).gte("scheduled_date", today).neq("status", "completed")
      .order("scheduled_date", { ascending: true }).limit(10)
      .then(({ data }) => {
        setWorkouts((data ?? []) as Workout[]);
        setLoading(false);
        if (data?.length) setOpenId(data[0].id);
      });
  }, [user]);

  const updateEx = (wid: string, idx: number, key: keyof Exercise, val: string | number) => {
    setWorkouts((ws) => ws.map((w) => w.id !== wid ? w : {
      ...w,
      exercises: w.exercises.map((e, i) => i === idx ? { ...e, [key]: val } : e),
    }));
  };

  const addEx = (wid: string) => {
    setWorkouts((ws) => ws.map((w) => w.id !== wid ? w : {
      ...w,
      exercises: [...(w.exercises ?? []), { name: "New exercise", sets: 3, reps: "8-10", rest_sec: 90, rpe: 7 }],
    }));
  };

  const removeEx = (wid: string, idx: number) => {
    setWorkouts((ws) => ws.map((w) => w.id !== wid ? w : {
      ...w,
      exercises: w.exercises.filter((_, i) => i !== idx),
    }));
  };

  const save = async (w: Workout) => {
    setSavingId(w.id);
    const { error } = await supabase.from("workouts").update({ exercises: w.exercises }).eq("id", w.id);
    setSavingId(null);
    if (error) { toast.error("Could not save"); return; }
    toast.success("Program updated ✨ Coach has it");
    // log to coach so it sees the change
    await supabase.from("chat_messages").insert({
      user_id: user!.id, role: "user",
      content: `[Manual program edit] Updated ${w.title} (${w.scheduled_date}): ${w.exercises.map((e) => `${e.name} ${e.sets}×${e.reps}`).join(", ")}`,
    });
  };

  if (loading) return <div className="grid h-20 place-items-center"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>;
  if (!workouts.length) return <p className="px-1 text-xs text-muted-foreground">No upcoming sessions yet. Generate a program below.</p>;

  return (
    <div className="space-y-2">
      {workouts.map((w) => {
        const open = openId === w.id;
        return (
          <div key={w.id} className="overflow-hidden rounded-2xl border border-border/60 bg-background/50">
            <button
              onClick={() => setOpenId(open ? null : w.id)}
              className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-surface/60"
            >
              {open ? <ChevronDown className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{w.title}</div>
                <div className="text-[11px] text-muted-foreground">{w.scheduled_date} · {w.exercises?.length ?? 0} exercises</div>
              </div>
            </button>
            {open && (
              <div className="space-y-2 border-t border-border/40 p-3">
                {(w.exercises ?? []).map((ex, i) => (
                  <div key={i} className="rounded-lg border border-border/40 bg-surface/40 p-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={ex.name}
                        onChange={(e) => updateEx(w.id, i, "name", e.target.value)}
                        className="h-8 flex-1 text-xs font-semibold"
                      />
                      <button
                        onClick={() => removeEx(w.id, i)}
                        className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:text-destructive"
                        aria-label="Remove exercise"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <label className="text-[10px] text-muted-foreground">
                        Sets
                        <Input
                          inputMode="numeric"
                          value={ex.sets ?? ""}
                          onChange={(e) => updateEx(w.id, i, "sets", parseInt(e.target.value) || 0)}
                          className="mt-0.5 h-8 text-xs"
                        />
                      </label>
                      <label className="text-[10px] text-muted-foreground">
                        Reps
                        <Input
                          value={ex.reps ?? ""}
                          onChange={(e) => updateEx(w.id, i, "reps", e.target.value)}
                          className="mt-0.5 h-8 text-xs"
                          placeholder="8-10"
                        />
                      </label>
                      <label className="text-[10px] text-muted-foreground">
                        RPE
                        <Input
                          inputMode="decimal"
                          value={ex.rpe ?? ""}
                          onChange={(e) => updateEx(w.id, i, "rpe", parseFloat(e.target.value) || 0)}
                          className="mt-0.5 h-8 text-xs"
                          placeholder="7"
                        />
                      </label>
                    </div>
                  </div>
                ))}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => addEx(w.id)}
                    className="flex-1 rounded-lg border border-dashed border-border py-2 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary"
                  >
                    <Plus className="mr-1 inline h-3 w-3" /> Add exercise
                  </button>
                  <Button
                    onClick={() => save(w)}
                    disabled={savingId === w.id}
                    size="sm"
                    className="h-9 rounded-lg bg-gradient-primary text-xs font-semibold text-primary-foreground shadow-glow"
                  >
                    {savingId === w.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Save className="mr-1 h-3 w-3" />}
                    Save
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
