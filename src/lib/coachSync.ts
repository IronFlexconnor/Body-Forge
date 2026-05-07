// Posts a brief plan-change note into the AI Coach chat history so the
// assistant always sees what the user changed in their meal plan.
import { supabase } from "@/integrations/supabase/client";

export async function logPlanChangeToCoach(summary: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const content = `[Plan update] ${summary}`;
    await supabase.from("chat_messages").insert({
      user_id: user.id,
      role: "user",
      content,
    });
  } catch {
    // non-critical — sync is best-effort
  }
}
