import { Ruler } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Height picker with TWO required inputs: Feet (4–7) and Inches (0–11).
 * Both must be selected. Always displayed in ft/in regardless of weight unit.
 */
export function HeightPicker({
  feet,
  inches,
  onChange,
  className,
  compact = false,
}: {
  feet: number | null;
  inches: number | null;
  onChange: (feet: number | null, inches: number | null) => void;
  className?: string;
  compact?: boolean;
}) {
  return (
    <section className={cn("space-y-4", className)} aria-labelledby="height-title">
      {!compact && (
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
            <Ruler className="h-5 w-5" />
          </div>
          <div>
            <h2 id="height-title" className="text-lg font-bold tracking-tight">
              What is your height?
            </h2>
            <p className="text-sm text-muted-foreground">
              Used to personalize your program and bodyweight scaling.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Feet">
          <Select
            value={feet != null ? String(feet) : undefined}
            onValueChange={(v) => onChange(parseInt(v, 10), inches)}
          >
            <SelectTrigger className="h-14 rounded-2xl border-2 bg-gradient-card text-lg font-semibold">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {[4, 5, 6, 7].map((f) => (
                <SelectItem key={f} value={String(f)}>{f} ft</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Inches">
          <Select
            value={inches != null ? String(inches) : undefined}
            onValueChange={(v) => onChange(feet, parseInt(v, 10))}
          >
            <SelectTrigger className="h-14 rounded-2xl border-2 bg-gradient-card text-lg font-semibold">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => i).map((i) => (
                <SelectItem key={i} value={String(i)}>{i} in</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      {!compact && (
        <p className="text-xs text-muted-foreground">
          Both fields are required. You can update this anytime in Settings.
        </p>
      )}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

export const ftInToCm = (ft: number, inches: number) => (ft * 12 + inches) * 2.54;
export const cmToFtIn = (cm: number | null | undefined): { feet: number | null; inches: number | null } => {
  if (cm == null || isNaN(Number(cm))) return { feet: null, inches: null };
  const totalIn = Math.round(Number(cm) / 2.54);
  return { feet: Math.floor(totalIn / 12), inches: totalIn % 12 };
};
export const formatFtIn = (cm: number | null | undefined): string => {
  const { feet, inches } = cmToFtIn(cm);
  if (feet == null || inches == null) return "—";
  return `${feet}′ ${inches}″`;
};
