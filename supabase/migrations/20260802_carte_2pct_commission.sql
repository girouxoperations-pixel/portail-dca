-- Add carte_2pct commission type for credit card recurring payments requiring CSM email follow-up
ALTER TABLE public.csm_commissions DROP CONSTRAINT IF EXISTS csm_commissions_type_check;
ALTER TABLE public.csm_commissions ADD CONSTRAINT csm_commissions_type_check
  CHECK (type IN ('virement_2pct','cert_setter','placement','cert_closer','upsell','carte_2pct'));
