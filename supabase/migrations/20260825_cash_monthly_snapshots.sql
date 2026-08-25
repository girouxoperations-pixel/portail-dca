-- Monthly cash snapshots: freeze collected totals for past months
CREATE TABLE IF NOT EXISTS public.cash_monthly_snapshots (
  month_key  TEXT PRIMARY KEY,            -- 'YYYY-MM'
  collected  NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.cash_monthly_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read" ON public.cash_monthly_snapshots FOR SELECT USING (true);
CREATE POLICY "admin write" ON public.cash_monthly_snapshots FOR ALL USING (true) WITH CHECK (true);

-- Pre-populate known end-of-month totals
INSERT INTO public.cash_monthly_snapshots (month_key, collected) VALUES
  ('2026-05', 248108.13),
  ('2026-06', 286551.41),
  ('2026-07', 359524.71)
ON CONFLICT (month_key) DO NOTHING;
