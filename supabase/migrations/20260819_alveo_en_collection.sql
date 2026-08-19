ALTER TABLE public.alveo_deals
  ADD COLUMN IF NOT EXISTS en_collection boolean NOT NULL DEFAULT false;
