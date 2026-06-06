-- Add financial tracking columns to closer_entries
ALTER TABLE public.closer_entries
  ADD COLUMN IF NOT EXISTS cash_collected numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revenue        numeric(12,2) NOT NULL DEFAULT 0;
