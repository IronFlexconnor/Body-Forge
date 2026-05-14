import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldAlert, Activity } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

export const Route = createFileRoute("/admin/metrics")({
  head: () => ({
    meta: [
      { title: "Admin · Performance Metrics" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: MetricsDashboard,
});

type PerfRow = {
  event_type: string;
  value_ms: number;
  device: string | null;
  release: string | null;
  route: string | null;
  created_at: string;
};

const EVENT_LABELS: Record<string, string> = {
  fcp: "First Contentful Paint",
  lcp: "Largest Contentful Paint",
  ttfb: "Time to First Byte",
  load: "Page Load",
  ai_first_token: "AI First Token (client)",
  ai_server_processing: "AI Server Processing",
  ai_network_overhead: "AI Network Overhead",
  ai_total: "AI Total Response",
};

function quantile(arr: number[], q: number): number {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return s[base + 1] != null ? s[base] + rest * (s[base + 1] - s[base]) : s[base];
}

function fmtMs(v: number) {
  if (!v) return "—";
  return v >= 1000 ? `${(v / 1000).toFixed(2)}s` : `${Math.round(v)}ms`;
}

function MetricsDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<PerfRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setIsAdmin(false); return; }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [authLoading, user]);

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    supabase
      .from("perf_events")
      .select("event_type, value_ms, device, release, route, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(10000)
      .then(({ data }) => {
        setRows((data ?? []) as PerfRow[]);
        setLoading(false);
      });
  }, [isAdmin, days]);

  const summary = useMemo(() => {
    const byType: Record<string, number[]> = {};
    for (const r of rows) (byType[r.event_type] ??= []).push(r.value_ms);
    return Object.entries(byType).map(([type, vals]) => ({
      type,
      label: EVENT_LABELS[type] ?? type,
      n: vals.length,
      p50: quantile(vals, 0.5),
      p95: quantile(vals, 0.95),
    }));
  }, [rows]);

  const byDevice = useMemo(() => {
    const groups: Record<string, Record<string, number[]>> = {};
    for (const r of rows) {
      const d = r.device || "unknown";
      ((groups[d] ??= {})[r.event_type] ??= []).push(r.value_ms);
    }
    return Object.entries(groups).map(([device, byType]) => ({
      device,
      stats: Object.entries(byType).map(([type, vals]) => ({
        type,
        label: EVENT_LABELS[type] ?? type,
        n: vals.length,
        p50: quantile(vals, 0.5),
        p95: quantile(vals, 0.95),
      })),
    }));
  }, [rows]);

  const byRelease = useMemo(() => {
    const groups: Record<string, Record<string, number[]>> = {};
    for (const r of rows) {
      const rel = r.release || "unknown";
      ((groups[rel] ??= {})[r.event_type] ??= []).push(r.value_ms);
    }
    return Object.entries(groups)
      .map(([release, byType]) => ({
        release,
        lcp_p95: quantile(byType.lcp ?? [], 0.95),
        fcp_p95: quantile(byType.fcp ?? [], 0.95),
        ai_first_token_p95: quantile(byType.ai_first_token ?? [], 0.95),
        n: Object.values(byType).reduce((s, a) => s + a.length, 0),
      }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 8);
  }, [rows]);

  const trend = useMemo(() => {
    // bucket per day, p95 for lcp + ai_first_token
    const buckets: Record<string, { lcp: number[]; aift: number[] }> = {};
    for (const r of rows) {
      const day = r.created_at.slice(0, 10);
      const b = (buckets[day] ??= { lcp: [], aift: [] });
      if (r.event_type === "lcp") b.lcp.push(r.value_ms);
      if (r.event_type === "ai_first_token") b.aift.push(r.value_ms);
    }
    return Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, v]) => ({
        day: day.slice(5),
        lcp_p95: Math.round(quantile(v.lcp, 0.95)),
        ai_first_token_p95: Math.round(quantile(v.aift, 0.95)),
      }));
  }, [rows]);

  if (authLoading || isAdmin === null) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="max-w-md p-8 text-center">
          <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Admin only</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You need an admin role to view performance metrics.
          </p>
          <Link to="/" className="mt-6 inline-block text-sm text-primary underline">Go home</Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Activity className="h-6 w-6 text-primary" /> Performance Metrics
            </h1>
            <p className="text-sm text-muted-foreground">
              Page-load Web Vitals and AI first-token latency across devices and releases.
            </p>
          </div>
          <div className="flex gap-2">
            {[1, 7, 30].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                  days === d ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background text-muted-foreground hover:bg-accent"
                }`}
              >
                {d === 1 ? "24h" : `${d}d`}
              </button>
            ))}
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : rows.length === 0 ? (
          <Card className="p-10 text-center text-sm text-muted-foreground">
            No telemetry yet for this window. Browse the app or send a chat message — events will start arriving within seconds.
          </Card>
        ) : (
          <>
            {/* Top KPI grid */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {summary.map((s) => (
                <Card key={s.type} className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</span>
                    <Badge variant="secondary" className="text-[10px]">n={s.n}</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-[10px] text-muted-foreground">p50</div>
                      <div className="text-xl font-semibold">{fmtMs(s.p50)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">p95</div>
                      <div className="text-xl font-semibold">{fmtMs(s.p95)}</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Trend chart */}
            <Card className="p-4">
              <h2 className="mb-3 text-sm font-semibold">Daily p95 trend</h2>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} unit="ms" />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="lcp_p95" name="LCP p95" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="ai_first_token_p95" name="AI 1st token p95" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* By device */}
            <Card className="p-4">
              <h2 className="mb-3 text-sm font-semibold">By device</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-4">Device</th>
                      <th className="py-2 pr-4">Metric</th>
                      <th className="py-2 pr-4">Samples</th>
                      <th className="py-2 pr-4">p50</th>
                      <th className="py-2 pr-4">p95</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byDevice.flatMap((g) =>
                      g.stats.map((s, i) => (
                        <tr key={`${g.device}-${s.type}`} className="border-t border-border/40">
                          <td className="py-1.5 pr-4 font-medium capitalize">{i === 0 ? g.device : ""}</td>
                          <td className="py-1.5 pr-4 text-muted-foreground">{s.label}</td>
                          <td className="py-1.5 pr-4">{s.n}</td>
                          <td className="py-1.5 pr-4">{fmtMs(s.p50)}</td>
                          <td className="py-1.5 pr-4">{fmtMs(s.p95)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* By release */}
            <Card className="p-4">
              <h2 className="mb-3 text-sm font-semibold">Recent releases</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-4">Release</th>
                      <th className="py-2 pr-4">Samples</th>
                      <th className="py-2 pr-4">FCP p95</th>
                      <th className="py-2 pr-4">LCP p95</th>
                      <th className="py-2 pr-4">AI 1st token p95</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byRelease.map((r) => (
                      <tr key={r.release} className="border-t border-border/40">
                        <td className="py-1.5 pr-4 font-mono">{r.release}</td>
                        <td className="py-1.5 pr-4">{r.n}</td>
                        <td className="py-1.5 pr-4">{fmtMs(r.fcp_p95)}</td>
                        <td className="py-1.5 pr-4">{fmtMs(r.lcp_p95)}</td>
                        <td className="py-1.5 pr-4">{fmtMs(r.ai_first_token_p95)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
