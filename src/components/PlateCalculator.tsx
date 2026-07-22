import { useMemo, useState } from "react";
import { X, Disc3 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { platesFor, DEFAULT_BAR_KG, DEFAULT_BAR_LB } from "@/lib/pr";
import type { WeightUnit } from "@/lib/units";

/**
 * Bottom-sheet plate calculator: enter a target total, see plates per side.
 * Opens pre-filled with the weight the user is about to lift.
 */
export function PlateCalculator({
  initialWeight,
  unit,
  onClose,
}: {
  initialWeight: number | null;
  unit: WeightUnit;
  onClose: () => void;
}) {
  const defaultBar = unit === "kg" ? DEFAULT_BAR_KG : DEFAULT_BAR_LB;
  const [target, setTarget] = useState(
    initialWeight != null && initialWeight > 0 ? String(initialWeight) : "",
  );
  const [bar, setBar] = useState(String(defaultBar));

  const result = useMemo(() => {
    const t = parseFloat(target);
    const b = parseFloat(bar);
    if (!Number.isFinite(t)) return null;
    return platesFor(t, unit, Number.isFinite(b) && b > 0 ? b : defaultBar);
  }, [target, bar, unit, defaultBar]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/85 backdrop-blur-md sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Plate calculator"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl border border-border/60 bg-gradient-card p-6 shadow-card sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
              <Disc3 className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-bold">Plate calculator</h2>
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full bg-surface"
            aria-label="Close plate calculator"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Target total ({unit})
            </span>
            <Input
              inputMode="decimal"
              autoFocus
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder={unit === "kg" ? "100" : "225"}
              className="h-12 text-lg font-semibold"
              aria-label={`Target total weight in ${unit}`}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Bar ({unit})
            </span>
            <Input
              inputMode="decimal"
              value={bar}
              onChange={(e) => setBar(e.target.value)}
              placeholder={String(defaultBar)}
              className="h-12 text-lg font-semibold"
              aria-label={`Bar weight in ${unit}`}
            />
          </label>
        </div>

        {result === null ? (
          <p className="rounded-xl border border-dashed border-border/60 p-4 text-center text-sm text-muted-foreground">
            {target
              ? "Target is below the bar weight."
              : "Enter a target weight to see the plates."}
          </p>
        ) : (
          <div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Load per side
            </div>
            {result.perSide.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border/60 p-4 text-center text-sm text-muted-foreground">
                Empty bar — no plates needed.
              </p>
            ) : (
              <div className="flex flex-wrap items-end gap-2" aria-label="Plates per side">
                {result.perSide.map(({ plate, count }) => (
                  <div key={plate} className="flex items-end gap-1">
                    {Array.from({ length: count }).map((_, i) => (
                      <div
                        key={i}
                        className="grid place-items-center rounded-lg bg-gradient-primary font-bold text-primary-foreground shadow-glow"
                        style={{
                          width: 44,
                          height: Math.max(40, Math.min(88, plate * (unit === "kg" ? 3.2 : 1.7))),
                          fontSize: 12,
                        }}
                      >
                        {plate}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 text-sm text-muted-foreground">
              Bar {result.barWeight}
              {unit} + plates ={" "}
              <span className="font-semibold text-foreground">
                {result.achievedTotal}
                {unit}
              </span>
              {result.remainder > 0 && (
                <span className="ml-1 text-xs">
                  ({result.remainder}
                  {unit} short of target — closest standard load)
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
