-- ROUND20: make every set_logs row carry an explicit, canonical weight unit.
-- History math (PR detection, overload recs, periodization targets) now
-- converts rows to the viewer's current unit — that only works when each
-- row's unit is known. Legacy rows logged before the weight_unit column
-- existed are backfilled from the user's profile preference.

-- 1) Canonicalize the rare "lb" spelling to "lbs" (app writes "lbs" | "kg").
UPDATE public.set_logs SET weight_unit = 'lbs' WHERE weight_unit = 'lb';

-- 2) Backfill NULL units from the user's current profile preference.
UPDATE public.set_logs sl
SET weight_unit = CASE WHEN p.units = 'metric' THEN 'kg' ELSE 'lbs' END
FROM public.profiles p
WHERE sl.weight_unit IS NULL
  AND p.user_id = sl.user_id;

-- 3) Any rows still NULL (no profile row) get the app default (imperial).
UPDATE public.set_logs SET weight_unit = 'lbs' WHERE weight_unit IS NULL;

-- 4) Keep future rows honest.
ALTER TABLE public.set_logs
  ALTER COLUMN weight_unit SET DEFAULT 'lbs';
