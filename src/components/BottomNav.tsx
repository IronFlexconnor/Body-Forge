import { Link, useLocation } from "@tanstack/react-router";
import { Home, Dumbbell, Apple, MessageCircle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

// Navigation v2 — Coach lives dead-center in the thumb zone as a raised
// action button, because talking to your coach is THE product. Around it:
// Today (plan), Train (do), Fuel (eat), Progress (results).
// Calendar/Library live inside Train; Profile lives in the TopBar avatar.
const left = [
  { to: "/", label: "Today", icon: Home },
  { to: "/workouts", label: "Train", icon: Dumbbell },
] as const;
const right = [
  { to: "/nutrition", label: "Fuel", icon: Apple },
  { to: "/progress", label: "Progress", icon: TrendingUp },
] as const;

function Tab({
  to,
  label,
  icon: Icon,
  active,
}: {
  to: string;
  label: string;
  icon: typeof Home;
  active: boolean;
}) {
  return (
    <li className="flex-1">
      <Link
        to={to}
        aria-label={label}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[11px] font-medium transition-colors",
          active ? "text-primary" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-xl transition-all",
            active && "bg-primary/15",
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
        </span>
        {label}
      </Link>
    </li>
  );
}

export function BottomNav() {
  const { pathname } = useLocation();
  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));
  const coachActive = pathname.startsWith("/chat");

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 inset-x-0 z-40 border-t border-border/60 bg-background/85 backdrop-blur-xl"
    >
      <ul className="mx-auto flex max-w-lg items-end justify-around px-2 pb-[env(safe-area-inset-bottom)] pt-1.5">
        {left.map((t) => (
          <Tab key={t.to} {...t} active={isActive(t.to)} />
        ))}

        {/* Coach — raised center action */}
        <li className="flex-1">
          <Link
            to="/chat"
            aria-label="Talk to Coach"
            aria-current={coachActive ? "page" : undefined}
            className="group flex flex-col items-center gap-0.5 text-[11px] font-semibold"
          >
            <span
              aria-hidden="true"
              className={cn(
                "-mt-6 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow ring-4 ring-background transition-transform group-active:scale-95",
                coachActive && "ring-primary/30",
              )}
            >
              <MessageCircle className="h-6 w-6" strokeWidth={2.4} />
            </span>
            <span
              className={
                coachActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              }
            >
              Coach
            </span>
          </Link>
        </li>

        {right.map((t) => (
          <Tab key={t.to} {...t} active={isActive(t.to)} />
        ))}
      </ul>
    </nav>
  );
}
