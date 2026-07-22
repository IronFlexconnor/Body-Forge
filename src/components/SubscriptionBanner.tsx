import { AlertTriangle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useSubscription } from "@/hooks/useSubscription";

/**
 * Top-of-app notice, shown only when the user genuinely needs to act:
 *  - payment failing (past due)
 *  - canceled but still in the grace period
 *  - trial ending within 3 days
 * A healthy trial or active subscription shows nothing — the app stays clean.
 */
export function SubscriptionBanner() {
  const { sub, isActive, isTrialing, loading } = useSubscription();
  if (loading || !sub) return null;

  if (sub.status === "past_due") {
    return (
      <Notice tone="warning">
        <span>
          <strong>Payment issue.</strong> Update your card to keep your coach.
        </span>
        <Action to="/profile">Fix it</Action>
      </Notice>
    );
  }

  if (
    sub.status === "canceled" &&
    sub.current_period_end &&
    new Date(sub.current_period_end) > new Date()
  ) {
    const days = Math.ceil((new Date(sub.current_period_end).getTime() - Date.now()) / 86400000);
    return (
      <Notice tone="warning">
        <span>
          Access ends in {days} day{days === 1 ? "" : "s"}.
        </span>
        <Action to="/profile">Resume</Action>
      </Notice>
    );
  }

  if (isTrialing && sub.trial_end) {
    const days = Math.max(
      0,
      Math.ceil((new Date(sub.trial_end).getTime() - Date.now()) / 86400000),
    );
    if (days <= 3) {
      return (
        <Notice tone="neutral">
          <span>
            Trial {days === 0 ? "ends today" : `ends in ${days} day${days === 1 ? "" : "s"}`}.
          </span>
          <Action to="/profile">Keep my coach</Action>
        </Notice>
      );
    }
  }

  if (isActive) return null;
  return null;
}

function Notice({ tone, children }: { tone: "neutral" | "warning"; children: React.ReactNode }) {
  return (
    <div
      className={
        tone === "warning"
          ? "flex items-center gap-2 border-b border-warning/30 bg-warning/10 px-5 py-2 text-[13px] text-foreground"
          : "flex items-center gap-2 border-b border-border/60 bg-surface px-5 py-2 text-[13px] text-foreground"
      }
    >
      {tone === "warning" && (
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" aria-hidden="true" />
      )}
      {children}
    </div>
  );
}

function Action({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="ml-auto shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
    >
      {children}
    </Link>
  );
}
