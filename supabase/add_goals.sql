CREATE TABLE IF NOT EXISTS public.goals (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year         int  NOT NULL CHECK (year >= 2024),
  month        int  NOT NULL CHECK (month BETWEEN 1 AND 12),
  target_cash  numeric(12,2) NOT NULL DEFAULT 0,
  target_closes int          NOT NULL DEFAULT 0,
  target_revenue numeric(12,2) NOT NULL DEFAULT 0,
  updated_at   timestamptz  NOT NULL DEFAULT now(),
  UNIQUE (year, month)
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- Lecture : tous les authentifiés
CREATE POLICY "goals: select authenticated"
  ON public.goals FOR SELECT TO authenticated USING (true);

-- Écriture : admin et csm uniquement
CREATE POLICY "goals: admin/csm write"
  ON public.goals FOR ALL TO authenticated
  USING     ((SELECT get_my_role()) IN ('admin', 'csm'))
  WITH CHECK ((SELECT get_my_role()) IN ('admin', 'csm'));
