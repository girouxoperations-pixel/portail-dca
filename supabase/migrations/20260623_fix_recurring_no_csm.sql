-- Prevent recurring payment entries from creating new CSM clients or CM followups.
-- Both triggers should only fire on real new deals, not on installment cash entries.

CREATE OR REPLACE FUNCTION public.create_csm_client_on_cash_entry()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Skip versements récurrents
  IF NEW.close_type = 'recurring' THEN
    RETURN NEW;
  END IF;

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

CREATE OR REPLACE FUNCTION public.create_cm_followup_on_sale()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Skip versements récurrents
  IF NEW.close_type = 'recurring' THEN
    RETURN NEW;
  END IF;

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
