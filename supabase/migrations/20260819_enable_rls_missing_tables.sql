-- Enable RLS on tables flagged by Supabase Security Advisor.
-- All app writes go through createAdminClient() (service role) which
-- bypasses RLS, so this only blocks unauthenticated PostgREST access.

-- ── org_chart ────────────────────────────────────────────────────────
ALTER TABLE public.org_chart ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_chart: admin full access"
  ON public.org_chart FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ── pl_months ────────────────────────────────────────────────────────
ALTER TABLE public.pl_months ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pl_months: admin full access"
  ON public.pl_months FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ── csm_commissions ──────────────────────────────────────────────────
ALTER TABLE public.csm_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "csm_commissions: admin/csm/head_csm full access"
  ON public.csm_commissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND (role = 'admin' OR 'csm' = ANY(roles) OR 'head_csm' = ANY(roles))
    )
  );

-- ── csm_tasks ────────────────────────────────────────────────────────
ALTER TABLE public.csm_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "csm_tasks: admin/csm/head_csm full access"
  ON public.csm_tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND (role = 'admin' OR 'csm' = ANY(roles) OR 'head_csm' = ANY(roles))
    )
  );
