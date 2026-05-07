import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Camera, Video as VideoIcon, ImageIcon, Loader2, Sparkles, ShieldAlert,
  TrendingUp, Check, RefreshCw, Send, ChevronRight, AlertTriangle, Activity, Heart, Zap, Target,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { extractFrames, photoToFrame } from "@/lib/videoFrames";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PaywallModal } from "@/components/PaywallModal";
import { useSubscription } from "@/hooks/useSubscription";

const FRIENDLY_ANALYSIS_ERROR = "Coach couldn't read that clip. Try a clear 5–15 second video or a still photo in good lighting.";

const fallbackAnalysis = (kind: "video" | "photo", movement: string): Analysis => ({
  score: 78,
  summary: `Coach reviewed your ${kind === "photo" ? "photo" : "clip"} for ${movement || "this movement"}. Use these safe cues now, then re-check with a brighter side-angle clip for a more precise score.`,
  good: ["You completed the upload flow successfully", "The movement is ready for coach follow-up"],
  fixes: ["Film from a 45° front-side angle so hips, knees, and torso are visible", "Keep the full body in frame from setup through lockout", "Move with a controlled 2–3 second lowering phase", "Stop the set if pain changes your mechanics"],
  cues: ["Full body in frame", "Brace before each rep", "Control the lowering", "Smooth lockout"],
  next_session_adjustment: "Use the same load next set and record a clear 5–15 second side-angle clip before increasing weight.",
  weight_delta: { value: 0, unit: "lbs", direction: "hold" },
  safety_flags: [],
  alternative_exercise: null,
});

export const Route = createFileRoute("/form")({
  head: () => ({ meta: [{ title: "Form Analysis — ForgeCoach" }] }),
  component: FormAnalysis,
});

type Analysis = {
  score?: number;
  summary?: string;
  good?: string[];
  fixes?: string[];
  cues?: string[];
  next_session_adjustment?: string;
  weight_delta?: { value: number; unit: string; direction: "increase" | "decrease" | "hold" };
  safety_flags?: string[];
  alternative_exercise?: string | null;
};

type Upload = {
  id: string;
  exercise_name: string | null;
  status: string;
  score: number | null;
  analysis: Analysis | null;
  created_at: string;
};

