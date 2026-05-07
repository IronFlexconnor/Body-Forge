// Returns today's curated 6 health & fitness insight cards.
// Caches by date in public.daily_insights so all users share the same daily feed.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You are Coach Forge — a warm, world-class strength, nutrition, and performance coach with PhD-level expertise (NSCA / ISSN / ACSM / sports-psychology).
Generate 6 short, exciting insight cards on the most interesting RECENT discoveries in health & fitness (recovery, supplements, training science, nutrition, performance hacks, sleep, mental training).
Each card MUST be readable in 30–60 seconds and feel premium and trustworthy. Vary the topics. Keep tone warm and energizing.`;

const TOOL = {
  type: "function",
  function: {
    name: "publish_insights",
    description: "Publish today's curated insight cards.",
    parameters: {
      type: "object",
      properties: {
        cards: {
          type: "array",
          minItems: 6,
          maxItems: 6,
          items: {
            type: "object",
            properties: {
              category: { type: "string", enum: ["recovery", "training", "nutrition", "supplements", "sleep", "mindset", "performance"] },
              emoji: { type: "string", description: "1 emoji that fits the topic" },
              headline: { type: "string", description: "Punchy headline, 5-9 words" },
              summary: { type: "string", description: "2-3 sentence plain-English summary of the discovery" },
              why_it_matters: { type: "string", description: "1-2 sentences on what this means for the user's training/nutrition" },
              apply_action: { type: "string", description: "Concrete one-line tweak to apply to plan, e.g. 'Add 5g creatine to your morning shake'" },
              read_minutes: { type: "number" },
            },
            required: ["category", "emoji", "headline", "summary", "why_it_matters", "apply_action", "read_minutes"],
            additionalProperties: false,
          },
        },
      },
      required: ["cards"],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const admin = createClient(url, service);

    const today = new Date().toISOString().slice(0, 10);

    // Check cache
    const { data: cached } = await admin
      .from("daily_insights")
      .select("cards")
      .eq("insight_date", today)
      .maybeSingle();
    if (cached?.cards && Array.isArray(cached.cards) && cached.cards.length) {
      return new Response(JSON.stringify({ date: today, cards: cached.cards }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Generate fresh
    const seed = Math.random().toString(36).slice(2, 8);
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `Today is ${today}. Generate 6 brand-new insight cards (variation seed: ${seed}). Vary categories.` },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "publish_insights" } },
      }),
    });

    if (aiResp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), { status: 429, headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (aiResp.status === 402) {
      return new Response(JSON.stringify({ error: "Payment required, please add Lovable AI credits." }), { status: 402, headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("ai error", aiResp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const j = await aiResp.json();
    const args = j?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const cards = args ? JSON.parse(args).cards : [];
    if (!Array.isArray(cards) || !cards.length) {
      return new Response(JSON.stringify({ error: "No insights generated" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    }

    await admin.from("daily_insights").upsert({ insight_date: today, cards }, { onConflict: "insight_date" });

    return new Response(JSON.stringify({ date: today, cards }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
