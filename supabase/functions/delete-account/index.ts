// Permanently delete the calling user's account.
// Auth: the user's own JWT (Authorization header). We verify it, then use the
// service role to remove the auth user — every app table references
// auth.users(id) ON DELETE CASCADE, so profile, programs, logs, photos
// metadata, chats, and subscriptions rows are removed with it.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors });
    }

    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await anon.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Best-effort: remove uploaded storage objects under the user's folder in
    // known buckets before the DB rows go. Failures here don't block deletion.
    for (const bucket of ["videos", "body-photos", "meal-photos", "uploads"]) {
      try {
        const { data: objects } = await admin.storage.from(bucket).list(user.id, { limit: 1000 });
        if (objects?.length) {
          await admin.storage.from(bucket).remove(objects.map((o) => `${user.id}/${o.name}`));
        }
      } catch {
        /* bucket may not exist — fine */
      }
    }

    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("delete-account error", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors });
  }
});
