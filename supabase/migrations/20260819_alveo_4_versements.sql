-- Allow 4 monthly payments in Alveo (previously only 1-3)
ALTER TABLE public.alveo_payments
  DROP CONSTRAINT IF EXISTS alveo_payments_mois_check;

ALTER TABLE public.alveo_payments
  ADD CONSTRAINT alveo_payments_mois_check CHECK (mois IN (1, 2, 3, 4));
