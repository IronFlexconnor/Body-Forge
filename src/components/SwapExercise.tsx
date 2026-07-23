import { useEffect, useState } from "react";
import { X, Repeat, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Alt = { name: string; equipment: string[] | null; overlap: number };

/**
 * "Machine's taken" — instant exercise substitution mid-workout.
 * Pure logic, zero AI cost: ranks the library by shared primary muscles
 * with the current exercise and offers the best alternatives in one tap.
 */
export function SwapExercise({
  exercise,
  onSwap,
  onClose,
}: {
  exercise: string;
  onSwap: (newName: string) => void;
  onClose: () => void;
}) {
  const [alts, setAlts] = useState<Alt[] | null>(null);

  useEffect(() => {
    (async () => {
      const { data: current } = await supabase
        .from("exercises")
        .select("name, primary_muscles")
        .ilike("name", exercise)
        .maybeSingle();
      const muscles: string[] = current?.primary_muscles ?? [];
      if (!muscles.length) {
        // Unknown exercise — fall back to a same-word search (e.g. "Press")
        const key = exercise.split(" ").pop() ?? exercise;
        const { data } = await supabase
          .from("exercises")
          .select("name, equipment")
          .ilike("name", `%${key}%`)
          .neq("name", exercise)
          .limit(6);
        setAlts((data ?? []).map((d) => ({ name: d.name, equipment: d.equipment, overlap: 0 })));
        return;
      }
      const { data } = await supabase
        .from("exercises")
        .select("name, equipment, primary_muscles")
        .overlaps("primary_muscles", muscles)
        .neq("name", current?.name ?? exercise)
        .limit(30);
      const ranked = (data ?? [])
        .map((d) => ({
          name: d.name,
          equipment: d.equipment,
          overlap: (d.primary_muscles ?? []).filter((m: string) => muscles.includes(m)).length,
        }))
        .sort((a, b) => b.overlap - a.overlap)
        .slice(0, 6);
      setAlts(ranked);
    })();
  }, [exercise]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/85 backdrop-blur-md sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Swap ${exercise}`}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl border border-border/60 bg-gradient-card p-6 shadow-card sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
              <Repeat className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-bold">Swap {exercise}</h2>
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full bg-surface"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Machine's taken? These hit the same muscles — your sets log under the new movement.
        </p>

        {alts === null ? (
          <div className="grid place-items-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : alts.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border/60 p-4 text-center text-sm text-muted-foreground">
            No close match in the library — ask Coach in chat for a substitute.
          </p>
        ) : (
          <div className="space-y-2">
            {alts.map((a) => (
              <button
                key={a.name}
                onClick={() => onSwap(a.name)}
                className="flex w-full items-center justify-between rounded-2xl border border-border/60 bg-surface px-4 py-3 text-left transition-colors hover:border-primary"
              >
                <span className="font-semibold">{a.name}</span>
                <span className="text-[11px] text-muted-foreground">
                  {(a.equipment ?? []).slice(0, 2).join(" · ") || "any equipment"}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
