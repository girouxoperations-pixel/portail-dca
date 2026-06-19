-- Add onboarding_date to cash_entries and csm_clients

ALTER TABLE public.cash_entries
  ADD COLUMN IF NOT EXISTS onboarding_date date;

ALTER TABLE public.csm_clients
  ADD COLUMN IF NOT EXISTS onboarding_date date;

-- Update the CSM insert trigger to copy onboarding_date
CREATE OR REPLACE FUNCTION public.create_csm_client_on_cash_entry()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.csm_clients
    (cash_entry_id, closer_id, name, enrollment_date, payment_type, onboarding_date)
  VALUES (
    NEW.id,
    NEW.closed_by,
    COALESCE(NEW.client_name, 'Cliente inconnue'),
    NEW.entry_date,
    CASE
      WHEN NEW.methode = 'Financement' THEN 'financement'
      ELSE 'pif'
    END,
    NEW.onboarding_date
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

-- Propagate onboarding_date changes from cash_entries to linked csm_clients
CREATE OR REPLACE FUNCTION public.sync_onboarding_date_to_csm()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.onboarding_date IS DISTINCT FROM OLD.onboarding_date THEN
    UPDATE public.csm_clients
    SET onboarding_date = NEW.onboarding_date
    WHERE cash_entry_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_onboarding_date ON public.cash_entries;
CREATE TRIGGER trg_sync_onboarding_date
  AFTER UPDATE OF onboarding_date ON public.cash_entries
  FOR EACH ROW EXECUTE FUNCTION public.sync_onboarding_date_to_csm();
