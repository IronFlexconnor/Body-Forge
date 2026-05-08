import { supabase } from "@/integrations/supabase/client";

export type UsageEventType =
  | "view_route"
  | "form_analyze"
  | "meal_view"
  | "meal_save"
  | "meal_regenerate"
  | "exercise_view"
  | "insight_click"
  | "chat_message"
  | "workout_complete"
  | "regenerate_program";

/** Fire-and-forget usage tracker. Never throws. */
export async function trackEvent(
  event_type: UsageEventType,
  opts: { ref_id?: string; ref_label?: string; meta?: Record<string, unknown> } = {},
) {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const user_id = auth.user?.id;
    if (!user_id) return;
    await supabase.from("usage_events").insert({
      user_id,
      event_type,
      ref_id: opts.ref_id ?? null,
      ref_label: opts.ref_label ?? null,
      meta: (opts.meta ?? {}) as never,
    });
  } catch {
    /* swallow */
  }
}

/** Get the user's most-used items of a given event type from local history. */
export async function getMyTopRefs(
  event_type: UsageEventType,
  limit = 5,
): Promise<{ ref_id: string; ref_label: string | null; uses: number }[]> {
  try {
    const { data } = await supabase
      .from("usage_events")
      .select("ref_id, ref_label")
      .eq("event_type", event_type)
      .not("ref_id", "is", null)
      .gte("created_at", new Date(Date.now() - 30 * 864e5).toISOString())
      .limit(500);
    const counts = new Map<string, { ref_id: string; ref_label: string | null; uses: number }>();
    for (const row of data ?? []) {
      const key = row.ref_id as string;
      const cur = counts.get(key) ?? { ref_id: key, ref_label: row.ref_label as string | null, uses: 0 };
      cur.uses += 1;
      counts.set(key, cur);
    }
    return [...counts.values()].sort((a, b) => b.uses - a.uses).slice(0, limit);
  } catch {
    return [];
  }
}

/** Get globally trending items (anonymized aggregate). */
export async function getTrending(
  event_type: UsageEventType,
  limit = 5,
): Promise<{ ref_id: string; ref_label: string | null; uses: number; users: number }[]> {
  try {
    const { data } = await supabase
      .from("popular_content")
      .select("ref_id, ref_label, uses, users")
      .eq("event_type", event_type)
      .order("uses", { ascending: false })
      .limit(limit);
    return (data as any) ?? [];
  } catch {
    return [];
  }
}
