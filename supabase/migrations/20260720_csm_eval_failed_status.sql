-- Add 'eval_failed' as a valid status for CSM clients
ALTER TABLE public.csm_clients
  DROP CONSTRAINT IF EXISTS csm_clients_status_check,
  ADD CONSTRAINT csm_clients_status_check
    CHECK (status IN ('active', 'paused', 'eval_failed', 'completed', 'dropped', 'refund'));
