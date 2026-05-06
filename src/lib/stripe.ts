import { loadStripe, Stripe } from "@stripe/stripe-js";

export type StripeEnv = "sandbox" | "live";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;
const environment: StripeEnv = clientToken?.startsWith("pk_test_") ? "sandbox" : "live";

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    if (!clientToken) throw new Error("VITE_PAYMENTS_CLIENT_TOKEN is not set");
    stripePromise = loadStripe(clientToken);
  }
  return stripePromise;
}

export function getStripeEnvironment(): StripeEnv {
  return environment;
}

export function isTestMode(): boolean {
  return environment === "sandbox";
}

// Plan / price ID constants — used everywhere in the app
export const PRICE_PRO = "pro_coach_monthly";
export const PRICE_ELITE = "elite_ai_coach_monthly";

export const PRO_PRICE_IDS = [PRICE_PRO];
export const ELITE_PRICE_IDS = [PRICE_ELITE];
export const PAID_PRICE_IDS = [PRICE_PRO, PRICE_ELITE];

export type PlanTier = "free" | "pro" | "elite";

export const PLAN_BY_PRICE: Record<string, PlanTier> = {
  [PRICE_PRO]: "pro",
  [PRICE_ELITE]: "elite",
};
