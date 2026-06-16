-- Add versements_total to recurring_deals
-- NULL = unlimited (legacy), 2 or 3 = payment plan
ALTER TABLE public.recurring_deals
  ADD COLUMN IF NOT EXISTS versements_total int;
