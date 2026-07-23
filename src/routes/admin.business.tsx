import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, TrendingUp, Users, DollarSign, Activity, Cpu } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/business")({
  head: () => ({ meta: [{ title: "Business — Body Forge" }] }),
  component: BusinessDashboard,
});

// Same env-based price mapping the paywall uses, for the MRR estimate.
const PRICE_PRO = import.meta.env.VITE_STRIPE_PRICE_PRO as string | undefined;
const PRICE_ELITE = import.meta.env.VITE_STRIPE_PRICE_ELITE as string | undefined;
const PRICE_AMOUNTS: Record<string, number> = {
  ...(PRICE_PRO ? { [PRICE_PRO]: 9.99 } : {}),
  ...(PRICE_ELITE ? { [PRICE_ELITE]: 14.99 } : {}),
};

type Metrics = {
  days: number;
  funnel: {
    signups_total: number;
    signups_window: number;
    onboarded_total: number;
    trials_started_window: number;
    trialing_now: number;
    paying_now: number;
    past_due: number;
    canceled_total: number;
    trial_conversion_pct: number | null;
    active_by_price: Record<string, number>;
  };
  engagement: {
    active_users_window: number;
    workouts_window: number;
    sets_window: number;
    chat_messages_window: number;
    weighins_window: number;
  };
  ai_cost_proxy: {
    calls_by_kind: Record<string, number>;
    total_calls: number;
    heaviest_user_calls: number;
  };
};

function BusinessDashboard() {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Metrics | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data: r }) => setIsAdmin(!!r));
  }, [user]);

  useEffect(() => {
    if (!isAdmin) return;
    setBusy(true);
    supabase.functions
      .invoke("business-metrics", { body: { days } })
      .then(({ data: d }) => setData(d as Metrics))
      .finally(() => setBusy(false));
  }, [isAdmin, days]);

  if (loading || isAdmin === null) {
    return (
      <AppShell>
        <div className="grid min-h-[50dvh] place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }
  if (!isAdmin) {
    return (
      <AppShell>
        <div className="px-5 pt-6">
          <p className="text-sm text-muted-foreground">This page is for the app owner.</p>
        </div>
      </AppShell>
    );
  }

  const f = data?.funnel;
  const e = data?.engagement;
  const a = data?.ai_cost_proxy;

  const mrr = f
    ? Object.entries(f.active_by_price).reduce(
        (sum, [price, n]) => sum + (PRICE_AMOUNTS[price] ?? 9.99) * n,
        0,
      )
    : 0;
  const payingTotal = (f?.paying_now ?? 0) + (f?.past_due ?? 0);
  const goalPct = Math.min(100, Math.round((payingTotal / 1000) * 100));

  return (
    <AppShell>
      <div className="px-5 pt-6 pb-8">
        <div className="mb-1 flex items-center justify-between">
          <h1 className="page-title">Business</h1>
          <div className="flex gap-1">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={
                  d === days
                    ? "rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary"
                    : "rounded-full px-3 py-1 text-xs font-semibold text-muted-foreground"
                }
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
        <p className="mb-5 text-sm text-muted-foreground">
          The road to 1,000 subscribers — currently {payingTotal} ({goalPct}%).
        </p>

        {busy || !data ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <Stat icon={DollarSign} label="Est. MRR" value={`$${mrr.toFixed(0)}`} accent />
              <Stat icon={Users} label="Paying now" value={payingTotal} accent />
              <Stat icon={TrendingUp} label="In trial now" value={f?.trialing_now ?? 0} />
              <Stat
                icon={TrendingUp}
                label="Trial → paid"
                value={f?.trial_conversion_pct != null ? `${f.trial_conversion_pct}%` : "—"}
              />
            </div>

            <SectionTitle>Funnel · last {data.days} days</SectionTitle>
            <div className="mb-4 rounded-2xl border border-border/60 bg-gradient-card p-4 text-sm">
              <Row label="New signups" value={f?.signups_window ?? 0} />
              <Row label="Trials started" value={f?.trials_started_window ?? 0} />
              <Row label="Canceled (all-time)" value={f?.canceled_total ?? 0} />
              <Row label="Signups all-time" value={f?.signups_total ?? 0} />
              <Row label="Completed onboarding" value={f?.onboarded_total ?? 0} />
            </div>

            <SectionTitle>Engagement · last {data.days} days</SectionTitle>
            <div className="mb-4 rounded-2xl border border-border/60 bg-gradient-card p-4 text-sm">
              <Row label="Active users" value={e?.active_users_window ?? 0} icon={Activity} />
              <Row label="Workouts logged" value={e?.workouts_window ?? 0} />
              <Row label="Sets logged" value={e?.sets_window ?? 0} />
              <Row label="Coach messages" value={e?.chat_messages_window ?? 0} />
              <Row label="Weigh-ins" value={e?.weighins_window ?? 0} />
            </div>

            <SectionTitle>AI cost proxy · last {data.days} days</SectionTitle>
            <div className="rounded-2xl border border-border/60 bg-gradient-card p-4 text-sm">
              <Row label="Total AI calls" value={a?.total_calls ?? 0} icon={Cpu} />
              <Row label="Heaviest single user" value={`${a?.heaviest_user_calls ?? 0} calls`} />
              {Object.entries(a?.calls_by_kind ?? {}).map(([kind, n]) => (
                <Row key={kind} label={`· ${kind}`} value={n} muted />
              ))}
              <p className="mt-2 text-[11px] text-muted-foreground">
                Watch the heaviest user: if one account dwarfs the rest, caps need tuning.
              </p>
            </div>

            <p className="mt-5 text-center text-xs text-muted-foreground">
              Also see{" "}
              <Link to="/admin/metrics" className="text-primary underline underline-offset-2">
                performance metrics
              </Link>
              .
            </p>
          </>
        )}
      </div>
    </AppShell>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div
      className={
        accent
          ? "rounded-2xl border border-primary/30 bg-primary/10 p-4"
          : "rounded-2xl border border-border/60 bg-gradient-card p-4"
      }
    >
      <Icon className="mb-1.5 h-4 w-4 text-primary" />
      <div className="text-2xl font-bold tabular-nums leading-tight">{value}</div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  icon: Icon,
  muted,
}: {
  label: string;
  value: string | number;
  icon?: typeof Users;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 py-1.5 last:border-0">
      <span
        className={
          muted ? "text-xs text-muted-foreground" : "flex items-center gap-1.5 font-medium"
        }
      >
        {Icon && <Icon className="h-3.5 w-3.5 text-primary" />}
        {label}
      </span>
      <span className="font-bold tabular-nums">{value}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
      {children}
    </div>
  );
}
