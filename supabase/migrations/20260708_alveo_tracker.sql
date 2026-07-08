-- Alveo Financing Tracker
-- Tracks deals financed through Alveo and monthly commission payments to setters/closers

CREATE TABLE IF NOT EXISTS alveo_deals (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name      TEXT        NOT NULL,
  deal_date        DATE,
  montant          NUMERIC     NOT NULL DEFAULT 0,
  collected        NUMERIC     NOT NULL DEFAULT 0,
  methode          TEXT        NOT NULL DEFAULT 'Financement',
  setter_name      TEXT,
  closer_name      TEXT,
  commission_setter NUMERIC    NOT NULL DEFAULT 0,
  commission_closer NUMERIC    NOT NULL DEFAULT 0,
  notes            TEXT,
  statut           TEXT        NOT NULL DEFAULT 'actif',  -- actif | annulé
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by       UUID        REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS alveo_payments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id     UUID        NOT NULL REFERENCES alveo_deals(id) ON DELETE CASCADE,
  person_role TEXT        NOT NULL CHECK (person_role IN ('setter', 'closer')),
  mois        INT         NOT NULL CHECK (mois IN (1, 2, 3)),
  amount      NUMERIC     NOT NULL DEFAULT 0,
  paid        BOOLEAN     NOT NULL DEFAULT false,
  paid_at     TIMESTAMPTZ,
  paid_by     UUID        REFERENCES auth.users(id),
  UNIQUE (deal_id, person_role, mois)
);

ALTER TABLE alveo_deals    ENABLE ROW LEVEL SECURITY;
ALTER TABLE alveo_payments ENABLE ROW LEVEL SECURITY;
