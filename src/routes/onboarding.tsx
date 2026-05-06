import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, ArrowLeft, Flame, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  loadOnboarding,
  markOnboarded,
  saveOnboarding,
  type OnboardingData,
} from "@/lib/onboarding";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Get Started — Body Forge AI Coach" },
      { name: "description", content: "Build your personalized AI coaching profile in under 2 minutes." },
    ],
  }),
  component: Onboarding,
});

const goals = ["Fat Loss", "Build Muscle", "Get Stronger", "Endurance", "Mobility", "General Health", "Sport-Specific"];
const levels = ["Beginner", "Intermediate", "Advanced"];
const genders = ["Male", "Female", "Other"];
const equipmentOptions = ["Bodyweight", "Dumbbells", "Barbell", "Resistance Bands", "Pull-up Bar", "Full Gym", "Cardio Machines"];
const diets = ["No Preference", "High Protein", "Vegetarian", "Vegan", "Keto", "Mediterranean"];

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<Partial<OnboardingData>>(() => ({
    daysPerWeek: 4,
    sessionLength: 45,
    equipment: [],
    ...loadOnboarding(),
  }));

  const update = <K extends keyof OnboardingData>(k: K, v: OnboardingData[K]) =>
    setData((d) => {
      const next = { ...d, [k]: v };
      saveOnboarding(next);
      return next;
    });

  const toggleEquip = (e: string) => {
    const set = new Set(data.equipment ?? []);
    set.has(e) ? set.delete(e) : set.add(e);
    update("equipment", Array.from(set));
  };

  const steps = useMemo(
    () => [
      {
        title: "What should your coach call you?",
        subtitle: "Let's make this personal.",
        valid: !!data.name?.trim(),
        body: (
          <Input
            autoFocus
            placeholder="Your name"
            value={data.name ?? ""}
            onChange={(e) => update("name", e.target.value)}
            className="h-14 text-lg"
          />
        ),
      },
      {
        title: "Tell us about you",
        subtitle: "Helps us calibrate intensity & recovery.",
        valid: !!data.age && !!data.gender,
        body: (
          <div className="space-y-4">
            <Input type="number" placeholder="Age" value={data.age ?? ""} onChange={(e) => update("age", e.target.value)} className="h-14 text-lg" />
            <Chips options={genders} value={data.gender} onSelect={(v) => update("gender", v)} />
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Weight (kg)" value={data.weight ?? ""} onChange={(e) => update("weight", e.target.value)} className="h-14" />
              <Input placeholder="Height (cm)" value={data.height ?? ""} onChange={(e) => update("height", e.target.value)} className="h-14" />
            </div>
          </div>
        ),
      },
      {
        title: "Your experience level",
        subtitle: "Be honest — your coach adapts every week.",
        valid: !!data.level,
        body: <ChipsLarge options={levels} value={data.level} onSelect={(v) => update("level", v)} />,
      },
      {
        title: "What's your #1 goal?",
        subtitle: "We'll architect your program around this.",
        valid: !!data.goal,
        body: <ChipsLarge options={goals} value={data.goal} onSelect={(v) => update("goal", v)} />,
      },
      {
        title: "Your schedule",
        subtitle: "Quality over quantity — we'll make every session count.",
        valid: true,
        body: (
          <div className="space-y-6">
            <Slider label="Training days / week" value={data.daysPerWeek ?? 4} min={2} max={7} onChange={(v) => update("daysPerWeek", v)} suffix="days" />
            <Slider label="Session length" value={data.sessionLength ?? 45} min={15} max={120} step={5} onChange={(v) => update("sessionLength", v)} suffix="min" />
          </div>
        ),
      },
      {
        title: "What equipment do you have?",
        subtitle: "Pick everything available to you.",
        valid: (data.equipment?.length ?? 0) > 0,
        body: (
          <div className="flex flex-wrap gap-2">
            {equipmentOptions.map((e) => {
              const on = data.equipment?.includes(e);
              return (
                <button
                  key={e}
                  onClick={() => toggleEquip(e)}
                  className={cn(
                    "rounded-full border px-4 py-2.5 text-sm font-medium transition-all",
                    on ? "border-primary bg-primary/15 text-primary shadow-glow" : "border-border bg-surface text-foreground hover:border-primary/50"
                  )}
                >
                  {on && <Check className="mr-1.5 inline h-3.5 w-3.5" />}{e}
                </button>
              );
            })}
          </div>
        ),
      },
      {
        title: "Diet preference",
        subtitle: "Used for nutrition & meal suggestions.",
        valid: !!data.diet,
        body: <ChipsLarge options={diets} value={data.diet} onSelect={(v) => update("diet", v)} />,
      },
      {
        title: "Any injuries or limitations?",
        subtitle: "Optional — but it helps us keep you safe.",
        valid: true,
        body: (
          <Textarea
            placeholder="e.g. Lower back tightness, left knee surgery 2022..."
            value={data.injuries ?? ""}
            onChange={(e) => update("injuries", e.target.value)}
            rows={5}
            className="text-base"
          />
        ),
      },
    ],
    [data]
  );

  const current = steps[step];
  const isLast = step === steps.length - 1;
  const progress = ((step + 1) / steps.length) * 100;

  const next = () => {
    if (!current.valid) return;
    if (isLast) {
      markOnboarded();
      navigate({ to: "/" });
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <div className="min-h-dvh bg-gradient-hero">
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-6 pt-10 pb-8">
        {/* Progress */}
        <div className="mb-8 flex items-center gap-3">
          <button
            onClick={() => (step > 0 ? setStep((s) => s - 1) : navigate({ to: "/welcome" }))}
            className="grid h-9 w-9 place-items-center rounded-full bg-surface text-muted-foreground hover:text-foreground"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
            <div className="h-full bg-gradient-primary transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-xs font-medium text-muted-foreground tabular-nums">
            {step + 1}/{steps.length}
          </span>
        </div>

        {/* Body */}
        <div className="flex-1">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Flame className="h-3.5 w-3.5" /> Step {step + 1}
          </div>
          <h1 className="mb-2 text-3xl font-bold tracking-tight">{current.title}</h1>
          <p className="mb-8 text-muted-foreground">{current.subtitle}</p>
          <div>{current.body}</div>
        </div>

        {/* CTA */}
        <Button
          onClick={next}
          disabled={!current.valid}
          size="lg"
          className="h-14 w-full rounded-2xl bg-gradient-primary text-base font-semibold text-primary-foreground shadow-glow hover:opacity-95 disabled:opacity-40"
        >
          {isLast ? "Build my program" : "Continue"}
          <ArrowRight className="ml-1 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

function Chips({ options, value, onSelect }: { options: string[]; value?: string; onSelect: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onSelect(o)}
          className={cn(
            "rounded-full border px-4 py-2.5 text-sm font-medium transition-all",
            value === o ? "border-primary bg-primary/15 text-primary" : "border-border bg-surface hover:border-primary/50"
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function ChipsLarge({ options, value, onSelect }: { options: string[]; value?: string; onSelect: (v: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onSelect(o)}
          className={cn(
            "rounded-2xl border bg-gradient-card px-4 py-5 text-left text-base font-semibold transition-all",
            value === o
              ? "border-primary text-primary shadow-glow"
              : "border-border text-foreground hover:border-primary/50"
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function Slider({
  label, value, min, max, step = 1, onChange, suffix,
}: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; suffix: string }) {
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <span className="text-2xl font-bold text-primary tabular-nums">
          {value}
          <span className="ml-1 text-sm font-medium text-muted-foreground">{suffix}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-surface accent-[oklch(0.78_0.17_165)]"
      />
    </div>
  );
}
