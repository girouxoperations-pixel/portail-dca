ALTER TABLE public.csm_clients
  ADD COLUMN IF NOT EXISTS m1_missed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS m2_missed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS m3_missed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS m4_missed boolean NOT NULL DEFAULT false;
