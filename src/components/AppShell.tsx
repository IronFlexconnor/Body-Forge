import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { SubscriptionBanner } from "./SubscriptionBanner";
import { FloatingCoachButton } from "./FloatingCoachButton";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto max-w-lg pb-28">
        <SubscriptionBanner />
        {children}
      </div>
      <FloatingCoachButton />
      <BottomNav />
    </div>
  );
}
