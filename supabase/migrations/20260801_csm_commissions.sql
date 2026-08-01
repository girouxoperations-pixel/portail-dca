-- ── CSM Commissions ──────────────────────────────────────────────────
-- Tracks automatic commissions earned by CSM members:
--   virement_2pct : 2% of each virement recurring payment received
--   cert_setter   : $50 when cert_setter_done is checked
--   placement     : $100 when opportunity_setter OR opportunity_closer checked (once per client)
--   cert_closer   : $150 when cert_closer_done is checked

CREATE TABLE IF NOT EXISTS public.csm_commissions (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  csm_id      uuid        NOT NULL REFERENCES public.profiles(id),
  client_id   uuid        REFERENCES public.csm_clients(id) ON DELETE SET NULL,
  client_name text,
  type        text        NOT NULL CHECK (type IN ('virement_2pct','cert_setter','placement','cert_closer')),
  amount      numeric(10,2) NOT NULL DEFAULT 0,
  description text,
  paid        boolean     NOT NULL DEFAULT false,
  paid_at     timestamptz,
  month       smallint,
  year        smallint,
  created_at  timestamptz DEFAULT now()
);

-- CSM monthly targets (reuses user_goals table)
ALTER TABLE public.user_goals
  ADD COLUMN IF NOT EXISTS target_cert_setter int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS target_placement   int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS target_cert_closer int NOT NULL DEFAULT 0;
