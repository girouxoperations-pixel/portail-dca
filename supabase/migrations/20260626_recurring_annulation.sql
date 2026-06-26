-- Track record des récurrents annulés : date et raison d'annulation
ALTER TABLE public.recurring_deals
  ADD COLUMN IF NOT EXISTS annule_le      timestamptz,
  ADD COLUMN IF NOT EXISTS raison_annulation text;
