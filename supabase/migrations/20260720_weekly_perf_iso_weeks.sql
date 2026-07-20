-- Convert weekly_perf.week_number from quarter-relative (1-13) to ISO week of year (1-52)
-- Before: Q3 W3 → week 3 within Q3
-- After:  Q3 W3 → week 29 (approx ISO week of year)

UPDATE public.weekly_perf
SET week_number = LEAST(((quarter - 1) * 13 + week_number), 52);

-- Recompute quarter from new ISO week_number
UPDATE public.weekly_perf
SET quarter = CEIL(week_number::numeric / 13)::int;
