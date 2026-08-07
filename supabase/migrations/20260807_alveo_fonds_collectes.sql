ALTER TABLE alveo_deals
  ADD COLUMN IF NOT EXISTS fonds_collectes boolean NOT NULL DEFAULT false;
