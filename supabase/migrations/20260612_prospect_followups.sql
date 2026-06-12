CREATE TABLE public.prospect_followups (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  closer_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  prospect_name text        NOT NULL,
  followup_date date        NOT NULL,
  notes         text,
  done          boolean     NOT NULL DEFAULT false,
  done_date     date,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON public.prospect_followups (closer_id, followup_date);

ALTER TABLE public.prospect_followups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prospect_followups: closer sees own"
  ON public.prospect_followups FOR SELECT TO authenticated
  USING ((SELECT get_my_role()) = 'closer' AND closer_id = auth.uid());

CREATE POLICY "prospect_followups: closer manages own"
  ON public.prospect_followups FOR ALL TO authenticated
  USING ((SELECT get_my_role()) = 'closer' AND closer_id = auth.uid())
  WITH CHECK ((SELECT get_my_role()) = 'closer' AND closer_id = auth.uid());

CREATE POLICY "prospect_followups: admin/csm full access"
  ON public.prospect_followups FOR ALL TO authenticated
  USING  ((SELECT get_my_role()) IN ('admin', 'csm'))
  WITH CHECK ((SELECT get_my_role()) IN ('admin', 'csm'));
