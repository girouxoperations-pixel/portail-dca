-- Allow ISO week numbers (1–53) instead of quarter-relative (1–13)
ALTER TABLE public.weekly_perf
  DROP CONSTRAINT IF EXISTS weekly_perf_week_number_check,
  ADD CONSTRAINT weekly_perf_week_number_check
    CHECK (week_number >= 1 AND week_number <= 53);
