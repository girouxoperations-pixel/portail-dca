-- Élimination Octobre : Mathilde, Emma (closers) et Kim (setter)
-- Survivantes : Audrey, Shanny, Emie, Kalianna, Mélika

UPDATE chasse_players
SET status = 'eliminated', eliminated_month = 10
WHERE status = 'active'
  AND profile_id NOT IN (
    SELECT id FROM profiles
    WHERE full_name ILIKE 'Audrey%'
       OR full_name ILIKE 'Shanny%'
       OR full_name ILIKE 'Emie%'
       OR full_name ILIKE 'Kalianna%'
       OR full_name ILIKE 'Mélika%'
  );
