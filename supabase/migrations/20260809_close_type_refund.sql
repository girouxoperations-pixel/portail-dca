-- Add 'refund' as a valid close_type for refunded cash entries
ALTER TABLE public.cash_entries
  DROP CONSTRAINT IF EXISTS cash_entries_close_type_check;

ALTER TABLE public.cash_entries
  ADD CONSTRAINT cash_entries_close_type_check
  CHECK (close_type IN ('on_the_spot', 'follow_up', 'recurring', 'financement', 'refund'));
