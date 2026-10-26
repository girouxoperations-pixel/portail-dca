-- Track exact refund date for timing stats (days between close and refund)
ALTER TABLE public.cash_entries
  ADD COLUMN IF NOT EXISTS refunded_at date;

-- Backfill from negative paye_entries linked to refunded cash entries
UPDATE public.cash_entries ce
SET refunded_at = (
  SELECT pe.created_at::date
  FROM public.paye_entries pe
  WHERE pe.cash_entry_id = ce.id
    AND pe.montant < 0
  ORDER BY pe.created_at
  LIMIT 1
)
WHERE ce.is_refunded = true
  AND ce.refunded_at IS NULL;
