// Web push helpers: register the service worker, ask permission, and keep the
// subscription synced to the push_subscriptions table.
import { supabase } from "@/integrations/supabase/client";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function pushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function enablePush(): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!pushSupported()) return { ok: false, error: "This browser doesn't support notifications. On iPhone, add the app to your Home Screen first." };
    const vapid = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
    if (!vapid) return { ok: false, error: "Notifications aren't configured yet." };

    const perm = await Notification.requestPermission();
    if (perm !== "granted") return { ok: false, error: "Notifications were blocked. You can enable them in your browser settings." };

    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid),
    });

    const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return { ok: false, error: "Couldn't create the subscription." };

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Sign in first." };

    const { error } = await supabase.from("push_subscriptions").upsert(
      { user_id: user.id, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth },
      { onConflict: "endpoint" },
    );
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Something went wrong enabling notifications." };
  }
}

export async function disablePush(): Promise<void> {
  try {
    if (!pushSupported()) return;
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      await sub.unsubscribe();
    }
  } catch { /* best effort */ }
}

export async function hasActiveSubscription(): Promise<boolean> {
  try {
    if (!pushSupported() || Notification.permission !== "granted") return false;
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    const sub = await reg?.pushManager.getSubscription();
    return !!sub;
  } catch {
    return false;
  }
}
