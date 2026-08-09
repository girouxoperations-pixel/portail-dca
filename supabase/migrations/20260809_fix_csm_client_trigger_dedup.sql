-- Fix duplicate csm_clients created when a client has multiple cash entries.
-- Update the trigger to skip insertion if a CSM client with the same name already exists.

CREATE OR REPLACE FUNCTION public.create_csm_client_on_cash_entry()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  default_csm_id uuid;
BEGIN
  SELECT id INTO default_csm_id
  FROM public.profiles WHERE full_name ILIKE 'Jacinthe%' LIMIT 1;

  INSERT INTO public.csm_clients
    (cash_entry_id, closer_id, name, enrollment_date, payment_type, csm_id)
  SELECT
    NEW.id,
    NEW.closed_by,
    COALESCE(NEW.client_name, 'Cliente inconnue'),
    NEW.entry_date,
    CASE
      WHEN NEW.methode = 'Financement' THEN 'financement'
      ELSE 'pif'
    END,
    default_csm_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.csm_clients
    WHERE LOWER(TRIM(name)) = LOWER(TRIM(COALESCE(NEW.client_name, 'Cliente inconnue')))
  );
  RETURN NEW;
END;
$$;
