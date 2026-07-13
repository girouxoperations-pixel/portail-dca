-- Add client contact fields to cash_entries
ALTER TABLE public.cash_entries
  ADD COLUMN IF NOT EXISTS client_phone text,
  ADD COLUMN IF NOT EXISTS client_email text;
