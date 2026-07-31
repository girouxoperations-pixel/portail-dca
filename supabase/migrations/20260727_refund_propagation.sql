-- Add is_refunded flag to cash_entries
ALTER TABLE public.cash_entries
  ADD COLUMN IF NOT EXISTS is_refunded boolean NOT NULL DEFAULT false;

-- Extend cm_followups status check to include 'remboursee'
ALTER TABLE public.cm_followups
  DROP CONSTRAINT IF EXISTS cm_followups_status_check;
ALTER TABLE public.cm_followups
  ADD CONSTRAINT cm_followups_status_check
    CHECK (status IN ('en_cours', 'pas_reponse_1', 'pas_reponse_2', 'remboursee'));
