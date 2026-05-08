// Daily warmer for the Latest Insights feed.
// pg_cron pings this once a day; the route invokes the daily-insights edge
// function which generates + caches today's cards in public.daily_insights.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/refresh-insights")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const url = `${process.env.SUPABASE_URL}/functions/v1/daily-insights`;
          const r = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: process.env.SUPABASE_PUBLISHABLE_KEY ?? "",
              Authorization: `Bearer ${process.env.SUPABASE_PUBLISHABLE_KEY ?? ""}`,
            },
            body: "{}",
          });
          const ok = r.ok;
          return new Response(JSON.stringify({ ok, status: r.status }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          return new Response(JSON.stringify({ ok: false, error: String(e) }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
