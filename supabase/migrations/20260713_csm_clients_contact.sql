-- Direct contact fields on csm_clients for clients without a cash_entry link
ALTER TABLE public.csm_clients
  ADD COLUMN IF NOT EXISTS phone   text,
  ADD COLUMN IF NOT EXISTS email   text,
  ADD COLUMN IF NOT EXISTS methode text;
