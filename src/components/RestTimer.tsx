import { useEffect, useRef, useState } from "react";
import { Plus, X, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Floating rest timer shown after a set is marked done.
 * Controlled by the parent: pass a new `startKey` + `seconds` to (re)start.
 * Vibrates on finish (when supported) and auto-dismisses shortly after.
 */
export function RestTimer({
  startKey,
  seconds,
  exercise,
  onDismiss,
}: {
  /** change this value to restart the timer (e.g. increment per completed set) */
  startKey: number;
  seconds: number;
  exercise: string | null;
  onDismiss: () => void;
}) {
  const [remaining, setRemaining] = useState(seconds);
  const [total, setTotal] = useState(seconds);
  const endRef = useRef<number>(0);
  const doneRef = useRef(false);

  useEffect(() => {
    if (startKey <= 0) return;
    doneRef.current = false;
    setTotal(seconds);
    setRemaining(seconds);
    endRef.current = Date.now() + seconds * 1000;
    const id = setInterval(() => {
      const left = Math.max(0, Math.round((endRef.current - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0 && !doneRef.current) {
        doneRef.current = true;
        try {
          navigator.vibrate?.([200, 100, 200]);
        } catch {
          /* not supported */
        }
        setTimeout(onDismiss, 2500);
      }
    }, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startKey]);

  if (startKey <= 0) return null;

  const addThirty = () => {
    endRef.current += 30_000;
    doneRef.current = false;
    setTotal((t) => t + 30);
    setRemaining(Math.max(0, Math.round((endRef.current - Date.now()) / 1000)));
  };

  const pct = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;
  const mm = Math.floor(remaining / 60);
  const ss = String(remaining % 60).padStart(2, "0");
  const finished = remaining <= 0;

  // SVG progress ring
  const R = 18;
  const C = 2 * Math.PI * R;

  return (
    <div
      role="timer"
      aria-live="polite"
      aria-label={`Rest timer: ${mm}:${ss} remaining`}
      className="fixed inset-x-4 bottom-[5.5rem] z-30 mx-auto max-w-lg"
    >
      <div
        className={cn(
          "flex items-center gap-3 rounded-2xl border bg-background/95 px-4 py-3 shadow-card backdrop-blur-xl transition-colors",
          finished ? "border-primary bg-primary/10" : "border-border/60",
        )}
      >
        <div className="relative grid h-11 w-11 shrink-0 place-items-center">
          <svg viewBox="0 0 44 44" className="absolute inset-0 -rotate-90" aria-hidden="true">
            <circle
              cx="22"
              cy="22"
              r={R}
              fill="none"
              strokeWidth="4"
              className="stroke-border/60"
            />
            <circle
              cx="22"
              cy="22"
              r={R}
              fill="none"
              strokeWidth="4"
              strokeLinecap="round"
              className="stroke-primary transition-[stroke-dashoffset] duration-300"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - pct)}
            />
          </svg>
          <Timer aria-hidden="true" className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {finished ? "Rest done — go!" : "Resting"}
            {exercise ? ` · ${exercise}` : ""}
          </div>
          <div
            className={cn(
              "text-xl font-bold tabular-nums leading-tight",
              finished && "text-primary",
            )}
          >
            {mm}:{ss}
          </div>
        </div>
        {!finished && (
          <button
            onClick={addThirty}
            className="flex items-center gap-1 rounded-full border border-border/60 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-primary hover:text-primary"
            aria-label="Add 30 seconds of rest"
          >
            <Plus aria-hidden="true" className="h-3 w-3" /> 30s
          </button>
        )}
        <button
          onClick={onDismiss}
          className="grid h-8 w-8 place-items-center rounded-full bg-surface text-muted-foreground hover:text-foreground"
          aria-label={finished ? "Dismiss rest timer" : "Skip rest"}
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
