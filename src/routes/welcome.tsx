import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, Video, MessageCircle, ChefHat, ChevronRight, Check, Zap, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "Body Forge AI Coach — Your 24/7 Personal Trainer" },
      { name: "description", content: "Custom plans. Real-time form feedback. Nutrition that actually tastes good. Start your free 7-day trial." },
      { property: "og:title", content: "Body Forge AI Coach — Your 24/7 Personal Trainer" },
      { property: "og:description", content: "Custom plans. Real-time form feedback. Nutrition that actually tastes good." },
    ],
  }),
  component: Welcome,
});

const SLIDES = [
  {
    icon: Zap,
    badge: "Day 1",
    title: "Tell us your goal",
    desc: "Lose fat, gain muscle, train for a sport — Coach builds your plan in 30 seconds.",
    bullets: ["Picks 4–6 best exercises today", "Macros tuned to your body", "Adapts every single day"],
  },
  {
    icon: Video,
    badge: "Anytime",
    title: "Record. Get pro feedback.",
    desc: "Hit a set, film it, get NSCA-grade form cues in seconds — like having a coach beside you.",
    bullets: ["Frame-by-frame breakdown", "Spot weak links instantly", "Fix it next set"],
  },
  {
    icon: ChefHat,
    badge: "Every day",
    title: "Meals you'll actually crave",
    desc: "2,000+ recipes with prep videos. One tap to swap. Always hits your macros.",
    bullets: ["Surprise Me — fresh picks daily", "Prep videos under 60s", "Diet & allergens respected"],
  },
];

function Welcome() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);

  if (showOnboarding) {
    const slide = SLIDES[step];
    const Icon = slide.icon;
    const isLast = step === SLIDES.length - 1;
    return (
      <div className="min-h-dvh bg-gradient-hero">
        <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-6 pt-14 pb-8">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex gap-1.5">
              {SLIDES.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${i === step ? "w-8 bg-primary" : i < step ? "w-4 bg-primary/60" : "w-4 bg-border"}`}
                />
              ))}
            </div>
            <button onClick={() => navigate({ to: "/auth" })} className="text-xs font-medium text-muted-foreground hover:text-foreground">
              Skip
            </button>
          </div>

          <div className="flex flex-1 flex-col justify-center animate-fade-in" key={step}>
            <div className="mx-auto mb-8 grid h-28 w-28 place-items-center rounded-3xl bg-gradient-primary text-primary-foreground shadow-glow animate-scale-in">
              <Icon className="h-14 w-14" strokeWidth={1.8} />
            </div>
            <div className="mb-3 inline-flex w-fit mx-auto items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
              <Sparkles className="h-3 w-3" /> {slide.badge}
            </div>
            <h2 className="text-center text-3xl font-bold leading-tight tracking-tight">{slide.title}</h2>
            <p className="mx-auto mt-3 max-w-sm text-center text-base leading-relaxed text-muted-foreground">
              {slide.desc}
            </p>

            <ul className="mx-auto mt-7 w-full max-w-sm space-y-2.5">
              {slide.bullets.map((b) => (
                <li key={b} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-gradient-card px-4 py-3 text-sm shadow-card">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                    <Check className="h-4 w-4" strokeWidth={3} />
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          </div>

          <Button
            onClick={() => (isLast ? navigate({ to: "/auth" }) : setStep(step + 1))}
            size="lg"
            className="h-14 w-full rounded-2xl bg-gradient-primary text-base font-semibold text-primary-foreground shadow-glow"
          >
            {isLast ? "Start my free 7-day trial" : "Try it now"}
            <ChevronRight className="ml-1 h-5 w-5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-gradient-hero">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -top-32 -right-24 h-80 w-80 rounded-full bg-primary/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />

      <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col px-6 pt-14 pb-8">
        <div className="flex flex-1 flex-col">
          <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary animate-fade-in">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            Trusted by 50,000+ athletes
          </div>

          <h1 className="text-[2.75rem] font-bold leading-[1.05] tracking-tight animate-fade-in">
            Body Forge AI Coach —{" "}
            <span className="text-gradient-primary">Your 24/7 Personal Trainer</span>
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground animate-fade-in">
            Custom plans. Real-time form feedback. Nutrition that actually tastes good.
          </p>

          {/* Quick value props */}
          <div className="mt-7 grid grid-cols-3 gap-2.5">
            <ValueChip icon={Zap} label="Plans in 30s" />
            <ValueChip icon={Video} label="Form analysis" />
            <ValueChip icon={ChefHat} label="2,000+ meals" />
          </div>

          {/* Hero feature card */}
          <div className="relative mt-7 overflow-hidden rounded-3xl border border-primary/30 bg-gradient-card p-5 shadow-card animate-fade-in">
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/25 blur-3xl" />
            <div className="relative flex items-start gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
                <MessageCircle className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Coach Forge</span>
                  <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Online</span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">
                  "Hey! I just built tomorrow's session for you — 4 lifts, 38 minutes, and I swapped in higher-protein dinners. Tap below to get started 💪"
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-3">
          <Button
            onClick={() => navigate({ to: "/auth" })}
            size="lg"
            className="h-16 w-full rounded-2xl bg-gradient-primary text-base font-bold text-primary-foreground shadow-glow hover:scale-[1.01] transition-transform"
          >
            <Sparkles className="mr-2 h-5 w-5" />
            Start My Free 7-Day Trial
          </Button>
          <button
            onClick={() => setShowOnboarding(true)}
            className="flex w-full items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            See how it works <ChevronRight className="h-4 w-4" />
          </button>
          <div className="flex items-center justify-center gap-3 pt-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3 text-primary" /> No credit card</span>
            <span>·</span>
            <span>Cancel anytime</span>
            <span>·</span>
            <Link to="/auth" className="font-medium text-primary hover:underline">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function ValueChip({ icon: Icon, label }: { icon: typeof Zap; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-border/60 bg-gradient-card px-2 py-3 text-center shadow-card">
      <Icon className="h-4 w-4 text-primary" />
      <span className="text-[11px] font-semibold leading-tight">{label}</span>
    </div>
  );
}
