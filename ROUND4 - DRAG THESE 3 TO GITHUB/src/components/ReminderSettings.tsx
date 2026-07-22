import { useEffect, useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { enablePush, disablePush, hasActiveSubscription, pushSupported } from "@/lib/push";
import { toast } from "sonner";

type Prefs = {
  workout?: boolean;
  workout_hour?: number;
  streak?: boolean;
  meals?: boolean;
  tz?: string;
};

const HOURS = [6, 7, 8, 9, 12, 15, 16, 17, 18, 19, 20];

/** Coach reminders card for the Profile page. */
export function ReminderSettings() {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>({});
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: profile }, subscribed] = await Promise.all([
        supabase.from("profiles").select("notification_prefs").eq("user_id", user.id).maybeSingle(),
        hasActiveSubscription(),
      ]);
      setPrefs((profile?.notification_prefs as Prefs) ?? {});
      setEnabled(subscribed);
      setReady(true);
    })();
  }, [user]);

  const savePrefs = async (next: Prefs) => {
    setPrefs(next);
    if (!user) return;
    const tz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined;
    await supabase.from("profiles").update({ notification_prefs: { ...next, tz } }).eq("user_id", user.id);
  };

  const toggle = async (on: boolean) => {
    setBusy(true);
    try {
      if (on) {
        const res = await enablePush();
        if (!res.ok) {
          toast.error(res.error ?? "Couldn't enable notifications");
          setEnabled(false);
          return;
        }
        setEnabled(true);
        await savePrefs({ workout: true, streak: true, meals: true, workout_hour: prefs.workout_hour ?? 17, ...prefs });
        toast.success("Coach reminders are on 🔔");
      } else {
        await disablePush();
        setEnabled(false);
        toast.success("Reminders turned off");
      }
    } finally {
      setBusy(false);
    }
  };

  if (!ready) return null;

  return (
    <div className="mb-6 rounded-3xl border border-border/60 bg-gradient-card p-5 shadow-card">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Bell className="h-5 w-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold">Coach reminders</div>
          <p className="text-xs text-muted-foreground">
            {pushSupported() ? "Workout nudges, streak alerts, meal check-ins" : "On iPhone: add to Home Screen to enable"}
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={toggle} disabled={busy || !pushSupported()} aria-label="Enable coach reminders" />
      </div>

      {enabled && (
        <div className="mt-4 space-y-3 border-t border-border/60 pt-4">
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>Workout reminder</span>
            <span className="flex items-center gap-2">
              <select
                value={prefs.workout_hour ?? 17}
                onChange={(e) => savePrefs({ ...prefs, workout_hour: Number(e.target.value) })}
                disabled={prefs.workout === false}
                className="rounded-lg border border-border/60 bg-surface px-2 py-1 text-xs"
                aria-label="Workout reminder time"
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>{h === 12 ? "12 pm" : h < 12 ? `${h} am` : `${h - 12} pm`}</option>
                ))}
              </select>
              <Switch checked={prefs.workout !== false} onCheckedChange={(v) => savePrefs({ ...prefs, workout: v })} aria-label="Workout reminders" />
            </span>
          </label>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>Streak protection alerts</span>
            <Switch checked={prefs.streak !== false} onCheckedChange={(v) => savePrefs({ ...prefs, streak: v })} aria-label="Streak alerts" />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>Meal logging nudges</span>
            <Switch checked={prefs.meals !== false} onCheckedChange={(v) => savePrefs({ ...prefs, meals: v })} aria-label="Meal nudges" />
          </label>
        </div>
      )}
    </div>
  );
}
