// Sunday Weekly Review + Comeback Flow.
// Schedule weekly (e.g. Sunday 19:00 UTC, after adaptive-macros at 18:00).
// Pure math — no LLM cost. Writes to coach_pulses, which the Home screen
// already displays, so no frontend changes are needed.
//
// Three modes per user:
//  - REVIEW: trained this week -> celebrate the numbers (sessions, sets,
//    PRs, weigh-in consistency) and tee up next week.
//  - NUDGE: quiet week but active recently -> warm, no-guilt restart.
//  - COMEBACK: 14+ days away -> "your coach kept your plan warm" re-entry.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const DAY = 24 * 60 * 60 * 1000;

function firstName(name: string | null): string {
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

    let onlyUser: string | null = null;
    try {
      const body = await req.json();
      if (body?.user_id) onlyUser = String(body.user_id);
    } catch {
      /* full run */
    }

    let q = db.from("profiles").select("user_id, name").eq("onboarded", true);
    if (onlyUser) q = q.eq("user_id", onlyUser);
    const { data: profiles, error } = await q;
    if (error) throw error;

    const now = Date.now();
    const weekAgo = new Date(now - 7 * DAY).toISOString();
    const twoWeeksAgo = new Date(now - 14 * DAY).toISOString();
    const today = new Date().toISOString().slice(0, 10);
    const results: { user_id: string; mode: string }[] = [];

    for (const p of profiles ?? []) {
      // This week's sessions
      const { data: logs } = await db
        .from("workout_logs")
        .select("id, started_at, ended_at")
        .eq("user_id", p.user_id)
        .gte("started_at", weekAgo);

      // Last activity overall (for comeback detection)
      const { data: lastLog } = await db
        .from("workout_logs")
        .select("started_at")
        .eq("user_id", p.user_id)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const name = firstName(p.name);
      let message: string;
      let cta = "/workouts";
      let mode: string;

      if (logs && logs.length > 0) {
        mode = "review";
        // Sets + PRs this week
        const logIds = logs.map((l) => l.id);
        const [{ count: setCount }, { data: prs }, { data: weighins }] = await Promise.all([
          db.from("set_logs").select("id", { count: "exact", head: true }).in("workout_log_id", logIds),
          db
            .from("progress_metrics")
            .select("meta")
            .eq("user_id", p.user_id)
            .eq("metric_type", "pr")
            .gte("recorded_at", weekAgo),
          db
            .from("progress_metrics")
            .select("id", { head: true, count: "exact" })
            .eq("user_id", p.user_id)
            .eq("metric_type", "weight")
            .gte("recorded_at", weekAgo),
        ]);

        const sessions = logs.length;
        const sets = setCount ?? 0;
        const prCount = prs?.length ?? 0;
        const weighCount = (weighins as unknown as { count?: number })?.count ?? 0;

        const parts: string[] = [
          `Weekly review, ${name}: ${sessions} session${sessions === 1 ? "" : "s"}${sets ? ` and ${sets} working sets` : ""} in the books.`,
        ];
        if (prCount > 0) {
          const first = (prs?.[0]?.meta as { exercise?: string } | null)?.exercise;
          parts.push(
            prCount === 1
              ? `You set a PR${first ? ` on ${first}` : ""} — that's real progress. 🏆`
              : `${prCount} PRs this week — you're genuinely getting stronger. 🏆`,
          );
        }
        if (weighCount >= 4) {
          parts.push("Weigh-ins were consistent, which keeps your calorie targets sharp.");
        } else if (weighCount === 0) {
          parts.push("No weigh-ins this week — a few quick ones help me tune your nutrition.");
        }
        parts.push("New week starts now. Your next session is ready.");
        message = parts.join(" ");
      } else if (lastLog && new Date(lastLog.started_at).toISOString() >= twoWeeksAgo) {
        mode = "nudge";
        message =
          `Quiet week, ${name} — it happens, and one week changes nothing. ` +
          `The fastest way back is one easy session. Your plan is ready when you are, no guilt attached.`;
      } else {
        mode = "comeback";
        message =
          `Welcome back whenever you're ready, ${name}. I've kept your plan warm — ` +
          `we'll restart lighter than where you left off so it feels good, not brutal. One session resets everything.`;
      }

      // Don't clobber an existing pulse for today (e.g. adaptive-macros) —
      // lead with the review and keep the earlier note.
      const { data: existing } = await db
        .from("coach_pulses")
        .select("message")
        .eq("user_id", p.user_id)
        .eq("pulse_date", today)
        .maybeSingle();
      if (existing?.message && !existing.message.startsWith("Weekly review")) {
        message = `${message} Also: ${existing.message}`;
      }

      await db.from("coach_pulses").upsert(
        { user_id: p.user_id, pulse_date: today, message, cta },
        { onConflict: "user_id,pulse_date" },
      );
      results.push({ user_id: p.user_id, mode });
    }

    return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("weekly-review error", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors });
  }
});
