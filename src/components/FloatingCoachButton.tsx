import { Link, useLocation } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";

const HIDE_ON = ["/welcome", "/auth", "/onboarding", "/chat"];

export function FloatingCoachButton() {
  const { pathname } = useLocation();
  if (HIDE_ON.some((p) => pathname.startsWith(p))) return null;

  return (
    <Link
      to="/chat"
      aria-label="Talk to Coach"
      className="fixed bottom-24 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow hover:scale-105 active:scale-95 transition-transform"
    >
      <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping" />
      <MessageCircle className="relative h-6 w-6" strokeWidth={2.4} />
      <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-success ring-2 ring-background" />
    </Link>
  );
}
