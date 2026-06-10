-- CSM Client Tracking Module
-- 330 active clients, single CSM, full progression tracking over 3 months

CREATE TABLE public.csm_clients (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text        NOT NULL,
  enrollment_date     date        NOT NULL,
  payment_type        text,                    -- 'pif', '2-vers', '3-vers', 'financement'
  invoice_sent        boolean     NOT NULL DEFAULT false,
  onboarding_notes    text,                    -- job, age, city, objective, interests, start pref

  -- Meetings (actual dates entered by CSM)
  m1_date             date,                    -- Onboarding J+1
  m1_notes            text,
  m2_date             date,                    -- ~J+14
  m2_notes            text,
  m3_date             date,                    -- ~J+35 (UPSELL)
  m3_notes            text,
  m4_date             date,                    -- post-M3 (UPSELL)
  m4_notes            text,
  m5_date             date,                    -- optional post-closing
  m5_notes            text,

  -- Text/SMS follow-ups (due dates are computed in app as weekday-adjusted offsets from enrollment_date)
  -- J7 text: enrollment_date + 7 (weekday-adjusted)
  text_j7_done        boolean     NOT NULL DEFAULT false,
  text_j7_date        date,                    -- actual date done

  -- J21 check-in: enrollment_date + 21 (weekday-adjusted)
  text_j21_done       boolean     NOT NULL DEFAULT false,
  text_j21_date       date,

  -- Post-M3 texts (from enrollment_date: +49, +63, +77, +90, all weekday-adjusted)
  text_j49_done       boolean     NOT NULL DEFAULT false,
  text_j49_date       date,
  text_j63_done       boolean     NOT NULL DEFAULT false,
  text_j63_date       date,
  text_j77_done       boolean     NOT NULL DEFAULT false,
  text_j77_date       date,
  text_j90_done       boolean     NOT NULL DEFAULT false,
  text_j90_date       date,

  -- Theory progress (0-100)
  theory_pct          int         DEFAULT 0    CHECK (theory_pct BETWEEN 0 AND 100),

  -- Milestones
  quiz_setter_done    boolean     NOT NULL DEFAULT false,
  cert_setter_done    boolean     NOT NULL DEFAULT false,  -- auto-set when m4_date is entered
  opportunity_setter  boolean     NOT NULL DEFAULT false,
  theory_closer_done  boolean     NOT NULL DEFAULT false,
  quiz_closer_done    boolean     NOT NULL DEFAULT false,
  cert_closer_done    boolean     NOT NULL DEFAULT false,
  opportunity_closer  boolean     NOT NULL DEFAULT false,

  -- Circle app (manual — no API access)
  circle_last_login   date,

  -- Status
  status              text        NOT NULL DEFAULT 'active'
                                  CHECK (status IN ('active', 'paused', 'completed', 'dropped')),
  notes               text,
  cash_entry_id       uuid        REFERENCES public.cash_entries(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON public.csm_clients (enrollment_date);
CREATE INDEX ON public.csm_clients (status);

ALTER TABLE public.csm_clients ENABLE ROW LEVEL SECURITY;

-- admin and csm have full access; no closer/setter access
CREATE POLICY "csm_clients: admin/csm full access"
  ON public.csm_clients FOR ALL TO authenticated
  USING  ((SELECT get_my_role()) IN ('admin', 'csm'))
  WITH CHECK ((SELECT get_my_role()) IN ('admin', 'csm'));
