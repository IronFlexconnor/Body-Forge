import { Link, useLocation } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";

// Hidden where it would collide with a screen's own fixed controls
// (workout session finish bar, form recorder) or where it's redundant (chat).
const HIDE_ON = ["/welcome", "/auth", "/onboarding", "/chat", "/workouts", "/form"];

export function FloatingCoachButton() {
  const { pathname } = useLocation();
  if (HIDE_ON.some((p) => pathname.startsWith(p))) return null;

  return (
    <Link
      to="/chat"
      aria-label="Talk to Coach"
      className="group fixed bottom-24 right-5 z-40 flex items-center gap-2"
    >
      <span className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-background/80 px-3 py-1.5 text-xs font-semibold text-foreground shadow-card backdrop-blur-xl">
        <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
        Ask Coach
      </span>
      <span className="relative grid h-16 w-16 place-items-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow transition-transform group-hover:scale-105 group-active:scale-95">
        <span className="absolute inset-0 rounded-full bg-primary/50 animate-ping" />
        <span className="absolute -inset-1 rounded-full bg-primary/20 blur-md" />
        <MessageCircle className="relative h-7 w-7" strokeWidth={2.4} />
        <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-success ring-2 ring-background" />
      </span>
    </Link>
  );
}
