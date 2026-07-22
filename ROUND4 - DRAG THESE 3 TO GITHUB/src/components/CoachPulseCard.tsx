import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { MessageCircle, X, ChevronRight, Camera, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

type Pulse = { message: string; cta?: "workout" | "meals" | "chat" | "none" | string };

/**
 * The coach speaks first: a short daily brief from Coach Forge at the top of
 * Home. Generated once per day (per user), cached server-side.
 */
export function CoachPulseCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const localDate = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in user's tz
        const { data, error } = await supabase.functions.invoke("coach-pulse", { body: { local_date: localDate } });
        if (!error && data?.message) setPulse(data as Pulse);
      } catch { /* silent — the card just doesn't show */ }
    })();
  }, [user]);

  if (!pulse || dismissed) return null;

  const cta =
    pulse.cta === "workout" ? { label: "Start today's session", icon: Play, onClick: () => navigate({ to: "/workouts" }) }
    : pulse.cta === "meals" ? {
        label: "Snap a meal", icon: Camera, onClick: () => {
          if (typeof window !== "undefined") sessionStorage.setItem("forge:open-snap", "1");
          navigate({ to: "/nutrition" });
        },
      }
    : pulse.cta === "chat" ? { label: "Talk it through", icon: MessageCircle, onClick: () => navigate({ to: "/chat" }) }
    : null;

  return (
    <div className="mb-5 overflow-hidden rounded-3xl border border-primary/30 bg-gradient-card shadow-card">
      <div className="relative p-4">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative flex items-start gap-3">
          <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow">
            <MessageCircle className="h-5 w-5" />
            <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-success ring-2 ring-background" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">Coach Forge · Today</div>
            <p className="text-sm leading-relaxed">{pulse.message}</p>
            {cta && (
              <button
                onClick={cta.onClick}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-glow active:scale-95"
              >
                <cta.icon className="h-3.5 w-3.5" /> {cta.label} <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <button onClick={() => setDismissed(true)} aria-label="Dismiss" className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
