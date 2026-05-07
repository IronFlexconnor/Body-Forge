import { useState } from "react";
import { Sparkles, Crown, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { PRICE_PRO, PRICE_ELITE } from "@/lib/stripe";
import { StripeEmbeddedCheckout } from "./StripeEmbeddedCheckout";
import { PaymentTestModeBanner } from "./PaymentTestModeBanner";

type Tier = "pro" | "elite";

const TIERS: Record<Tier, {
  name: string;
  price: string;
  priceId: string;
  tagline: string;
  perks: string[];
  highlight: boolean;
  icon: typeof Sparkles;
}> = {
  pro: {
    name: "Starter Coach",
    price: "$14.99",
    priceId: PRICE_PRO,
    tagline: "The basics to stay on track",
    icon: Sparkles,
    highlight: false,
    perks: [
      "30 AI coach messages / day",
      "Standard adaptive program",
      "5 video form checks / month",
      "Core meal library (1,500 recipes)",
      "Weekly auto-adjustments",
      "Basic readiness insights",
    ],
  },
  elite: {
    name: "Elite AI Coach",
    price: "$19.99",
    priceId: PRICE_ELITE,
    tagline: "Best value — your full-time elite trainer",
    icon: Crown,
    highlight: true,
    perks: [
      "UNLIMITED AI coach chat 24/7",
      "UNLIMITED video form analysis",
      "Real-time program auto-adjustments",
      "Full 5,000+ recipe vault + saved favorites",
      "Senior-safe geriatric programs",
      "Priority GPT-5 / Gemini Pro responses",
      "Advanced nutrition deep-dives & macro coaching",
      "Daily insights + exportable progress reports",
      "Early access to every new feature",
    ],
  },
};

interface PaywallProps {
  open: boolean;
  onClose: () => void;
  /** What feature triggered the paywall — shown in header copy */
  reason?: string;
  /** Recommend tier (defaults to Elite — best value) */
  recommend?: Tier;
}

export function PaywallModal({ open, onClose, reason, recommend = "elite" }: PaywallProps) {
  const { user } = useAuth();
  const [selected, setSelected] = useState<Tier | null>(null);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-md sm:items-center">
      <div className="relative max-h-[95dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border/60 bg-gradient-card shadow-card sm:rounded-3xl">
        <PaymentTestModeBanner />
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-surface text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {selected ? (
          <div className="p-5">
            <button onClick={() => setSelected(null)} className="mb-4 text-sm text-muted-foreground hover:text-foreground">
              ← Back to plans
            </button>
            <h2 className="mb-1 text-xl font-bold">Start your 7-day free trial</h2>
            <p className="mb-5 text-sm text-muted-foreground">{TIERS[selected].name} — cancel anytime before day 7 and pay nothing.</p>
            <StripeEmbeddedCheckout
              priceId={TIERS[selected].priceId}
              customerEmail={user?.email ?? undefined}
              userId={user?.id}
            />
          </div>
        ) : (
          <div className="px-5 pb-7 pt-10">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
              <Sparkles className="h-3 w-3" /> 7-day free trial
            </div>
            <h2 className="mt-2 text-3xl font-bold leading-tight tracking-tight">
              Unlock your <span className="text-gradient-primary">elite coach</span>.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {reason ?? "Free forever has its limits. Go further with unlimited coaching, video form analysis, and adaptive nutrition."}
            </p>

            <div className="mt-6 space-y-3">
              {(["elite", "pro"] as Tier[]).map((key) => {
                const t = TIERS[key];
                const Icon = t.icon;
                const isRec = key === recommend;
                return (
                  <button
                    key={key}
                    onClick={() => setSelected(key)}
                    className={cn(
                      "group relative w-full overflow-hidden rounded-2xl border p-5 text-left transition-all",
                      isRec
                        ? "border-primary/60 bg-gradient-to-br from-primary/15 to-primary/5 shadow-glow"
                        : "border-border/60 bg-surface hover:border-primary/30",
                    )}
                  >
                    {isRec && (
                      <span className="absolute right-4 top-4 rounded-full bg-gradient-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-glow">
                        Recommended
                      </span>
                    )}
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "grid h-11 w-11 place-items-center rounded-xl",
                        isRec ? "bg-gradient-primary text-primary-foreground shadow-glow" : "bg-primary/15 text-primary",
                      )}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2">
                          <h3 className="text-lg font-bold">{t.name}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground">{t.tagline}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold tabular-nums">{t.price}</div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">/month</div>
                      </div>
                    </div>
                    <ul className="mt-4 space-y-1.5 text-sm">
                      {t.perks.map((p) => (
                        <li key={p} className="flex items-start gap-2">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span className="text-foreground/90">{p}</span>
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>

            <Button
              onClick={() => setSelected(recommend)}
              className="mt-5 h-13 w-full rounded-xl bg-gradient-primary font-semibold text-primary-foreground shadow-glow"
            >
              Start 7-day free trial
            </Button>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              Card required. We'll remind you before day 7. Cancel anytime in Profile → Manage subscription.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/** Tiny banner-style upgrade pill the chat/nutrition pages can drop inline. */
export function UpgradeInlineBanner({ onClick, message }: { onClick: () => void; message: string }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-primary/40 bg-gradient-to-r from-primary/15 to-primary/5 p-4 text-left transition-colors hover:border-primary/70"
    >
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <div className="text-sm font-semibold">{message}</div>
        <div className="text-[11px] text-muted-foreground">Tap to start your 7-day free trial</div>
      </div>
      <Loader2 className="hidden" />
    </button>
  );
}
