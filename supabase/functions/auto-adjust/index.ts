// Autonomous Coach: makes positive, evidence-based adjustments to BOTH training and nutrition.
// Triggered after workouts, video analyses, check-ins, chat requests, or manually.
// Stores each adjustment as `pending` (with full diff) so the user can Approve / Tweak / Reject.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { EXPERT_KNOWLEDGE } from "../_shared/expert.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYS = `You are Coach Forge — an elite strength & conditioning coach AND certified sports nutritionist with full autonomy to make POSITIVE, evidence-based adjustments to the user's program and nutrition plan.

YOU MAY FREELY ADJUST (when it benefits the user):
TRAINING — exercises, sets, reps, weight (% or kg/lb), tempo, rest, RPE, progression speed, volume up/down, swap movements, deload timing, add sport-specific drills, rebuild a session.
NUTRITION — swap any meal/recipe (use provided recipe_library: pick by id), tweak macros, change portions, add/remove snacks, adjust daily calorie target, suggest replacement recipes that match diet/allergens.

DECISION RULES
- Apply progressive overload when last sets were comfortable (RPE ≤ prescribed). Hold or back off when RPE ≥ 9 across the board. Trigger a deload after 3 declining sessions.
- Respect injuries ABSOLUTELY: never recommend movements that aggravate them; substitute with a safer variant from exercise_library and explain why.
- Sync nutrition with training day: more carbs/cal on heavy days, more protein in build blocks, lighter on rest/deload.
- Honor every dietary restriction & allergen in profile.nutrition_preferences. NO exceptions.
- Each adjustment must be small, positive, and clearly reasoned. If nothing should change, say so.

OUTPUT — return ONLY valid JSON, no prose:
{
  "should_adjust": true|false,
  "scope": "training" | "nutrition" | "both",
  "summary": "one warm sentence the user will see (e.g. 'Your squat is moving fast — bumping load 5% and adding a high-protein recovery meal.')",
  "coach_note": "2-4 sentence personal explanation, warm + specific. Reference the data ('Last bench was 80kg×6 at RPE 7…').",
  "training": {
    "next_workout_exercises": [{"name":"...","sets":4,"reps":"6-8","rest_sec":150,"rpe":8,"notes":"..."}] | null,
    "changes": ["bullet of every training change"]
  },
  "nutrition": {
    "macro_changes": {"calories": 2400, "protein_g": 180, "carbs_g": 260, "fat_g": 75} | {},
    "meal_swaps": [{"slot":"lunch","old":"...","new_recipe_id":"<uuid from recipe_library>","new_title":"...","reason":"..."}],
    "changes": ["bullet of every nutrition change"]
  }
}

