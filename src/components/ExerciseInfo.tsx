import { useEffect, useState } from "react";
import { X, GraduationCap, Loader2, PlayCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Info = {
  name: string;
  instructions: string | null;
  primary_muscles: string[] | null;
  secondary_muscles: string[] | null;
  video_url: string | null;
} | null;

/**
 * "How do I do this?" — tap an exercise name mid-workout to learn it.
 * Pulls instructions, muscles, and demo video from the exercise library.
 * Fills the beginner gap competitors leave open: apps assume knowledge,
 * trainers teach. Zero AI cost.
 */
export function ExerciseInfo({ exercise, onClose }: { exercise: string; onClose: () => void }) {
  const [info, setInfo] = useState<Info | undefined>(undefined);

  useEffect(() => {
    supabase
      .from("exercises")
      .select("name, instructions, primary_muscles, secondary_muscles, video_url")
      .ilike("name", exercise)
      .maybeSingle()
      .then(({ data }) => setInfo(data ?? null));
  }, [exercise]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/85 backdrop-blur-md sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={`How to do ${exercise}`}
      onClick={onClose}
    >
      <div
        className="max-h-[80dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border/60 bg-gradient-card p-6 shadow-card sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
              <GraduationCap className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-bold">{exercise}</h2>
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full bg-surface"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {info === undefined ? (
          <div className="grid place-items-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : info === null ? (
          <p className="rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
            This one isn't in the library yet — ask Coach in chat and it'll walk you through the
            form step by step.
          </p>
        ) : (
          <>
            {(info.primary_muscles?.length || info.secondary_muscles?.length) && (
              <div className="mb-4 flex flex-wrap gap-1.5">
                {(info.primary_muscles ?? []).map((m) => (
                  <span
                    key={m}
                    className="rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-bold text-primary"
                  >
                    {m}
                  </span>
                ))}
                {(info.secondary_muscles ?? []).map((m) => (
                  <span
                    key={m}
                    className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-muted-foreground"
                  >
                    {m}
                  </span>
                ))}
              </div>
            )}
            {info.instructions ? (
              <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
                {info.instructions.split(/\n+/).map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No written cues for this one yet — ask Coach in chat for a walkthrough.
              </p>
            )}
            {info.video_url && (
              <a
                href={info.video_url}
                target="_blank"
                rel="noreferrer"
                className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-primary/40 py-2.5 text-sm font-semibold text-primary"
              >
                <PlayCircle className="h-4 w-4" /> Watch the demo
              </a>
            )}
          </>
        )}
      </div>
    </div>
  );
}
