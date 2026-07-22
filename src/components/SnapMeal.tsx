import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Camera, Check, Loader2, RefreshCcw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Estimate = {
  name: string;
  items?: { food: string; portion?: string; calories?: number }[];
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: "high" | "medium" | "low" | "none";
  tip?: string;
};

/** Downscale a photo to a compact JPEG data URL before sending to the AI. */
async function toDataUrl(file: File, maxDim = 1024): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error("Couldn't read that image"));
      img.src = url;
    });
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

const CONFIDENCE_LABEL: Record<string, string> = {
  high: "High confidence",
  medium: "Good estimate",
  low: "Rough estimate",
};

/**
 * Snap-a-Meal: photo → AI calorie/macro estimate → one tap to log.
 * The user always confirms before anything is written to their log.
 */
export function SnapMeal({ onLogged }: { onLogged?: () => void }) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [logging, setLogging] = useState(false);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [highlight, setHighlight] = useState(false);

  // Home-screen quick action sets this flag so we draw the eye on arrival.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("forge:open-snap")) {
      sessionStorage.removeItem("forge:open-snap");
      setHighlight(true);
      setTimeout(() => cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
      setTimeout(() => setHighlight(false), 2600);
    }
  }, []);

  const pick = () => inputRef.current?.click();

  const onFile = async (f: File | null) => {
    if (!f) return;
    setBusy(true);
    setEstimate(null);
    try {
      const dataUrl = await toDataUrl(f);
      setPreview(dataUrl);
      const { data, error } = await supabase.functions.invoke("analyze-meal", { body: { image: dataUrl } });
      if (error) {
        // Supabase wraps non-2xx — surface the function's message when we can.
        const ctx = (error as any)?.context;
        let payload: any = null;
        try { payload = ctx ? await ctx.json() : null; } catch { /* ignore */ }
        if (payload?.code === "meal_photo_daily_limit") {
          toast.error(payload.message);
          navigate({ to: "/pricing" });
          return;
        }
        toast.error(payload?.message ?? "Couldn't analyze that photo — try again.");
        setPreview(null);
        return;
      }
      if (data?.error || !data?.estimate) {
        toast.error(data?.message ?? "Couldn't spot food in that photo — try a clearer shot.");
        setPreview(null);
        return;
      }
      setEstimate(data.estimate as Estimate);
    } catch (e: any) {
      toast.error(e?.message ?? "Something went wrong reading the photo.");
      setPreview(null);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const logIt = async () => {
    if (!estimate) return;
    setLogging(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from("meal_logs").insert({
        user_id: user.id,
        name: estimate.name,
        calories: Math.round(estimate.calories ?? 0),
        protein_g: Math.round(estimate.protein_g ?? 0),
        carbs_g: Math.round(estimate.carbs_g ?? 0),
        fat_g: Math.round(estimate.fat_g ?? 0),
      });
      if (error) throw error;
      toast.success(`📸 Logged ${estimate.name} — ${Math.round(estimate.calories)} kcal`);
      setEstimate(null);
      setPreview(null);
      onLogged?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't log the meal");
    } finally {
      setLogging(false);
    }
  };

  const reset = () => { setEstimate(null); setPreview(null); };

  return (
    <div
      ref={cardRef}
      className={`mb-5 overflow-hidden rounded-3xl border bg-gradient-card shadow-card transition-all ${highlight ? "border-primary shadow-glow" : "border-primary/30"}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />

      {!preview && !busy && (
        <button onClick={pick} className="flex w-full items-center gap-4 p-4 text-left">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
            <Camera className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Snap your meal</span>
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">AI</span>
            </div>
            <p className="truncate text-sm text-muted-foreground">Photo → calories & macros, logged in one tap</p>
          </div>
          <Sparkles className="h-5 w-5 shrink-0 text-primary" />
        </button>
      )}

      {busy && (
        <div className="flex items-center gap-4 p-4">
          {preview && <img src={preview} alt="Your meal" className="h-16 w-16 shrink-0 rounded-2xl object-cover" />}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" /> Coach is reading your plate…
          </div>
        </div>
      )}

      {estimate && preview && !busy && (
        <div className="p-4">
          <div className="mb-3 flex items-start gap-3">
            <img src={preview} alt="Your meal" className="h-20 w-20 shrink-0 rounded-2xl object-cover" />
            <div className="min-w-0 flex-1">
              <div className="font-semibold leading-tight">{estimate.name}</div>
              <div className="mt-0.5 text-2xl font-extrabold tabular-nums leading-none">
                {Math.round(estimate.calories)}<span className="ml-1 text-sm font-normal text-muted-foreground">kcal</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                P {Math.round(estimate.protein_g)}g · C {Math.round(estimate.carbs_g)}g · F {Math.round(estimate.fat_g)}g
                {estimate.confidence && CONFIDENCE_LABEL[estimate.confidence] && (
                  <span className="ml-2 rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold">{CONFIDENCE_LABEL[estimate.confidence]}</span>
                )}
              </div>
            </div>
            <button onClick={reset} aria-label="Dismiss" className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border/60 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          {Array.isArray(estimate.items) && estimate.items.length > 1 && (
            <ul className="mb-3 space-y-1 rounded-2xl bg-surface p-3 text-xs text-muted-foreground">
              {estimate.items.slice(0, 5).map((it, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span className="truncate">{it.food}{it.portion ? ` · ${it.portion}` : ""}</span>
                  {typeof it.calories === "number" && <span className="shrink-0 tabular-nums">{Math.round(it.calories)} kcal</span>}
                </li>
              ))}
            </ul>
          )}

          {estimate.tip && <p className="mb-3 text-xs text-muted-foreground">💡 {estimate.tip}</p>}

          <div className="flex gap-2">
            <Button onClick={logIt} disabled={logging} className="h-11 flex-1 rounded-xl bg-gradient-primary font-semibold text-primary-foreground shadow-glow">
              {logging ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />} Log this meal
            </Button>
            <Button onClick={pick} variant="outline" className="h-11 rounded-xl">
              <RefreshCcw className="mr-2 h-4 w-4" /> Retake
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
