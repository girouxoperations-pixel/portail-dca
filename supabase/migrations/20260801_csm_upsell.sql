-- Add upsell commission type and monthly upsell target
ALTER TABLE public.csm_commissions
  DROP CONSTRAINT IF EXISTS csm_commissions_type_check;

ALTER TABLE public.csm_commissions
  ADD CONSTRAINT csm_commissions_type_check
  CHECK (type IN ('virement_2pct','cert_setter','placement','cert_closer','upsell'));

ALTER TABLE public.user_goals
  ADD COLUMN IF NOT EXISTS target_upsell int NOT NULL DEFAULT 0;
