CREATE TABLE IF NOT EXISTS public.client_followups (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_entry_id   uuid        REFERENCES public.cash_entries(id) ON DELETE CASCADE,
  closer_id       uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  client_name     text        NOT NULL,
  close_date      date        NOT NULL,
  due_message1    date        GENERATED ALWAYS AS (close_date + 7)  STORED,
  due_message2    date        GENERATED ALWAYS AS (close_date + 14) STORED,
  due_message3    date        GENERATED ALWAYS AS (close_date + 21) STORED,
  message1_done   boolean     NOT NULL DEFAULT false,
  message1_date   date,
  message2_done   boolean     NOT NULL DEFAULT false,
  message2_date   date,
  message3_done   boolean     NOT NULL DEFAULT false,
  message3_date   date,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_followups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_followups: closer sees own"
  ON public.client_followups FOR SELECT TO authenticated
  USING ((SELECT get_my_role()) = 'closer' AND closer_id = auth.uid());

CREATE POLICY "client_followups: closer update own"
  ON public.client_followups FOR UPDATE TO authenticated
  USING ((SELECT get_my_role()) = 'closer' AND closer_id = auth.uid())
  WITH CHECK ((SELECT get_my_role()) = 'closer' AND closer_id = auth.uid());

CREATE POLICY "client_followups: admin/csm full access"
  ON public.client_followups FOR ALL TO authenticated
  USING ((SELECT get_my_role()) IN ('admin', 'csm'))
  WITH CHECK ((SELECT get_my_role()) IN ('admin', 'csm'));

CREATE OR REPLACE FUNCTION public.create_followup_on_cash_entry()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.client_followups
    (cash_entry_id, closer_id, client_name, close_date)
  VALUES
    (NEW.id, NEW.closed_by, COALESCE(NEW.client_name, 'Client inconnu'), NEW.entry_date)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_cash_entry_created ON public.cash_entries;
CREATE TRIGGER on_cash_entry_created
  AFTER INSERT ON public.cash_entries
  FOR EACH ROW EXECUTE FUNCTION public.create_followup_on_cash_entry();
