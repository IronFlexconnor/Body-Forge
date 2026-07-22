// Scheduled reminder sender (run hourly via cron). For every user with a push
// subscription, checks their LOCAL time and sends at most one relevant nudge:
//  - workout reminder at their chosen hour when today's session isn't done
//  - streak-protection alert Friday 6pm local when the week has 0 workouts
//  - meal-logging nudge at 2pm local when nothing's been logged all day
// Invoke with the service-role key (or x-cron-secret matching CRON_SECRET).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import webpush from "npm:web-push@3.6.7";

function localParts(tz: string): { hour: number; weekday: number; date: string } {
  try {
    const now = new Date();
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz, hour: "numeric", hour12: false,
      year: "numeric", month: "2-digit", day: "2-digit", weekday: "short",
    });
    const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
    const weekdays: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return {
      hour: Number(parts.hour === "24" ? 0 : parts.hour),
      weekday: weekdays[parts.weekday as string] ?? 0,
      date: `${parts.year}-${parts.month}-${parts.day}`,
    };
  } catch {
    const now = new Date();
    return { hour: now.getUTCHours(), weekday: now.getUTCDay(), date: now.toISOString().slice(0, 10) };
  }
}

Deno.serve(async (req) => {
  try {
    // Auth: service-role bearer or cron secret
    const authHeader = req.headers.get("Authorization") ?? "";
    const cronSecret = req.headers.get("x-cron-secret") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const expectedSecret = Deno.env.get("CRON_SECRET") ?? "";
    const authorized =
      (serviceKey && authHeader === `Bearer ${serviceKey}`) ||
      (expectedSecret && cronSecret === expectedSecret);
    if (!authorized) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
    if (!vapidPublic || !vapidPrivate) {
      return new Response(JSON.stringify({ error: "VAPID keys not configured" }), { status: 500 });
    }
    webpush.setVapidDetails("mailto:ironflexconnor@gmail.com", vapidPublic, vapidPrivate);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey, { auth: { persistSession: false } });

    const { data: subs } = await admin.from("push_subscriptions").select("id, user_id, endpoint, p256dh, auth");
    if (!subs?.length) return new Response(JSON.stringify({ sent: 0, reason: "no subscriptions" }), { headers: { "Content-Type": "application/json" } });

    // Group subscriptions per user
    const byUser = new Map<string, typeof subs>();
    for (const s of subs) {
      const list = byUser.get(s.user_id) ?? [];
      list.push(s);
      byUser.set(s.user_id, list);
    }

    const userIds = [...byUser.keys()];
    const { data: profiles } = await admin.from("profiles")
      .select("user_id, name, notification_prefs, days_per_week")
      .in("user_id", userIds);
    // deno-lint-ignore no-explicit-any
    const profileMap = new Map<string, any>(((profiles ?? []) as any[]).map((p) => [p.user_id, p]));

    let sent = 0, pruned = 0;

    for (const userId of userIds) {
      const profile = profileMap.get(userId);
      const prefs = (profile?.notification_prefs ?? {}) as Record<string, unknown>;
      const tz = typeof prefs.tz === "string" && prefs.tz ? (prefs.tz as string) : "America/New_York";
      const { hour, weekday, date } = localParts(tz);
      const name = (profile?.name as string) || "";

      let payload: { title: string; body: string; url: string } | null = null;

      // 1) Workout reminder at chosen local hour
      const workoutHour = typeof prefs.workout_hour === "number" ? (prefs.workout_hour as number) : 17;
      if (prefs.workout !== false && hour === workoutHour) {
        const { data: todayWorkout } = await admin.from("workouts")
          .select("title").eq("user_id", userId).eq("scheduled_date", date).neq("status", "completed").limit(1).maybeSingle();
        if (todayWorkout) {
          payload = {
            title: "Time to train 💪",
            body: `${name ? name + ", " : ""}${todayWorkout.title} is waiting. Even 30 focused minutes counts.`,
            url: "/workouts",
          };
        }
      }

      // 2) Streak protection — Friday 6pm local, zero sessions this week
      if (!payload && prefs.streak !== false && weekday === 5 && hour === 18) {
        const weekStart = new Date(`${date}T00:00:00`);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const { count } = await admin.from("workout_logs")
          .select("*", { count: "exact", head: true }).eq("user_id", userId).gte("started_at", weekStart.toISOString());
        if ((count ?? 0) === 0) {
          payload = {
            title: "Your streak is on the line 🔥",
            body: `${name ? name + " — " : ""}one session this weekend keeps your streak alive. Coach has your plan ready.`,
            url: "/workouts",
          };
        }
      }

      // 3) Meal nudge — 2pm local, nothing logged today
      if (!payload && prefs.meals !== false && hour === 14) {
        const { count } = await admin.from("meal_logs")
          .select("*", { count: "exact", head: true }).eq("user_id", userId).gte("eaten_at", `${date}T00:00:00`);
        if ((count ?? 0) === 0) {
          payload = {
            title: "Fuel check 📸",
            body: "Nothing logged yet today — snap your next meal and Coach handles the math.",
            url: "/nutrition",
          };
        }
      }

      if (!payload) continue;

      for (const sub of byUser.get(userId)!) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify(payload),
          );
          sent++;
        } catch (err: unknown) {
          const status = (err as { statusCode?: number })?.statusCode;
          if (status === 404 || status === 410) {
            await admin.from("push_subscriptions").delete().eq("id", sub.id);
            pruned++;
          } else {
            console.warn("push send failed", status, sub.endpoint.slice(0, 40));
          }
        }
      }
    }

    return new Response(JSON.stringify({ sent, pruned }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error("send-reminders error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500 });
  }
});
