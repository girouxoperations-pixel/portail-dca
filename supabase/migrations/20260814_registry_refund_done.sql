ALTER TABLE public.clients_registry
  ADD COLUMN IF NOT EXISTS refund_done boolean NOT NULL DEFAULT false;
