// Daily Coach Pulse: the coach speaks FIRST. Generates one short personal
// brief per user per day (today's session, streak status, one nudge) with an
// AI voice and a deterministic fallback, cached in coach_pulses.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYS = `You are Coach Forge writing your client's short daily check-in message. Voice: warm, direct, like a real coach texting — 2-3 sentences MAX, concrete, personal, zero fluff. Use their data: today's scheduled session, week progress, streak, readiness, meals logged. One clear focus for today. Encourage, never guilt-trip.

Return ONLY JSON: {"message": "2-3 sentence daily brief", "cta": "workout" | "meals" | "chat" | "none"}
- cta "workout" if today's priority is training, "meals" if it's logging/nutrition, "chat" if they should talk something through, "none" for rest-day encouragement.`;

function fallbackPulse(ctx: {
  name?: string; todayTitle?: string | null; weekDone: number; weekTotal: number; streak: number; mealsLogged: number;
}): { message: string; cta: string } {
  const name = ctx.name ? `${ctx.name}, ` : "";
  if (ctx.todayTitle) {
    return {
      message: `${name}${ctx.todayTitle} is on the board today. You're ${ctx.weekDone}/${ctx.weekTotal} this week${ctx.streak > 1 ? ` with a ${ctx.streak}-week streak alive` : ""} — let's keep it moving.`,
      cta: "workout",
    };
  }
  if (ctx.mealsLogged === 0) {
    return {
      message: `${name}rest day on the training side — nutrition is today's win. Snap your next meal and keep the day honest.`,
      cta: "meals",
    };
  }
  return {
    message: `${name}recovery day. Sleep, protein, and a walk beat another workout today. I'll have your next session ready.`,
    cta: "none",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors });

    // Client sends its local date so "today" matches the user's timezone.
    let body: any = {};
    try { body = await req.json(); } catch { /* optional */ }
    const localDate: string = typeof body?.local_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.local_date)
      ? body.local_date
      : new Date().toISOString().slice(0, 10);

    // Already pulsed today? Return the cached one.
    const { data: existing } = await supabase.from("coach_pulses").select("message, cta")
      .eq("user_id", user.id).eq("pulse_date", localDate).maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ ...existing, cached: true }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Gather today's picture
    const weekStart = new Date(`${localDate}T00:00:00Z`);
    weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());
    const [{ data: profile }, { data: todayWorkout }, { count: weekDone }, { data: logDates }, { data: checkin }, { count: mealsLogged }] = await Promise.all([
      supabase.from("profiles").select("name, days_per_week, goal").eq("user_id", user.id).maybeSingle(),
      supabase.from("workouts").select("title, focus").eq("user_id", user.id).eq("scheduled_date", localDate).neq("status", "completed").limit(1).maybeSingle(),
      supabase.from("workout_logs").select("*", { count: "exact", head: true }).eq("user_id", user.id).gte("started_at", weekStart.toISOString()),
      supabase.from("workout_logs").select("started_at").eq("user_id", user.id).order("started_at", { ascending: false }).limit(400),
      supabase.from("daily_checkins").select("energy, soreness, sleep_hours").eq("user_id", user.id).eq("checkin_date", localDate).maybeSingle(),
      supabase.from("meal_logs").select("*", { count: "exact", head: true }).eq("user_id", user.id).gte("eaten_at", `${localDate}T00:00:00`),
    ]);

    // Week streak (same rule as the dashboard)
    const weekStartMs = (d: Date) => { const w = new Date(d); w.setDate(w.getDate() - w.getDay()); w.setHours(0, 0, 0, 0); return w.getTime(); };
    const trained = new Set((logDates ?? []).map((l: { started_at: string }) => weekStartMs(new Date(l.started_at))));
    const WEEK = 7 * 24 * 3600 * 1000;
    let cursor = weekStartMs(new Date());
    if (!trained.has(cursor)) cursor -= WEEK;
    let streak = 0;
    while (trained.has(cursor)) { streak++; cursor -= WEEK; }

    const ctx = {
      name: profile?.name,
      goal: profile?.goal,
      todayTitle: todayWorkout?.title ?? null,
      todayFocus: todayWorkout?.focus ?? null,
      weekDone: weekDone ?? 0,
      weekTotal: profile?.days_per_week ?? 4,
      streak,
      checkin: checkin ?? null,
      mealsLogged: mealsLogged ?? 0,
    };

    let pulse: { message: string; cta: string } | null = null;
    if (apiKey) {
      try {
        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: SYS },
              { role: "user", content: `Write today's brief.\n${JSON.stringify(ctx)}` },
            ],
            response_format: { type: "json_object" },
          }),
        });
        if (aiResp.ok) {
          const j = await aiResp.json();
          try {
            const parsed = JSON.parse(j.choices?.[0]?.message?.content ?? "{}");
            if (parsed?.message) pulse = { message: String(parsed.message).slice(0, 500), cta: parsed.cta ?? "none" };
          } catch { /* fall through */ }
        }
      } catch (err) { console.warn("pulse ai failed", err); }
    }
    if (!pulse) pulse = fallbackPulse(ctx);

    // Persist (service role — table has no insert policy for users) + mirror to chat
    const { adminClient } = await import("../_shared/entitlements.ts");
    await adminClient().from("coach_pulses").insert({ user_id: user.id, pulse_date: localDate, message: pulse.message, cta: pulse.cta });
    await supabase.from("chat_messages").insert({ user_id: user.id, role: "assistant", content: pulse.message });

    return new Response(JSON.stringify(pulse), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("coach-pulse error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: cors });
  }
});
