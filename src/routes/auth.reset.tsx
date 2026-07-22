import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Lock, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandMark } from "@/components/BrandMark";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/reset")({
  head: () => ({ meta: [{ title: "Set a new password — Body Forge" }] }),
  component: ResetPassword,
});

/**
 * Landing page for the password-recovery email link. Supabase signs the user
 * in from the link's token; here they simply choose a new password.
 */
function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(
        "Couldn't update the password — the reset link may have expired. Request a new one from the sign-in page.",
      );
      return;
    }
    setDone(true);
    toast.success("Password updated");
    setTimeout(() => navigate({ to: "/" }), 1200);
  };

  return (
    <div className="dark grid min-h-dvh place-items-center bg-gradient-hero px-6 text-foreground">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <BrandMark size={36} />
          <span className="font-display text-lg font-extrabold tracking-tight text-white">
            Body Forge
          </span>
        </div>
        <h1 className="mb-1 text-2xl font-bold text-white">Set a new password</h1>
        <p className="mb-6 text-sm text-white/70">
          Choose a new password for your account. You'll be signed in right after.
        </p>
        {done ? (
          <div className="flex items-center gap-2 rounded-2xl border border-primary/40 bg-primary/10 p-4 text-sm font-semibold text-white">
            <Check className="h-4 w-4 text-primary" /> Password updated — taking you to your
            dashboard…
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
              <Input
                type="password"
                autoComplete="new-password"
                placeholder="New password (8+ characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-13 pl-10 text-white placeholder:text-white/50"
                aria-label="New password"
              />
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
              <Input
                type="password"
                autoComplete="new-password"
                placeholder="Confirm new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="h-13 pl-10 text-white placeholder:text-white/50"
                aria-label="Confirm new password"
              />
            </div>
            <Button
              type="submit"
              disabled={busy}
              className="h-13 w-full rounded-xl bg-gradient-primary font-semibold text-primary-foreground shadow-glow"
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Update password
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