If a section has no changes, set it to null/empty arrays. Always pick recipe ids ONLY from the provided recipe_library.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    const authHeader = req.headers.get("Authorization");
    if (!apiKey || !authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors });

    const { trigger, workout_log_id, user_request, auto_apply } = await req.json().catch(() => ({}));

    const today = new Date().toISOString().slice(0, 10);
    const [
      { data: profile },
      { data: program },
      { data: nextWorkout },
      { data: recentLogs },
      { data: recentVideos },
      { data: checkins },
      { data: meals },
      { data: pastAdjustments },
      { data: exerciseLib },
      { data: recipeLib },
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("programs").select("*").eq("user_id", user.id).eq("is_active", true).maybeSingle(),
      supabase.from("workouts").select("*").eq("user_id", user.id).gte("scheduled_date", today).neq("status", "completed").order("scheduled_date").limit(1).maybeSingle(),
      supabase.from("workout_logs").select("*, set_logs(*)").eq("user_id", user.id).order("started_at", { ascending: false }).limit(3),
      supabase.from("video_uploads").select("exercise_name, score, cues, analysis").eq("user_id", user.id).order("created_at", { ascending: false }).limit(2),
      supabase.from("daily_checkins").select("*").eq("user_id", user.id).order("checkin_date", { ascending: false }).limit(3),
      supabase.from("meal_logs").select("name, calories, protein_g, carbs_g, fat_g, eaten_at").eq("user_id", user.id).order("eaten_at", { ascending: false }).limit(20),
      supabase.from("program_adjustments").select("trigger, summary, scope, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
      supabase.from("exercises").select("id, name, category, primary_muscles, equipment").limit(400),
      supabase.from("recipes").select("id, title, meal_type, cuisine, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens").limit(300),
    ]);

    const ctx = {
      trigger,
      user_request: user_request ?? null,
      profile,
      program: program ? { id: program.id, name: program.name, style: program.style, current_week: program.current_week, weeks: program.weeks } : null,
      next_workout: nextWorkout,
      recent_workouts: recentLogs ?? [],
      recent_videos: recentVideos ?? [],
      recent_checkins: checkins ?? [],
      recent_meals: meals ?? [],
      past_adjustments: pastAdjustments ?? [],
      exercise_library: exerciseLib ?? [],
      recipe_library: recipeLib ?? [],
    };

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYS },
          { role: "user", content: `Make the best positive adjustment(s) right now.\n\nCONTEXT:\n${JSON.stringify(ctx).slice(0, 60000)}` },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("auto-adjust ai error", aiResp.status, t);
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limit — try again in a moment." }), { status: 429, headers: cors });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: cors });
      return new Response(JSON.stringify({ error: "AI error" }), { status: 500, headers: cors });
    }

    const aiJson = await aiResp.json();
    let plan: any = {};
    try { plan = JSON.parse(aiJson.choices?.[0]?.message?.content ?? "{}"); } catch { plan = {}; }

    if (!plan.should_adjust) {
      return new Response(JSON.stringify({ should_adjust: false, summary: plan.summary || "Plan is on track — no changes needed." }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    const training = plan.training ?? {};
    const nutrition = plan.nutrition ?? {};
    const trainingChanges: string[] = Array.isArray(training.changes) ? training.changes : [];
    const nutritionChanges: string[] = Array.isArray(nutrition.changes) ? nutrition.changes : [];
    const allChanges = [...trainingChanges, ...nutritionChanges];

    // Persist as pending — user must approve/tweak/reject from the dashboard
    const { data: adjustment } = await supabase.from("program_adjustments").insert({
      user_id: user.id,
      program_id: program?.id ?? null,
      workout_id: nextWorkout?.id ?? null,
      trigger: trigger ?? "manual",
      scope: plan.scope || "training",
      status: auto_apply ? "approved" : "pending",
      summary: plan.summary || "Plan tuned.",
      coach_note: plan.coach_note || null,
      changes: allChanges,
      meal_changes: nutrition.meal_swaps ?? [],
      macro_changes: nutrition.macro_changes ?? {},
    }).select().single();

    // If auto-apply (e.g. checkin small tweak), apply immediately
    if (auto_apply && adjustment) {
      if (Array.isArray(training.next_workout_exercises) && training.next_workout_exercises.length && nextWorkout?.id) {
        await supabase.from("workouts").update({ exercises: training.next_workout_exercises }).eq("id", nextWorkout.id);
      }
      if (nutrition.macro_changes && Object.keys(nutrition.macro_changes).length && profile) {
        await supabase.from("profiles").update({ macro_targets: { ...(profile.macro_targets ?? {}), ...nutrition.macro_changes } }).eq("user_id", user.id);
      }
    }

    // Send to chat as a coach update
    if (plan.summary) {
      await supabase.from("chat_messages").insert({
        user_id: user.id,
        role: "assistant",
        content: `✨ **Plan upgrade ready** — ${plan.summary}\n\n${plan.coach_note ?? ""}\n\n${allChanges.map((c) => `• ${c}`).join("\n")}\n\n_Open the dashboard to Approve, Tweak, or Reject._`,
      });
    }

    return new Response(JSON.stringify({ ...plan, adjustment_id: adjustment?.id }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("auto-adjust error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: cors });
  }
});
