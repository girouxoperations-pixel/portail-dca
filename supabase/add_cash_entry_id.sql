-- Lien entre paye_entries et cash_entries
-- Permet de retrouver/mettre à jour la paie quand un deal est modifié

ALTER TABLE public.paye_entries
  ADD COLUMN IF NOT EXISTS cash_entry_id uuid
    REFERENCES public.cash_entries(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_paye_entries_cash_entry_id
  ON public.paye_entries (cash_entry_id);
