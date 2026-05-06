import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { PaywallModal } from "@/components/PaywallModal";
import { useSubscription } from "@/hooks/useSubscription";

export const Route = createFileRoute("/pricing")({
  head: () => ({ meta: [{ title: "Pricing — Body Forge" }] }),
  component: Pricing,
});

function Pricing() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const { isActive } = useSubscription();

  return (
    <div className="min-h-dvh bg-background">
      <div className="sticky top-0 z-10 border-b border-border/60 bg-background/80 px-5 py-4 backdrop-blur-xl">
        <button onClick={() => navigate({ to: "/" })} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      </div>
      <div className="mx-auto max-w-md px-5 py-8">
        {isActive ? (
          <div className="rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/15 to-primary/5 p-6 text-center">
            <h2 className="text-2xl font-bold">You're already a member 💪</h2>
            <p className="mt-2 text-sm text-muted-foreground">Manage your plan anytime from Profile.</p>
          </div>
        ) : (
          <PaywallModal open={open} onClose={() => { setOpen(false); navigate({ to: "/" }); }} reason="Pick the plan that matches your goals." />
        )}
      </div>
    </div>
  );
}
