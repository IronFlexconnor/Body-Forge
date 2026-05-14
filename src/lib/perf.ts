// Lightweight performance telemetry: captures FCP/LCP/TTFB/load + AI latency
// and batches inserts to perf_events. Best-effort, never blocks UX.
import { supabase } from "@/integrations/supabase/client";

export const APP_RELEASE =
  (import.meta as any).env?.VITE_APP_RELEASE || "preview";

type Event = {
  event_type: string;
  value_ms: number;
  route?: string | null;
  meta?: Record<string, any>;
};

function deviceClass(): "phone" | "tablet" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  if (w < 600) return "phone";
  if (w < 1024) return "tablet";
  return "desktop";
}

const queue: Event[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

async function flush() {
  flushTimer = null;
  if (!queue.length) return;
  const batch = queue.splice(0, queue.length);
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const rows = batch.map((e) => ({
      user_id: user?.id ?? null,
      event_type: e.event_type,
      value_ms: Math.max(0, Math.round(e.value_ms)),
      route: e.route ?? (typeof window !== "undefined" ? window.location.pathname : null),
      device: deviceClass(),
      release: APP_RELEASE,
      meta: e.meta ?? {},
    }));
    await supabase.from("perf_events").insert(rows);
  } catch {
    /* swallow — telemetry must never break the app */
  }
}

export function recordPerf(e: Event) {
  queue.push(e);
  if (!flushTimer) flushTimer = setTimeout(flush, 1500);
}

let installed = false;
export function installPerfObservers() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  // TTFB + load via Navigation Timing
  try {
    const nav = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (nav) {
      if (nav.responseStart) recordPerf({ event_type: "ttfb", value_ms: nav.responseStart });
      const onLoad = () => {
        const t = nav.loadEventEnd || performance.now();
        if (t > 0) recordPerf({ event_type: "load", value_ms: t });
      };
      if (document.readyState === "complete") onLoad();
      else window.addEventListener("load", onLoad, { once: true });
    }
  } catch {}

  // FCP
  try {
    const po = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === "first-contentful-paint") {
          recordPerf({ event_type: "fcp", value_ms: entry.startTime });
          po.disconnect();
        }
      }
    });
    po.observe({ type: "paint", buffered: true });
  } catch {}

  // LCP — capture the final value at page hide
  try {
    let lcp = 0;
    const po = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1] as any;
      if (last?.startTime) lcp = last.startTime;
    });
    po.observe({ type: "largest-contentful-paint", buffered: true });
    const finalize = () => {
      if (lcp > 0) {
        recordPerf({ event_type: "lcp", value_ms: lcp });
        lcp = 0;
      }
      flush();
    };
    addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") finalize();
    });
    addEventListener("pagehide", finalize);
  } catch {}
}
