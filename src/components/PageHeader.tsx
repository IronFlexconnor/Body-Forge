import { ReactNode } from "react";
import { useRouter, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

/**
 * Consistent sub-page header: back button + title (+ optional right slot).
 * Back uses browser history when possible so users return to wherever they
 * came from; falls back to `fallbackTo` (default home) on a fresh load.
 */
export function PageHeader({
  title,
  subtitle,
  fallbackTo = "/",
  right,
}: {
  title: string;
  subtitle?: string;
  fallbackTo?: string;
  right?: ReactNode;
}) {
  const router = useRouter();
  const navigate = useNavigate();
  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
    } else {
      navigate({ to: fallbackTo });
    }
  };
  return (
    <div className="mb-5 flex items-center gap-3">
      <button
        onClick={goBack}
        aria-label="Go back"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border/60 bg-gradient-card text-foreground shadow-card hover:border-primary/40"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="page-title truncate">{title}</h1>
        {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
