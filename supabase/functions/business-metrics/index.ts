// Business funnel metrics for the founder dashboard (/admin/business).
// Caller must be an authenticated admin (user_roles.role = 'admin');
// data is then read with the service role so it spans all users.
// Returns the numbers that matter for the 1,000-subscriber objective:
// signups -> onboarded -> trials -> paying, engagement, and AI-cost proxies.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors });

    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await anon.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors });

    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: role } = await db
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!role) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: cors });

    let days = 30;
    try {
      const body = await req.json();
      if (body?.days) days = Math.max(1, Math.min(365, Number(body.days)));
    } catch { /* default */ }
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const count = async (table: string, mod?: (q: any) => any) => {
      let q = db.from(table).select("id", { count: "exact", head: true });
      if (mod) q = mod(q);
      const { count: c } = await q;
      return c ?? 0;
    };

    const [
      signupsTotal, signupsWindow, onboardedTotal,
      trialing, active, pastDue, canceled, trialsWindow,
      workoutsWindow, setsWindow, chatWindow, weighinsWindow,
    ] = await Promise.all([
      count("profiles"),
      count("profiles", (q) => q.gte("created_at", since)),
      count("profiles", (q) => q.eq("onboarded", true)),
      count("subscriptions", (q) => q.eq("status", "trialing")),
      count("subscriptions", (q) => q.eq("status", "active")),
      count("subscriptions", (q) => q.eq("status", "past_due")),
      count("subscriptions", (q) => q.eq("status", "canceled")),
      count("subscriptions", (q) => q.gte("created_at", since)),
      count("workout_logs", (q) => q.gte("started_at", since)),
      count("set_logs", (q) => q.gte("created_at", since)),
      count("chat_messages", (q) => q.gte("created_at", since)),
      count("progress_metrics", (q) => q.eq("metric_type", "weight").gte("recorded_at", since)),
    ]);

    // Paying mix by price (frontend maps price ids to $ amounts)
    const { data: activeRows } = await db
      .from("subscriptions").select("price_id").in("status", ["active", "past_due"]);
    const activeByPrice: Record<string, number> = {};
    for (const r of activeRows ?? []) {
      const k = r.price_id ?? "unknown";
      activeByPrice[k] = (activeByPrice[k] ?? 0) + 1;
    }

    // Active users in window (distinct across workouts + chat)
    const [{ data: wu }, { data: cu }] = await Promise.all([
      db.from("workout_logs").select("user_id").gte("started_at", since).limit(10000),
      db.from("chat_messages").select("user_id").gte("created_at", since).limit(10000),
    ]);
    const activeUsers = new Set([...(wu ?? []), ...(cu ?? [])].map((r) => r.user_id)).size;

    // AI cost proxy: usage-log calls by kind, plus the heaviest user
    const { data: usage } = await db
      .from("ai_usage").select("user_id, kind").gte("created_at", since).limit(20000);
    const usageByKind: Record<string, number> = {};
    const usageByUser: Record<string, number> = {};
    for (const r of usage ?? []) {
      usageByKind[r.kind] = (usageByKind[r.kind] ?? 0) + 1;
      usageByUser[r.user_id] = (usageByUser[r.user_id] ?? 0) + 1;
    }
    const heaviestUserCalls = Math.max(0, ...Object.values(usageByUser));

    const ended = active + pastDue + canceled;
    const trialConversion = ended > 0 ? Math.round(((active + pastDue) / ended) * 100) : null;

    return new Response(JSON.stringify({
      days,
      funnel: {
        signups_total: signupsTotal,
        signups_window: signupsWindow,
        onboarded_total: onboardedTotal,
        trials_started_window: trialsWindow,
        trialing_now: trialing,
        paying_now: active,
        past_due: pastDue,
        canceled_total: canceled,
        trial_conversion_pct: trialConversion,
        active_by_price: activeByPrice,
      },
      engagement: {
        active_users_window: activeUsers,
        workouts_window: workoutsWindow,
        sets_window: setsWindow,
        chat_messages_window: chatWindow,
        weighins_window: weighinsWindow,
      },
      ai_cost_proxy: {
        calls_by_kind: usageByKind,
        total_calls: usage?.length ?? 0,
        heaviest_user_calls: heaviestUserCalls,
      },
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("business-metrics error", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors });
  }
});
