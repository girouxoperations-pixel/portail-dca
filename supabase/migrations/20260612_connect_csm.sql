-- Connect CSM clients to cash entries via trigger
-- Also adds closer_id column for direct lookup

ALTER TABLE public.csm_clients
  ADD COLUMN IF NOT EXISTS closer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Trigger function: auto-create CSM client on new cash entry
-- Payment type from methode; versements count updated by application after recurring_deals created
CREATE OR REPLACE FUNCTION public.create_csm_client_on_cash_entry()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.csm_clients
    (cash_entry_id, closer_id, name, enrollment_date, payment_type)
  VALUES (
    NEW.id,
    NEW.closed_by,
    COALESCE(NEW.client_name, 'Cliente inconnue'),
    NEW.entry_date,
    CASE
      WHEN NEW.methode = 'Financement' THEN 'financement'
      ELSE 'pif'   -- application will update to '2-vers'/'3-vers' if needed
    END
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_cash_entry_created_csm ON public.cash_entries;
CREATE TRIGGER on_cash_entry_created_csm
  AFTER INSERT ON public.cash_entries
  FOR EACH ROW EXECUTE FUNCTION public.create_csm_client_on_cash_entry();
