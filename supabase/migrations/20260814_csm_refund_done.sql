ALTER TABLE public.csm_clients
  ADD COLUMN IF NOT EXISTS refund_done boolean NOT NULL DEFAULT false;
