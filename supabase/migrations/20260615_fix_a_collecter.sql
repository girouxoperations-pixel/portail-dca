-- Fix a_collecter generated column: clamp to 0 so recurring entries
-- (montant_courant=0, collected>0) don't produce negative values
ALTER TABLE public.cash_entries DROP COLUMN a_collecter;
ALTER TABLE public.cash_entries
  ADD COLUMN a_collecter numeric(12, 2)
    GENERATED ALWAYS AS (GREATEST(0, montant_courant - collected)) STORED;
