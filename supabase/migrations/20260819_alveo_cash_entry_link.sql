-- Link alveo_deals to cash_entries so montant stays in sync.
ALTER TABLE public.alveo_deals
  ADD COLUMN IF NOT EXISTS cash_entry_id UUID REFERENCES public.cash_entries(id) ON DELETE SET NULL;

-- Backfill: match by client_name (case-insensitive) + close_type = 'financement'
UPDATE public.alveo_deals ad
SET cash_entry_id = (
  SELECT ce.id
  FROM public.cash_entries ce
  WHERE ce.close_type = 'financement'
    AND LOWER(TRIM(ce.client_name)) = LOWER(TRIM(ad.client_name))
  ORDER BY ce.entry_date DESC
  LIMIT 1
)
WHERE ad.cash_entry_id IS NULL;
