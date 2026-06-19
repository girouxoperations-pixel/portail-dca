-- Auto-create CM followup entries from sales and CSM clients.

-- 1. Add foreign key columns to cm_followups
ALTER TABLE public.cm_followups
  ADD COLUMN IF NOT EXISTS cash_entry_id  uuid REFERENCES public.cash_entries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS csm_client_id  uuid REFERENCES public.csm_clients(id)  ON DELETE SET NULL;

ALTER TABLE public.cm_followups
  ADD CONSTRAINT cm_followups_cash_entry_unique  UNIQUE (cash_entry_id),
  ADD CONSTRAINT cm_followups_csm_client_unique  UNIQUE (csm_client_id);

-- 2. Trigger: new sale → CM followup
CREATE OR REPLACE FUNCTION public.create_cm_followup_on_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.cm_followups (client_name, cm_id, created_by, cash_entry_id)
  VALUES (
    COALESCE(NEW.client_name, 'Client inconnu'),
    NULL,
    NEW.closed_by,
    NEW.id
  )
  ON CONFLICT (cash_entry_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cm_followup_on_sale ON public.cash_entries;
CREATE TRIGGER trg_cm_followup_on_sale
  AFTER INSERT ON public.cash_entries
  FOR EACH ROW EXECUTE FUNCTION public.create_cm_followup_on_sale();

-- 3. Trigger: new CSM client → CM followup
CREATE OR REPLACE FUNCTION public.create_cm_followup_on_csm_client()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.cm_followups (client_name, cm_id, created_at, csm_client_id)
  VALUES (
    NEW.name,
    NULL,
    NEW.enrollment_date::timestamptz,
    NEW.id
  )
  ON CONFLICT (csm_client_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cm_followup_on_csm_client ON public.csm_clients;
CREATE TRIGGER trg_cm_followup_on_csm_client
  AFTER INSERT ON public.csm_clients
  FOR EACH ROW EXECUTE FUNCTION public.create_cm_followup_on_csm_client();

-- 4. Backfill: existing CSM clients → CM followups
INSERT INTO public.cm_followups (client_name, cm_id, created_at, csm_client_id)
SELECT
  name,
  NULL,
  enrollment_date::timestamptz,
  id
FROM public.csm_clients
ON CONFLICT (csm_client_id) DO NOTHING;
