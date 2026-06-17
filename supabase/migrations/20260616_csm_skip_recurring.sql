-- Skip recurring cash entries when auto-creating CSM clients
CREATE OR REPLACE FUNCTION public.create_csm_client_on_cash_entry()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Skip recurring payments
  IF NEW.close_type = 'recurring'
     OR NEW.notes ILIKE 'R_current%'
     OR NEW.notes ILIKE 'Versement%'
  THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.csm_clients
    (cash_entry_id, closer_id, name, enrollment_date, payment_type)
  VALUES (
    NEW.id,
    NEW.closed_by,
    COALESCE(NEW.client_name, 'Cliente inconnue'),
    NEW.entry_date,
    CASE
      WHEN NEW.methode = 'Financement' THEN 'financement'
      ELSE 'pif'
    END
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

-- Remove any CSM clients already created from recurring entries
DELETE FROM public.csm_clients
WHERE cash_entry_id IN (
  SELECT id FROM public.cash_entries
  WHERE close_type = 'recurring'
     OR notes ILIKE 'R_current%'
     OR notes ILIKE 'Versement%'
);
