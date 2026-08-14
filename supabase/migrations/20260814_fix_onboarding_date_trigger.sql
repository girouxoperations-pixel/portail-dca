-- Fix onboarding_date in the CSM client auto-create trigger.
-- Previously it hardcoded NEW.entry_date; now it respects the
-- onboarding_date column on cash_entries (falls back to entry_date).

CREATE OR REPLACE FUNCTION public.create_csm_client_on_cash_entry()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
DECLARE
  default_csm_id uuid;
BEGIN
  SELECT id INTO default_csm_id
  FROM public.profiles
  WHERE full_name ILIKE 'Jacinthe%'
    AND 'csm' = ANY(roles)
  LIMIT 1;

  INSERT INTO public.csm_clients
    (cash_entry_id, closer_id, name, enrollment_date, payment_type, csm_id, onboarding_date)
  SELECT
    NEW.id,
    NEW.closed_by,
    COALESCE(NEW.client_name, 'Cliente inconnue'),
    NEW.entry_date,
    CASE
      WHEN NEW.methode = 'Financement' THEN 'financement'
      ELSE 'pif'
    END,
    default_csm_id,
    COALESCE(NEW.onboarding_date, NEW.entry_date)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.csm_clients
    WHERE LOWER(TRIM(name)) = LOWER(TRIM(COALESCE(NEW.client_name, 'Cliente inconnue')))
  );
  RETURN NEW;
END;
$func$;
