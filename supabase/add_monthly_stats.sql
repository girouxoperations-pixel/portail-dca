-- ================================================================
-- TABLE : monthly_stats
-- Stocke les KPIs mensuels par closer ET pour l'équipe complète.
-- source = 'closer' | 'team' | 'vsl' | 'webi'
-- ================================================================

CREATE TABLE IF NOT EXISTS public.monthly_stats (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  closer_name     text,                         -- nom temporaire avant que le compte soit créé
  source          text        NOT NULL
                              CHECK (source IN ('closer', 'team', 'vsl', 'webi')),
  year            int         NOT NULL CHECK (year >= 2020),
  month           int         NOT NULL CHECK (month BETWEEN 1 AND 12),

  -- Métriques appels
  scheduled_calls int         NOT NULL DEFAULT 0,
  show_calls      int         NOT NULL DEFAULT 0,
  pitch_calls     int         NOT NULL DEFAULT 0,
  closes          int         NOT NULL DEFAULT 0,

  -- Financier
  cash_collected  numeric(12,2) NOT NULL DEFAULT 0,
  revenue         numeric(12,2) NOT NULL DEFAULT 0,

  -- VSL / WEBI spécifique
  budget          numeric(12,2),
  leads           int,
  booked          int,
  showed          int,
  cpl             numeric(10,2),
  cpa             numeric(10,2),

  created_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (source, closer_name, year, month)
);

ALTER TABLE public.monthly_stats ENABLE ROW LEVEL SECURITY;

-- Lecture : tous les authentifiés
CREATE POLICY "monthly_stats: select all authenticated"
  ON public.monthly_stats FOR SELECT TO authenticated
  USING (true);

-- Écriture complète : admin et csm
CREATE POLICY "monthly_stats: admin/csm full access"
  ON public.monthly_stats FOR ALL TO authenticated
  USING     ((SELECT get_my_role()) IN ('admin', 'csm'))
  WITH CHECK ((SELECT get_my_role()) IN ('admin', 'csm'));

-- Index performance
CREATE INDEX IF NOT EXISTS idx_monthly_stats_year_month
  ON public.monthly_stats (year, month);

CREATE INDEX IF NOT EXISTS idx_monthly_stats_user
  ON public.monthly_stats (user_id, year, month);
