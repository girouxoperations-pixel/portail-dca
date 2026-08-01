-- Link csm_commissions to the recurring_occurrence that triggered it
-- Allows precise deletion when a virement is un-received
ALTER TABLE public.csm_commissions
  ADD COLUMN IF NOT EXISTS occurrence_id uuid REFERENCES public.recurring_occurrences(id) ON DELETE SET NULL;
