import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { computeWeekStreak } from "@/lib/streak";

// Session-scoped cache so switching tabs doesn't refetch on every screen.
let cached: { userId: string; name: string; streak: number; at: number } | null = null;
const TTL_MS = 5 * 60 * 1000;

/**
 * Global identity bar shown on every in-app screen:
 * brand on the left; week streak + profile avatar on the right.
 * Keeps the user's identity, results, and settings one tap away everywhere.
 */
export function TopBar() {
  const { user } = useAuth();
  const [name, setName] = useState<string>("");
  const [streak, setStreak] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    if (cached && cached.userId === user.id && Date.now() - cached.at < TTL_MS) {
      setName(cached.name);
      setStreak(cached.streak);
      return;
    }
    (async () => {
      const [{ data: p }, { data: logs }] = await Promise.all([
        supabase.from("profiles").select("name").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("workout_logs")
          .select("started_at")
          .eq("user_id", user.id)
          .order("started_at", { ascending: false })
          .limit(400),
      ]);
      const n = p?.name ?? "";
      const s = computeWeekStreak(logs ?? []);
      cached = { userId: user.id, name: n, streak: s, at: Date.now() };
      setName(n);
      setStreak(s);
    })();
  }, [user]);

  const initial = (name || "A").slice(0, 1).toUpperCase();

  return (
    <header className="sticky top-0 z-30 border-b border-border/50 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-5">
        <Link to="/" aria-label="Home" className="flex items-center gap-2">
          <BrandMark size={28} />
          <span className="font-display text-[15px] font-extrabold tracking-tight">Body Forge</span>
        </Link>
        <div className="flex items-center gap-2">
          {streak != null && streak > 0 && (
            <Link
              to="/progress"
              aria-label={`${streak} week training streak — view progress`}
              className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary"
            >
              <Flame className="h-3.5 w-3.5" aria-hidden="true" />
              {streak}w
            </Link>
          )}
          <Link
            to="/profile"
            aria-label="Profile and settings"
            className="grid h-9 w-9 place-items-center rounded-full bg-gradient-primary text-sm font-bold text-primary-foreground shadow-glow transition-transform active:scale-95"
          >
            {initial}
          </Link>
        </div>
      </div>
    </header>
  );
}
