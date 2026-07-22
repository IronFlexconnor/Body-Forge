// Long-term coach memory: a rolling, model-maintained summary of durable
// facts about the user (goals, PRs, injuries, preferences, life context).
// Loaded into every ai-coach call; refreshed in the background after replies.
import { adminClient } from "./entitlements.ts";

export async function loadMemory(userId: string): Promise<string> {
  const { data } = await adminClient()
    .from("coach_memories")
    .select("summary")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.summary ?? "";
}

const MEMORY_PROMPT = `You maintain the long-term memory a personal trainer keeps about a client. Given the CURRENT MEMORY and the LATEST EXCHANGE, return the updated memory.

Rules:
- Keep only durable, coaching-relevant facts: goals, PRs and key numbers, injuries/pain reports and their dates, schedule constraints, equipment, diet preferences/allergies mentioned in chat, motivation patterns, life events that affect training (new job, travel, baby), and explicit user preferences ("hates burpees", "prefers morning sessions").
- Merge new facts into the existing memory; update stale facts instead of duplicating; drop chit-chat.
- Max ~250 words. Terse bullet lines, grouped by topic. No preamble.
- If the exchange contains nothing durable, return the memory unchanged.

Return ONLY the memory text.`;

export async function updateMemory(
  userId: string,
  apiKey: string,
  userMsg: string,
  assistantMsg: string,
): Promise<void> {
  try {
    const current = await loadMemory(userId);
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: MEMORY_PROMPT },
          {
            role: "user",
            content: `CURRENT MEMORY:\n${current || "(empty)"}\n\nLATEST EXCHANGE:\nUser: ${userMsg}\nCoach: ${assistantMsg}`,
          },
        ],
      }),
    });
    if (!resp.ok) {
      console.error("memory update gateway error", resp.status);
      return;
    }
    const json = await resp.json();
    const updated = json.choices?.[0]?.message?.content?.trim();
    if (!updated || updated === current) return;
    await adminClient()
      .from("coach_memories")
      .upsert({ user_id: userId, summary: updated.slice(0, 4000), updated_at: new Date().toISOString() });
  } catch (e) {
    console.error("memory update failed:", e);
  }
}