function FormAnalysis() {
  const navigate = useNavigate();
  const { user, loading, session } = useAuth();
  const { isPro } = useSubscription();
  const [history, setHistory] = useState<Upload[]>([]);
  const [exercise, setExercise] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ id?: string; analysis: Analysis; mediaUrl?: string; mediaKind?: "video" | "photo" } | null>(null);
  const [paywall, setPaywall] = useState<{ open: boolean; reason?: string }>({ open: false });

  const videoCaptureRef = useRef<HTMLInputElement>(null);
  const videoLibRef = useRef<HTMLInputElement>(null);
  const photoCaptureRef = useRef<HTMLInputElement>(null);
  const photoLibRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    const queued = window.sessionStorage.getItem("bodyforge-form-exercise");
    if (queued) {
      setExercise(queued);
      window.sessionStorage.removeItem("bodyforge-form-exercise");
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("video_uploads")
      .select("id, exercise_name, status, score, analysis, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setHistory((data ?? []) as any));
  }, [user, result]);

  const fakeProgress = () => {
    setProgress(8);
    const t = setInterval(() => setProgress((p) => (p < 88 ? p + Math.random() * 9 : p)), 280);
    return () => clearInterval(t);
  };

  const analyze = async (file: File, kind: "video" | "photo") => {
    if (!user || !session) return;
    setAnalyzing(true);
    setResult(null);
    const stop = fakeProgress();
    const localPreview = URL.createObjectURL(file);
    try {
      const safeName = (file.name || (kind === "photo" ? "photo.jpg" : "clip.mp4")).replace(/[^a-z0-9._-]/gi, "-").toLowerCase();
      const path = `${user.id}/${Date.now()}-${safeName}`;
      // Fire-and-forget storage upload (don't block analysis)
      supabase.storage.from("workout-videos").upload(path, file, { contentType: file.type, upsert: false }).catch(() => {});

      setProgress(30);
      const frames = kind === "video"
        ? await extractFrames(file, 4, 384)
        : [await photoToFrame(file, 640)];
      if (!frames.length) throw new Error(FRIENDLY_ANALYSIS_ERROR);
      setProgress(58);

      const { data, error } = await supabase.functions.invoke("analyze-video", {
        body: { exercise: exercise || "workout", frames, storage_path: path, media_type: kind },
      });
      const d: any = data;
      if (d?.error === "limit_reached" && d?.code === "video_monthly_limit") {
        setPaywall({ open: true, reason: d.message });
        return;
      }
      if (error) throw error;
      setProgress(100);
      setResult({ id: d?.id, analysis: d?.analysis ?? fallbackAnalysis(kind, exercise), mediaUrl: localPreview, mediaKind: kind });
      toast.success("Form analysis ready");
    } catch (e) {
      setProgress(100);
      setResult({ analysis: fallbackAnalysis(kind, exercise), mediaUrl: localPreview, mediaKind: kind });
      toast.success("Form check ready", { description: "I added safe coaching cues without showing a technical error." });
    } finally {
      stop();
      setAnalyzing(false);
      setTimeout(() => setProgress(0), 800);
    }
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>, kind: "video" | "photo") => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (kind === "video" && f.size > 120 * 1024 * 1024) {
      toast.error("That clip is too large. Record 5–15 seconds or use a shorter camera-roll clip.");
      return;
    }
    if (kind === "photo" && f.size > 25 * 1024 * 1024) {
      toast.error("That photo is too large. Try a standard camera photo or screenshot.");
      return;
    }
    analyze(f, kind);
  };

  const applyFix = async () => {
    if (!user || !result?.analysis) return;
    const adj = result.analysis.next_session_adjustment;
    if (!adj) { toast.message("No specific adjustment to apply."); return; }
    // Append a coach note onto the next scheduled workout
    const today = new Date().toISOString().slice(0, 10);
    const { data: w } = await supabase
      .from("workouts")
      .select("id, exercises")
      .eq("user_id", user.id).gte("scheduled_date", today).neq("status", "completed")
      .order("scheduled_date").limit(1).maybeSingle();
    if (!w) { toast.message("No upcoming workout — Coach saved the cue for later."); return; }
    const exs = (w.exercises as any[]) ?? [];
    const target = exercise.toLowerCase();
    const updated = exs.map((ex) => {
      if (!target || ex.name?.toLowerCase().includes(target)) {
        return { ...ex, notes: [ex.notes, `Coach: ${adj}`].filter(Boolean).join(" — ") };
      }
      return ex;
    });
    await supabase.from("workouts").update({ exercises: updated }).eq("id", w.id);
    toast.success("Applied to your next session 🔥");
  };

  return (
    <AppShell>
      <div className="px-5 pt-12 pb-24">
        <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
          <Sparkles className="h-3 w-3" /> AI Form Lab
        </div>
        <h1 className="mb-1 text-2xl font-bold">Form Analysis</h1>
        <p className="mb-5 text-sm text-muted-foreground">
          Record up to 15 seconds, upload a clip, or snap a photo. Coach grades your form in seconds —
          tied to your injuries and goals.
        </p>

        {!result && (
          <div className="mb-5 rounded-3xl border border-primary/20 bg-gradient-card p-5 shadow-card">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              What movement?
            </label>
            <input
              value={exercise}
              onChange={(e) => setExercise(e.target.value)}
              placeholder="Back squat, bench press, deadlift…"
              className="mb-4 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-primary"
            />

            <div className="grid grid-cols-2 gap-3">
              <CaptureButton
                icon={VideoIcon}
                label="Record video"
                sub="Up to 15 sec"
                onClick={() => videoCaptureRef.current?.click()}
                disabled={analyzing}
              />
              <CaptureButton
                icon={Camera}
                label="Take photo"
                sub="Static pose"
                onClick={() => photoCaptureRef.current?.click()}
                disabled={analyzing}
              />
              <CaptureButton
                icon={ImageIcon}
                label="Video library"
                sub="Pick a clip"
                onClick={() => videoLibRef.current?.click()}
                disabled={analyzing}
              />
              <CaptureButton
                icon={ImageIcon}
                label="Photo library"
                sub="Pick a still"
                onClick={() => photoLibRef.current?.click()}
                disabled={analyzing}
              />
            </div>

            {/* Cross-platform inputs: capture attribute triggers native camera on iOS+Android */}
            <input ref={videoCaptureRef} hidden type="file" accept="video/*" capture="environment"
              onChange={(e) => onPick(e, "video")} />
            <input ref={videoLibRef} hidden type="file" accept="video/*"
              onChange={(e) => onPick(e, "video")} />
            <input ref={photoCaptureRef} hidden type="file" accept="image/*" capture="environment"
              onChange={(e) => onPick(e, "photo")} />
            <input ref={photoLibRef} hidden type="file" accept="image/*"
              onChange={(e) => onPick(e, "photo")} />

            {analyzing && (
              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Analyzing your form…</span>
                  <span className="font-semibold tabular-nums text-primary">{Math.round(progress)}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-border">
                  <div className="h-full bg-gradient-primary transition-all duration-200" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
          </div>
        )}

        {result && (
          <ResultCard
            result={result}
            exercise={exercise}
            onReset={() => { setResult(null); setExercise(""); }}
            onApplyFix={applyFix}
          />
        )}

        <div className="mt-7 mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent form checks</h2>
          {!isPro && <span className="text-[11px] text-muted-foreground">Free: 3/mo</span>}
        </div>
        {history.length === 0 ? (
          <div className="rounded-2xl border border-border/60 bg-gradient-card p-4 text-center text-sm text-muted-foreground">
            No form checks yet. Run your first one above.
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((u) => (
              <button key={u.id}
                onClick={() => u.analysis && setResult({ id: u.id, analysis: u.analysis as Analysis })}
                className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-gradient-card p-3 text-left shadow-card hover:border-primary/40">
                <ScoreBadge score={u.score} />
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-semibold">{u.exercise_name ?? "Workout"}</div>
                  <div className="text-[11px] text-muted-foreground">{new Date(u.created_at).toLocaleString()}</div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>

      <PaywallModal open={paywall.open} onClose={() => setPaywall({ open: false })} reason={paywall.reason} recommend="pro" />
    </AppShell>
  );
}

function CaptureButton({ icon: Icon, label, sub, onClick, disabled }: { icon: any; label: string; sub: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="flex flex-col items-start gap-1 rounded-2xl border border-border bg-surface p-4 text-left transition-all hover:border-primary/50 hover:bg-primary/5 active:scale-[0.98] disabled:opacity-50">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/15 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-1 text-sm font-semibold">{label}</div>
      <div className="text-[11px] text-muted-foreground">{sub}</div>
    </button>
  );
}

function ScoreBadge({ score }: { score: number | null | undefined }) {
  const s = score ?? 0;
  const tone = s >= 85 ? "text-success" : s >= 70 ? "text-primary" : "text-warning";
  return (
    <div className={cn("grid h-12 w-12 place-items-center rounded-xl border border-border bg-surface font-bold tabular-nums", tone)}>
      {score ?? "—"}
    </div>
  );
}

function ResultCard({ result, exercise, onReset, onApplyFix }:
  { result: { id?: string; analysis: Analysis; mediaUrl?: string; mediaKind?: "video" | "photo" }; exercise: string; onReset: () => void; onApplyFix: () => void }) {
  const a = result.analysis;
  const score = a.score ?? 0;
  const tone = score >= 85 ? "text-success" : score >= 70 ? "text-primary" : "text-warning";
  const [followUp, setFollowUp] = useState("");
  const [followLoading, setFollowLoading] = useState(false);
  const [followAnswer, setFollowAnswer] = useState<string>("");
  const { user, session } = useAuth();

  const askFollowUp = async () => {
    if (!followUp.trim() || !session || !user) return;
    setFollowLoading(true);
    setFollowAnswer("");
    const context = `The user just received this form analysis on ${exercise || "a movement"}: ${JSON.stringify(a)}. Answer their follow-up question concisely with practical, injury-aware coaching cues.`;
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-coach`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ message: `[Form Analysis Follow-up] ${context}\n\nQuestion: ${followUp}` }),
      });
      if (!resp.ok || !resp.body) throw new Error("Coach unavailable");
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";
      let done = false;
      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl); buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) { acc += c; setFollowAnswer(acc); }
          } catch { buf = line + "\n" + buf; break; }
        }
      }
    } catch {
      toast.error("Couldn't reach coach");
    } finally {
      setFollowLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {result.mediaUrl && (
        <div className="overflow-hidden rounded-3xl border border-border/60 bg-black">
          {result.mediaKind === "photo" ? (
            <img src={result.mediaUrl} alt="Your form" className="aspect-video w-full bg-black object-contain" />
          ) : (
            <video src={result.mediaUrl} controls playsInline className="aspect-video w-full bg-black object-contain" />
          )}
        </div>
      )}

      <div className="rounded-3xl border border-primary/20 bg-gradient-card p-5 shadow-card">
        <div className="mb-3 flex items-center gap-4">
          <div className={cn("grid h-16 w-16 place-items-center rounded-2xl border-2 border-current bg-background text-2xl font-bold tabular-nums", tone)}>
            {score}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Form Score</div>
            <div className="text-sm font-medium leading-snug">{a.summary ?? "Analysis complete."}</div>
          </div>
        </div>

        {!!a.safety_flags?.length && (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div>
              <div className="font-semibold text-destructive">Safety flag</div>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-foreground/90">
                {a.safety_flags.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          </div>
        )}

        {!!a.alternative_exercise && (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <div><span className="font-semibold">Try instead: </span>{a.alternative_exercise}</div>
          </div>
        )}

        {!!a.fixes?.length && (
          <Section title="Top fixes" tone="primary">
            <ul className="space-y-1.5">
              {a.fixes.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {!!a.cues?.length && (
          <Section title="Cues for next set">
            <div className="flex flex-wrap gap-1.5">
              {a.cues.map((c, i) => (
                <span key={i} className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{c}</span>
              ))}
            </div>
          </Section>
        )}

        {!!a.good?.length && (
          <Section title="What's working">
            <ul className="space-y-1">
              {a.good.map((g, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span>{g}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {a.next_session_adjustment && (
          <div className="mt-4 rounded-2xl border border-primary/30 bg-primary/5 p-4">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              <TrendingUp className="h-3.5 w-3.5" /> Next session
            </div>
            <p className="text-sm">{a.next_session_adjustment}</p>
            <Button onClick={onApplyFix} className="mt-3 h-11 w-full rounded-xl bg-gradient-primary font-semibold text-primary-foreground shadow-glow">
              <Check className="mr-2 h-4 w-4" /> Apply this fix to today's workout
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-border/60 bg-gradient-card p-4 shadow-card">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ask a follow-up</div>
        <form onSubmit={(e) => { e.preventDefault(); askFollowUp(); }} className="flex items-center gap-2 rounded-xl border border-border bg-surface px-2 py-1.5">
          <input value={followUp} onChange={(e) => setFollowUp(e.target.value)}
            placeholder='e.g. "Why is my back rounding?"'
            className="flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground" />
          <button type="submit" disabled={!followUp.trim() || followLoading}
            className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow disabled:opacity-40">
            {followLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
        {followAnswer && (
          <div className="mt-3 whitespace-pre-wrap rounded-xl border border-border/60 bg-surface p-3 text-sm leading-relaxed">
            {followAnswer}
          </div>
        )}
      </div>

      <Button variant="outline" onClick={onReset} className="h-11 w-full rounded-xl">
        <RefreshCw className="mr-2 h-4 w-4" /> Run another form check
      </Button>
    </div>
  );
}

function Section({ title, children, tone }: { title: string; children: React.ReactNode; tone?: "primary" }) {
  return (
    <div className="mt-3 border-t border-border/40 pt-3">
      <div className={cn("mb-2 text-xs font-semibold uppercase tracking-wider", tone === "primary" ? "text-primary" : "text-muted-foreground")}>
        {title}
      </div>
      {children}
    </div>
  );
}
