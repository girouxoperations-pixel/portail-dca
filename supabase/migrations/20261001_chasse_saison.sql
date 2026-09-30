-- ── Saison de la Chasse ──────────────────────────────────────────────

-- Configuration globale (1 seule ligne)
CREATE TABLE IF NOT EXISTS chasse_config (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  show_cash          boolean DEFAULT false,
  cerf_oct_closer    numeric DEFAULT 0,
  cerf_oct_setter    numeric DEFAULT 0,
  cerf_nov_closer    numeric DEFAULT 0,
  cerf_nov_setter    numeric DEFAULT 0,
  cerf_dec_closer    numeric DEFAULT 0,
  cerf_dec_setter    numeric DEFAULT 0,
  week_start_weekday int DEFAULT 1,
  week_end_weekday   int DEFAULT 5,
  created_at         timestamptz DEFAULT now()
);

-- Joueuses inscrites au tournoi
CREATE TABLE IF NOT EXISTS chasse_players (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id       uuid REFERENCES profiles(id) ON DELETE CASCADE,
  groupe           text NOT NULL CHECK (groupe IN ('closer','setter')),
  position         text,
  status           text DEFAULT 'active' CHECK (status IN ('active','eliminated','champion')),
  eliminated_month int,
  created_at       timestamptz DEFAULT now(),
  UNIQUE(profile_id)
);

-- Semaines du tournoi
CREATE TABLE IF NOT EXISTS chasse_weeks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number  int NOT NULL UNIQUE,
  week_start   date NOT NULL,
  week_end     date NOT NULL,
  month        int NOT NULL,
  status       text DEFAULT 'pending' CHECK (status IN ('pending','active','confirmed')),
  confirmed_by uuid REFERENCES profiles(id),
  confirmed_at timestamptz
);

-- Duels par semaine
CREATE TABLE IF NOT EXISTS chasse_duels (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id               uuid NOT NULL REFERENCES chasse_weeks(id) ON DELETE CASCADE,
  groupe                text NOT NULL CHECK (groupe IN ('closer','setter')),
  player1_id            uuid NOT NULL REFERENCES chasse_players(id),
  player2_id            uuid REFERENCES chasse_players(id),
  is_cerf               boolean DEFAULT false,
  cerf_target           numeric,
  player1_cash_override numeric,
  player2_cash_override numeric,
  winner_id             uuid REFERENCES chasse_players(id),
  points_p1             numeric DEFAULT 0,
  points_p2             numeric DEFAULT 0,
  is_confirmed          boolean DEFAULT false,
  override_note         text,
  created_at            timestamptz DEFAULT now()
);

-- Résultats mensuels (snapshot après élimination)
CREATE TABLE IF NOT EXISTS chasse_monthly_results (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month         int NOT NULL,
  groupe        text NOT NULL,
  player_id     uuid NOT NULL REFERENCES chasse_players(id),
  total_points  numeric DEFAULT 0,
  total_cash    numeric DEFAULT 0,
  rank          int,
  eliminated    boolean DEFAULT false,
  created_at    timestamptz DEFAULT now(),
  UNIQUE(month, groupe, player_id)
);

-- Historique des overrides manuels
CREATE TABLE IF NOT EXISTS chasse_overrides_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duel_id       uuid REFERENCES chasse_duels(id),
  player_id     uuid REFERENCES chasse_players(id),
  original_cash numeric,
  new_cash      numeric,
  reason        text,
  changed_by    uuid REFERENCES profiles(id),
  changed_at    timestamptz DEFAULT now()
);

-- ── Données initiales ─────────────────────────────────────────────────

-- Config par défaut
INSERT INTO chasse_config DEFAULT VALUES;

-- Semaines
INSERT INTO chasse_weeks (week_number, week_start, week_end, month, status) VALUES
  (1,  '2026-10-05', '2026-10-09', 10, 'pending'),
  (2,  '2026-10-12', '2026-10-16', 10, 'pending'),
  (3,  '2026-10-19', '2026-10-23', 10, 'pending'),
  (4,  '2026-10-26', '2026-10-30', 10, 'pending'),
  (5,  '2026-11-02', '2026-11-06', 11, 'pending'),
  (6,  '2026-11-09', '2026-11-13', 11, 'pending'),
  (7,  '2026-11-16', '2026-11-20', 11, 'pending'),
  (8,  '2026-11-23', '2026-11-27', 11, 'pending'),
  (9,  '2026-11-30', '2026-12-04', 12, 'pending'),
  (10, '2026-12-07', '2026-12-11', 12, 'pending'),
  (11, '2026-12-14', '2026-12-18', 12, 'pending')
ON CONFLICT (week_number) DO NOTHING;

-- Joueuses (closers)
INSERT INTO chasse_players (profile_id, groupe, position)
SELECT id, 'closer', CASE
  WHEN full_name ILIKE 'audrey%'   THEN 'A'
  WHEN full_name ILIKE 'emie%'     THEN 'B'
  WHEN full_name ILIKE 'mathilde%' THEN 'C'
  WHEN full_name ILIKE 'emma%tardif%' THEN 'D'
  WHEN full_name ILIKE 'shanny%'   THEN 'E'
END
FROM profiles
WHERE role = 'closer'
  AND full_name ILIKE ANY(ARRAY['audrey%','emie%','mathilde%','emma tardif%','shanny%'])
ON CONFLICT (profile_id) DO NOTHING;

-- Joueuses (setters)
INSERT INTO chasse_players (profile_id, groupe, position)
SELECT id, 'setter', CASE
  WHEN full_name ILIKE 'kalianna%'   THEN 'W'
  WHEN full_name ILIKE 'alexandra%lizotte%' THEN 'X'
  WHEN full_name ILIKE 'kim%fontaine%'   THEN 'Y'
  WHEN full_name ILIKE 'm%lika%'     THEN 'Z'
END
FROM profiles
WHERE role = 'setter'
  AND full_name ILIKE ANY(ARRAY['kalianna%','alexandra%lizotte%','kim%fontaine%','m_lika%','mélika%'])
ON CONFLICT (profile_id) DO NOTHING;
