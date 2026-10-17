-- Éliminer Alexandra Lizotte du Hunting Season (octobre)
UPDATE chasse_players
SET status = 'eliminated', eliminated_month = 10
WHERE profile_id IN (
  SELECT id FROM profiles WHERE full_name ILIKE '%Alexandra%Lizotte%'
);

-- Table pour le format groupe des setters (1re=1pt, 2e=0.5pt, 3e=0pt)
CREATE TABLE IF NOT EXISTS chasse_setter_results (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  week_id      uuid NOT NULL REFERENCES chasse_weeks(id) ON DELETE CASCADE,
  player_id    uuid NOT NULL REFERENCES chasse_players(id),
  cash         numeric NOT NULL DEFAULT 0,
  cash_override numeric,
  points       numeric NOT NULL DEFAULT 0,
  rank         int NOT NULL,
  is_confirmed boolean NOT NULL DEFAULT false,
  created_at   timestamptz DEFAULT now(),
  UNIQUE(week_id, player_id)
);

ALTER TABLE chasse_setter_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chasse_setter_results_all" ON chasse_setter_results FOR ALL USING (true);
