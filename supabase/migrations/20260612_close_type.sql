ALTER TABLE public.cash_entries
  ADD COLUMN IF NOT EXISTS close_type text
  CHECK (close_type IN ('on_the_spot', 'follow_up'));
