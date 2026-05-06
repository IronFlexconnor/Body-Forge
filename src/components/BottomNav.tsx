import { Link, useLocation } from "@tanstack/react-router";
import { Home, Dumbbell, MessageCircle, TrendingUp, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Home", icon: Home },
  { to: "/workouts", label: "Workouts", icon: Dumbbell },
  { to: "/chat", label: "Coach", icon: MessageCircle },
  { to: "/progress", label: "Progress", icon: TrendingUp },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border/60 bg-background/80 backdrop-blur-xl">
      <ul className="mx-auto flex max-w-lg items-center justify-around px-2 pb-[env(safe-area-inset-bottom)] pt-2">
        {items.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl transition-all",
                    active && "bg-primary/15 shadow-glow"
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
