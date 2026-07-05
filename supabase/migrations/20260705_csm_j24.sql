ALTER TABLE csm_clients
  ADD COLUMN IF NOT EXISTS text_j24_done boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS text_j24_date date;
