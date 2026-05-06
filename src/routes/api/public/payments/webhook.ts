import { createFileRoute } from "@tanstack/react-router";
import type Stripe from "stripe";
import {
  type StripeEnv,
  createStripeClient,
  getWebhookSecret,
} from "@/lib/stripe.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const envParam = url.searchParams.get("env");
        const env: StripeEnv = envParam === "live" ? "live" : "sandbox";

        const signature = request.headers.get("stripe-signature");
        if (!signature) return new Response("Missing signature", { status: 400 });

        const body = await request.text();
        const stripe = createStripeClient(env);

        let event: Stripe.Event;
        try {
          event = await stripe.webhooks.constructEventAsync(
            body,
            signature,
            getWebhookSecret(env),
          );
        } catch (err) {
          console.error("[webhook] signature verification failed", err);
          return new Response("Invalid signature", { status: 401 });
        }

        try {
          await handleEvent(event, env, stripe);
        } catch (err) {
          console.error("[webhook] handler error", event.type, err);
          return new Response("Handler error", { status: 500 });
        }
        return new Response("ok");
      },
    },
  },
});

async function handleEvent(event: Stripe.Event, env: StripeEnv, stripe: Stripe) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "subscription" && session.subscription) {
        const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        const sub = await stripe.subscriptions.retrieve(subId);
        await upsertSubscription(sub, env);
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await upsertSubscription(sub, env);
      break;
    }
    default:
      // ignore other events
      break;
  }
}

async function upsertSubscription(sub: Stripe.Subscription, env: StripeEnv) {
  const userId = (sub.metadata as Record<string, string> | null)?.userId;
  if (!userId) {
    console.warn("[webhook] subscription has no userId metadata", sub.id);
    return;
  }

  const item = sub.items.data[0];
  const priceObj = item?.price;
  // Prefer human-readable IDs: lookup_key, then metadata.lovable_external_id,
  // and finally fall back to the raw Stripe price id so the column is never null.
  const priceLookup =
    priceObj?.lookup_key ??
    (priceObj?.metadata as Record<string, string> | undefined)?.lovable_external_id ??
    priceObj?.id ??
    null;
  const productId = typeof priceObj?.product === "string" ? priceObj.product : priceObj?.product?.id ?? null;

  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null;

  const periodStart = (item?.current_period_start ?? (sub as unknown as { current_period_start?: number }).current_period_start);
  const periodEnd = (item?.current_period_end ?? (sub as unknown as { current_period_end?: number }).current_period_end);

  const row = {
    user_id: userId,
    environment: env,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    price_id: priceLookup,
    product_id: productId,
    status: sub.status,
    current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: sub.cancel_at_period_end ?? false,
    trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
    metadata: (sub.metadata ?? {}) as Record<string, string>,
  };

  const { error } = await supabaseAdmin
    .from("subscriptions")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .upsert(row as any, { onConflict: "stripe_subscription_id" });
  if (error) throw error;
}
