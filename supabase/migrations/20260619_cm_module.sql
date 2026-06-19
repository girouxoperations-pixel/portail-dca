-- ================================================================
-- MODULE CM (Community Manager)
-- ================================================================

-- 1. Extend role CHECK constraint to include 'cm'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'closer', 'setter', 'csm', 'cm'));

-- 2. CM followup tracking table
CREATE TABLE IF NOT EXISTS public.cm_followups (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name    text        NOT NULL,
  cm_id          uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  status         text        NOT NULL DEFAULT 'en_cours'
                             CHECK (status IN ('en_cours', 'pas_reponse_1', 'pas_reponse_2')),
  message_1      boolean     NOT NULL DEFAULT false,
  message_1_date date,
  message_2      boolean     NOT NULL DEFAULT false,
  message_2_date date,
  message_3      boolean     NOT NULL DEFAULT false,
  message_3_date date,
  message_4      boolean     NOT NULL DEFAULT false,
  message_4_date date,
  message_5      boolean     NOT NULL DEFAULT false,
  message_5_date date,
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  created_by     uuid        REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.cm_followups ENABLE ROW LEVEL SECURITY;

-- CM sees only their own followups
CREATE POLICY "cm_followups: cm sees own"
  ON public.cm_followups FOR SELECT TO authenticated
  USING ((SELECT get_my_role()) = 'cm' AND cm_id = auth.uid());

CREATE POLICY "cm_followups: cm update own"
  ON public.cm_followups FOR UPDATE TO authenticated
  USING  ((SELECT get_my_role()) = 'cm' AND cm_id = auth.uid())
  WITH CHECK ((SELECT get_my_role()) = 'cm' AND cm_id = auth.uid());

CREATE POLICY "cm_followups: cm insert own"
  ON public.cm_followups FOR INSERT TO authenticated
  WITH CHECK ((SELECT get_my_role()) = 'cm' AND cm_id = auth.uid());

-- Admin / CSM full access
CREATE POLICY "cm_followups: admin/csm full access"
  ON public.cm_followups FOR ALL TO authenticated
  USING     ((SELECT get_my_role()) IN ('admin', 'csm'))
  WITH CHECK ((SELECT get_my_role()) IN ('admin', 'csm'));
