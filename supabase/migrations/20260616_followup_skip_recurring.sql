-- Update trigger to skip recurring/versement cash entries
CREATE OR REPLACE FUNCTION public.create_followup_on_cash_entry()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.close_type = 'recurring'
     OR NEW.notes ILIKE 'Récurrent%'
     OR NEW.notes ILIKE 'Versement%' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.client_followups
    (cash_entry_id, closer_id, client_name, close_date)
  VALUES
    (NEW.id, NEW.closed_by, COALESCE(NEW.client_name, 'Client inconnu'), NEW.entry_date)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

-- Clean up existing recurring followups
DELETE FROM public.client_followups
WHERE cash_entry_id IN (
  SELECT id FROM public.cash_entries
  WHERE close_type = 'recurring'
     OR notes ILIKE 'Récurrent%'
     OR notes ILIKE 'Versement%'
);
