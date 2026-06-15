-- Widen close_type to allow 'recurring' value
DO $$
DECLARE
  con_name TEXT;
BEGIN
  SELECT conname INTO con_name
  FROM pg_constraint
  WHERE conrelid = 'public.cash_entries'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%close_type%';

  IF con_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.cash_entries DROP CONSTRAINT ' || quote_ident(con_name);
  END IF;
END $$;

ALTER TABLE public.cash_entries
  ADD CONSTRAINT cash_entries_close_type_check
  CHECK (close_type IN ('on_the_spot', 'follow_up', 'recurring'));

-- Fix existing recurring entries imported with follow_up
UPDATE public.cash_entries
SET close_type = 'recurring', montant_courant = 0
WHERE close_type = 'follow_up';
