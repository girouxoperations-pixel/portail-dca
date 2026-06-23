-- Add payment method to recurring deals
ALTER TABLE public.recurring_deals
  ADD COLUMN IF NOT EXISTS methode_paiement text
    CHECK (methode_paiement IN ('virement', 'carte'))
    DEFAULT NULL;
