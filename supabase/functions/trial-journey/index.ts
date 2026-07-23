// Week-One Trial Journey — the trial-to-paid converter.
// Schedule DAILY (e.g. 13:00 UTC). For every user in their first 7 days,
// posts the right coach moment for that day to coach_pulses (already shown
// on the Home screen). Pure math, personalized from their real data,
// zero AI cost.
//
// The arc: Day 1 make it personal -> Day 2 get the first win -> Day 3 show
// the adaptation magic -> Day 5 prove the value with THEIR numbers ->
// Day 6 easy keep. (Day 7+ is handled by the trial banner in-app.)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const DAY = 24 * 60 * 60 * 1000;

function first(name: string | null): string {
  return (name ?? "").trim().split(" ")[0] || "athlete";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const cronSecret = req.headers.get("x-cron-secret") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const expectedSecret = Deno.env.get("CRON_SECRET") ?? "";
    const authorized =
      (serviceKey && authHeader === `Bearer ${serviceKey}`) ||
      (expectedSecret && cronSecret === expectedSecret);
    if (!authorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors });
    }

    const db = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);

    // Everyone whose profile was created in the last 8 days
    const since = new Date(Date.now() - 8 * DAY).toISOString();
    const { data: profiles, error } = await db
      .from("profiles")
      .select("user_id, name, goal, created_at, injuries")
      .eq("onboarded", true)
      .gte("created_at", since);
    if (error) throw error;

    const today = new Date().toISOString().slice(0, 10);
    const results: { user_id: string; day: number; posted: boolean }[] = [];

    for (const p of profiles ?? []) {
      const day = Math.floor((Date.now() - new Date(p.created_at).getTime()) / DAY) + 1;
      if (day < 1 || day > 6) {
        results.push({ user_id: p.user_id, day, posted: false });
        continue;
      }

      const name = first(p.name);
      const goal = (p.goal ?? "your goal").toLowerCase();

      // Their real week-so-far numbers
      const [{ count: sessions }, { count: sets }, { data: prs }] = await Promise.all([
        db.from("workout_logs").select("id", { count: "exact", head: true })
          .eq("user_id", p.user_id).gte("started_at", p.created_at),
        db.from("set_logs").select("id", { count: "exact", head: true })
          .eq("user_id", p.user_id).gte("created_at", p.created_at),
        db.from("progress_metrics").select("id").eq("user_id", p.user_id)
          .eq("metric_type", "pr").gte("recorded_at", p.created_at).limit(5),
      ]);
      const s = sessions ?? 0;
      const prCount = prs?.length ?? 0;
      const hasInjury = Array.isArray(p.injuries) ? p.injuries.length > 0 : !!p.injuries;

      let message: string | null = null;
      let cta = "/workouts";

      if (day === 1) {
        message =
          `Welcome, ${name}. Your program was built around ${goal}` +
          (hasInjury ? ", working around what you told me about your body — every exercise is chosen with that in mind." : ".") +
          ` Most people's first session takes about 40 minutes. Whenever you're ready, I'm here for questions mid-workout too.`;
      } else if (day === 2) {
        message = s === 0
          ? `Day 2, ${name} — the hardest session of any program is the first one. It's shorter than you think, and I'll run the timers. Shall we?`
          : `First session done, ${name} — that's the hardest one, and you've already got ${sets ?? 0} sets banked. Recovery matters now: water, protein, sleep. Session two is queued.`;
      } else if (day === 3) {
        message = s >= 1
          ? `Here's the part most apps can't do, ${name}: I've been watching how your sets actually felt, and your plan quietly adjusts to it. Log how today goes and watch next session change.`
          : `No pressure, ${name} — but your plan only gets smarter once it sees you lift. One session teaches me more than any questionnaire. Twenty minutes counts.`;
      } else if (day === 5) {
        const wins: string[] = [];
        if (s > 0) wins.push(`${s} session${s === 1 ? "" : "s"}`);
        if ((sets ?? 0) > 0) wins.push(`${sets} working sets`);
        if (prCount > 0) wins.push(`${prCount} PR${prCount === 1 ? "" : "s"} 🏆`);
        message = wins.length
          ? `Day 5 check-in, ${name}: ${wins.join(", ")} since you started. That's a real week of coaching — and your plan is already different from day 1 because of it.`
          : `Day 5, ${name}. Your program is still sitting here, custom-built and unused — and honestly, it deserves you. One session before the weekend changes the whole story.`;
      } else if (day === 6) {
        message =
          `Quick heads-up, ${name}: your trial wraps soon. Keeping your coach is one tap — and everything we've set up (your plan, your history${prCount ? ", your PRs" : ""}) carries straight on. Either way, I've enjoyed the week.`;
        cta = "/pricing";
      }

      if (!message) {
        results.push({ user_id: p.user_id, day, posted: false });
        continue;
      }

      // Merge politely with any pulse already posted today
      const { data: existing } = await db
        .from("coach_pulses").select("message").eq("user_id", p.user_id)
        .eq("pulse_date", today).maybeSingle();
      if (existing?.message && !existing.message.includes(name)) {
        message = `${message} Also: ${existing.message}`;
      }

      await db.from("coach_pulses").upsert(
        { user_id: p.user_id, pulse_date: today, message, cta },
        { onConflict: "user_id,pulse_date" },
      );
      results.push({ user_id: p.user_id, day, posted: true });
    }

    return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("trial-journey error", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors });
  }
});
