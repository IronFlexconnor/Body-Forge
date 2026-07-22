// Adaptive Macros: weekly calorie auto-tuning from the user's REAL weight trend.
// Run weekly via cron (e.g. Sunday evening) with the service-role key or
// x-cron-secret. Pure arithmetic — no LLM call, so it costs nothing per run.
//
// Logic (MacroFactor-style adherence-neutral adjustment):
//   1. Need >= 4 weigh-ins spanning >= 10 days in the last 21 days.
//   2. Observed trend = linear regression slope of weight over time (kg/week).
//   3. Target trend from profile.goal:
//        fat loss  -> -0.5 kg/week
//        muscle    -> +0.25 kg/week
//        otherwise ->  0 (recomp/maintain)
//   4. Calorie delta = (target - observed) * 7700 kcal per kg / 7 days,
//      clamped to +/-200 kcal per adjustment and only applied when the gap
//      is meaningful (>= 75 kcal/day) to avoid target churn.
//   5. Write the new calorieGoal into profiles.nutrition_preferences, record
//      the adjustment, and upsert a coach_pulse so the Home screen tells the
//      user what changed and why.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { weeklyTrend, targetTrendFor, computeAdjustment, type WeighIn } from "../_shared/adaptive-math.ts";


const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

function fmtTrend(kgPerWeek: number, units: string | null): string {
  const imperial = units !== "metric";
  const v = imperial ? kgPerWeek / 0.45359237 : kgPerWeek;
  const unit = imperial ? "lbs" : "kg";
  const sign = v > 0 ? "+" : "";
  return `${sign}${(Math.round(v * 10) / 10).toFixed(1)} ${unit}/week`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    // Auth: service-role bearer or cron secret (same pattern as send-reminders)
    const authHeader = req.headers.get("Authorization") ?? "";
    const cronSecret = req.headers.get("x-cron-secret") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const expectedSecret = Deno.env.get("CRON_SECRET") ?? "";
    const authorized =
      (serviceKey && authHeader === `Bearer ${serviceKey}`) ||
      (expectedSecret && cronSecret === expectedSecret);
    if (!authorized) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors });

    const db = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);

    // Optional single-user mode: { "user_id": "..." } in the body
    let onlyUser: string | null = null;
    try {
      const body = await req.json();
      if (body?.user_id) onlyUser = String(body.user_id);
    } catch {
      /* no body — full run */
    }

    let profQuery = db
      .from("profiles")
      .select("user_id, goal, units, nutrition_preferences, timezone")
      .eq("onboarded", true);
    if (onlyUser) profQuery = profQuery.eq("user_id", onlyUser);
    const { data: profiles, error: profErr } = await profQuery;
    if (profErr) throw profErr;

    const since = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString();
    const results: { user_id: string; status: string; delta?: number }[] = [];

    for (const p of profiles ?? []) {
      const prefs = (p.nutrition_preferences ?? {}) as Record<string, unknown>;
      const currentCalories = Number(prefs.calorieGoal);
      if (!Number.isFinite(currentCalories) || currentCalories <= 0) {
        results.push({ user_id: p.user_id, status: "no_calorie_goal" });
        continue;
      }

      // Skip users adjusted in the last 6 days (weekly cadence)
      const { data: recent } = await db
        .from("macro_adjustments")
        .select("id")
        .eq("user_id", p.user_id)
        .gte("created_at", new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString())
        .limit(1);
      if (recent?.length) {
        results.push({ user_id: p.user_id, status: "recently_adjusted" });
        continue;
      }

      const { data: weighins } = await db
        .from("progress_metrics")
        .select("value, recorded_at")
        .eq("user_id", p.user_id)
        .eq("metric_type", "weight")
        .gte("recorded_at", since)
        .order("recorded_at", { ascending: true });

      const observed = weeklyTrend((weighins ?? []) as WeighIn[]);
      if (observed == null) {
        results.push({ user_id: p.user_id, status: "insufficient_weighins" });
        continue;
      }

      const target = targetTrendFor(p.goal);
      const adj = computeAdjustment(currentCalories, observed, target);
      if (!adj) {
        results.push({ user_id: p.user_id, status: "on_track" });
        continue;
      }

      const direction = adj.delta > 0 ? "up" : "down";
      const rationale =
        `Your weight is trending ${fmtTrend(observed, p.units)} vs a goal pace of ${fmtTrend(target, p.units)}, ` +
        `so I'm nudging your daily calories ${direction} by ${Math.abs(adj.delta)} to ${adj.newCalories}. ` +
        `Small, steady corrections beat big swings — keep the weigh-ins coming.`;

      // 1. Update the live calorie goal
      const { error: updErr } = await db
        .from("profiles")
        .update({ nutrition_preferences: { ...prefs, calorieGoal: adj.newCalories } })
        .eq("user_id", p.user_id);
      if (updErr) {
        results.push({ user_id: p.user_id, status: "update_failed" });
        continue;
      }

      // 2. Record the adjustment (history the user can read)
      await db.from("macro_adjustments").insert({
        user_id: p.user_id,
        old_calories: currentCalories,
        new_calories: adj.newCalories,
        weight_trend_kg_per_week: Math.round(observed * 1000) / 1000,
        target_trend_kg_per_week: target,
        rationale,
      });

      // 3. Surface it on the Home screen via the existing coach pulse
      const today = new Date().toISOString().slice(0, 10);
      await db.from("coach_pulses").upsert(
        {
          user_id: p.user_id,
          pulse_date: today,
          message: rationale,
          cta: "/nutrition",
        },
        { onConflict: "user_id,pulse_date" },
      );

      results.push({ user_id: p.user_id, status: "adjusted", delta: adj.delta });
    }

    return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("adaptive-macros error", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors });
  }
});
