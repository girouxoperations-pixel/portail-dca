-- ================================================================
-- PORTAIL DCA — Schéma SQL complet
-- Cible : Supabase (PostgreSQL 15+)
-- ================================================================

-- ----------------------------------------------------------------
-- 0. EXTENSIONS
-- ----------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()


-- ================================================================
-- 1. TABLE : profiles
-- (créée EN PREMIER car get_my_role() la référence)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid        PRIMARY KEY
                          REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text,
  email       text,
  role        text        NOT NULL
                          CHECK (role IN ('admin', 'closer', 'setter', 'csm')),
  avatar_url  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;


-- ================================================================
-- HELPER FUNCTION
-- get_my_role() : retourne le rôle de l'utilisateur connecté.
-- Placée APRÈS la création de profiles (référence la table).
-- SECURITY DEFINER  → exécutée avec les droits du propriétaire,
-- ce qui évite la récursion infinie RLS sur la table profiles.
-- SET search_path  → bonne pratique de sécurité (CVE-2018-1058).
-- ================================================================
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;


-- ================================================================
-- 2. TABLE : closer_entries
-- ================================================================
CREATE TABLE IF NOT EXISTS public.closer_entries (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL
                               REFERENCES public.profiles(id) ON DELETE CASCADE,
  entry_date       date        NOT NULL,
  scheduled_calls  int         NOT NULL DEFAULT 0 CHECK (scheduled_calls >= 0),
  show_calls       int         NOT NULL DEFAULT 0 CHECK (show_calls >= 0),
  pitch_calls      int         NOT NULL DEFAULT 0 CHECK (pitch_calls >= 0),
  closes           int         NOT NULL DEFAULT 0 CHECK (closes >= 0),
  notes            text,
  created_by       uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.closer_entries ENABLE ROW LEVEL SECURITY;


-- ================================================================
-- 3. TABLE : setter_entries
-- ================================================================
CREATE TABLE IF NOT EXISTS public.setter_entries (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL
                               REFERENCES public.profiles(id) ON DELETE CASCADE,
  entry_date       date        NOT NULL,
  leads_funnel1    int         NOT NULL DEFAULT 0 CHECK (leads_funnel1 >= 0),
  leads_funnel2    int         NOT NULL DEFAULT 0 CHECK (leads_funnel2 >= 0),
  leads_funnel3    int         NOT NULL DEFAULT 0 CHECK (leads_funnel3 >= 0),
  leads_funnel4    int         NOT NULL DEFAULT 0 CHECK (leads_funnel4 >= 0),
  attempts         int         NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  contacts         int         NOT NULL DEFAULT 0 CHECK (contacts >= 0),
  rdv_booked       int         NOT NULL DEFAULT 0 CHECK (rdv_booked >= 0),
  showed           int         NOT NULL DEFAULT 0 CHECK (showed >= 0),
  no_show          int         NOT NULL DEFAULT 0 CHECK (no_show >= 0),
  disqualified     int         NOT NULL DEFAULT 0 CHECK (disqualified >= 0),
  cancelled        int         NOT NULL DEFAULT 0 CHECK (cancelled >= 0),
  notes            text,
  created_by       uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.setter_entries ENABLE ROW LEVEL SECURITY;


-- ================================================================
-- 4. TABLE : paye_entries
-- ================================================================
CREATE TABLE IF NOT EXISTS public.paye_entries (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  period_label       text,
  month              int         CHECK (month BETWEEN 1 AND 12),
  year               int         CHECK (year >= 2000),
  client_name        text,
  closer_id          uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  setter_id          uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  montant            numeric(12, 2),
  commission         numeric(12, 2),
  commission_setter  numeric(12, 2),
  statut             text        NOT NULL DEFAULT 'En attente'
                                 CHECK (statut IN ('En attente', 'Payé')),
  notes              text,
  created_by         uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.paye_entries ENABLE ROW LEVEL SECURITY;


-- ================================================================
-- 5. TABLE : feedback_entries
-- ================================================================
CREATE TABLE IF NOT EXISTS public.feedback_entries (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL
                          REFERENCES public.profiles(id) ON DELETE CASCADE,
  call_date   date        NOT NULL,
  duration    int         CHECK (duration >= 0),           -- en minutes
  score       int         CHECK (score BETWEEN 0 AND 100),
  forts       text[],
  ameliorer   text[],
  statut      text        NOT NULL
                          CHECK (statut IN (
                            'Closed', 'Suivi requis', 'No Show', 'Refus'
                          )),
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback_entries ENABLE ROW LEVEL SECURITY;


-- ================================================================
-- 6. TABLE : cash_entries
-- ================================================================
CREATE TABLE IF NOT EXISTS public.cash_entries (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date       date        NOT NULL,
  client_name      text,
  montant_courant  numeric(12, 2) NOT NULL DEFAULT 0,
  collected        numeric(12, 2) NOT NULL DEFAULT 0,
  -- Colonne calculée : reste à collecter
  a_collecter      numeric(12, 2) GENERATED ALWAYS AS
                     (montant_courant - collected) STORED,
  methode          text,
  set_by           uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  closed_by        uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  month            int         CHECK (month BETWEEN 1 AND 12),
  year             int         CHECK (year >= 2000),
  notes            text,
  created_by       uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cash_entries ENABLE ROW LEVEL SECURITY;


-- ================================================================
-- 7. TABLE : documents
-- ================================================================
CREATE TABLE IF NOT EXISTS public.documents (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text        NOT NULL,
  description  text,
  section      text,
  file_url     text        NOT NULL,
  file_type    text,
  file_size    int         CHECK (file_size >= 0),
  uploaded_by  uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;


-- ================================================================
-- INDEX (performances courantes)
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_closer_entries_user_date
  ON public.closer_entries (user_id, entry_date DESC);

CREATE INDEX IF NOT EXISTS idx_setter_entries_user_date
  ON public.setter_entries (user_id, entry_date DESC);

CREATE INDEX IF NOT EXISTS idx_paye_entries_year_month
  ON public.paye_entries (year, month);

CREATE INDEX IF NOT EXISTS idx_paye_entries_closer
  ON public.paye_entries (closer_id);

CREATE INDEX IF NOT EXISTS idx_paye_entries_setter
  ON public.paye_entries (setter_id);

CREATE INDEX IF NOT EXISTS idx_feedback_entries_user
  ON public.feedback_entries (user_id, call_date DESC);

CREATE INDEX IF NOT EXISTS idx_cash_entries_year_month
  ON public.cash_entries (year, month);

CREATE INDEX IF NOT EXISTS idx_documents_section
  ON public.documents (section);


-- ================================================================
-- TRIGGER : création automatique du profil à l'inscription
-- Déclenché sur auth.users à chaque INSERT (nouvel utilisateur).
-- SECURITY DEFINER → bypass RLS pour écrire dans profiles.
-- ON CONFLICT DO NOTHING → idempotent (safe en cas de replay).
-- ================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    -- full_name optionnel transmis via les metadata d'inscription
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    -- rôle optionnel transmis via les metadata (par défaut : closer)
    COALESCE(NEW.raw_user_meta_data->>'role', 'closer')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ================================================================
-- ROW LEVEL SECURITY POLICIES
--
-- Conventions :
--   • Les policies sont PERMISSIVES (défaut Postgres) : une seule
--     policy suffisante donne l'accès.
--   • get_my_role() est appelée avec (SELECT …) pour que le
--     planificateur la cache une fois par statement.
--   • Les opérations non couvertes par une policy sont refusées.
-- ================================================================


-- ----------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------

-- Tous les utilisateurs authentifiés peuvent lire tous les profils
-- (nécessaire pour les listes déroulantes de l'UI).
CREATE POLICY "profiles: select all authenticated"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Chacun peut mettre à jour son propre profil (avatar, full_name…).
CREATE POLICY "profiles: update own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING     (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admin et CSM : accès complet (CREATE / UPDATE / DELETE inclus).
-- Cette policy couvre INSERT, UPDATE, DELETE pour admin/csm.
-- Elle surpasse la policy "update own" par OR-logic.
CREATE POLICY "profiles: admin/csm full access"
  ON public.profiles
  FOR ALL
  TO authenticated
  USING     ((SELECT get_my_role()) IN ('admin', 'csm'))
  WITH CHECK ((SELECT get_my_role()) IN ('admin', 'csm'));


-- ----------------------------------------------------------------
-- closer_entries
-- ----------------------------------------------------------------

-- SELECT : admin, csm, closer, setter peuvent tous lire toutes
--          les entrées (tableau de bord global).
CREATE POLICY "closer_entries: select all roles"
  ON public.closer_entries
  FOR SELECT
  TO authenticated
  USING (
    (SELECT get_my_role()) IN ('admin', 'csm', 'closer', 'setter')
  );

-- INSERT : closer peut créer seulement ses propres entrées.
CREATE POLICY "closer_entries: closer insert own"
  ON public.closer_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT get_my_role()) = 'closer'
    AND user_id = auth.uid()
  );

-- UPDATE : closer peut modifier seulement ses propres entrées.
CREATE POLICY "closer_entries: closer update own"
  ON public.closer_entries
  FOR UPDATE
  TO authenticated
  USING     ((SELECT get_my_role()) = 'closer' AND user_id = auth.uid())
  WITH CHECK ((SELECT get_my_role()) = 'closer' AND user_id = auth.uid());

-- ALL : admin et csm ont un accès complet.
CREATE POLICY "closer_entries: admin/csm full access"
  ON public.closer_entries
  FOR ALL
  TO authenticated
  USING     ((SELECT get_my_role()) IN ('admin', 'csm'))
  WITH CHECK ((SELECT get_my_role()) IN ('admin', 'csm'));


-- ----------------------------------------------------------------
-- setter_entries
-- ----------------------------------------------------------------

-- SELECT : admin, csm, closer, setter.
CREATE POLICY "setter_entries: select all roles"
  ON public.setter_entries
  FOR SELECT
  TO authenticated
  USING (
    (SELECT get_my_role()) IN ('admin', 'csm', 'closer', 'setter')
  );

-- INSERT : setter peut créer seulement ses propres entrées.
CREATE POLICY "setter_entries: setter insert own"
  ON public.setter_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT get_my_role()) = 'setter'
    AND user_id = auth.uid()
  );

-- UPDATE : setter peut modifier seulement ses propres entrées.
CREATE POLICY "setter_entries: setter update own"
  ON public.setter_entries
  FOR UPDATE
  TO authenticated
  USING     ((SELECT get_my_role()) = 'setter' AND user_id = auth.uid())
  WITH CHECK ((SELECT get_my_role()) = 'setter' AND user_id = auth.uid());

-- ALL : admin et csm.
CREATE POLICY "setter_entries: admin/csm full access"
  ON public.setter_entries
  FOR ALL
  TO authenticated
  USING     ((SELECT get_my_role()) IN ('admin', 'csm'))
  WITH CHECK ((SELECT get_my_role()) IN ('admin', 'csm'));


-- ----------------------------------------------------------------
-- paye_entries
-- ----------------------------------------------------------------

-- SELECT admin/csm : toutes les lignes.
CREATE POLICY "paye_entries: admin/csm select all"
  ON public.paye_entries
  FOR SELECT
  TO authenticated
  USING ((SELECT get_my_role()) IN ('admin', 'csm'));

-- SELECT closer : uniquement les lignes où il est le closer.
CREATE POLICY "paye_entries: closer select own"
  ON public.paye_entries
  FOR SELECT
  TO authenticated
  USING (
    (SELECT get_my_role()) = 'closer'
    AND closer_id = auth.uid()
  );

-- SELECT setter : uniquement les lignes où il est le setter.
CREATE POLICY "paye_entries: setter select own"
  ON public.paye_entries
  FOR SELECT
  TO authenticated
  USING (
    (SELECT get_my_role()) = 'setter'
    AND setter_id = auth.uid()
  );

-- ALL : admin et csm (écriture complète).
CREATE POLICY "paye_entries: admin/csm full access"
  ON public.paye_entries
  FOR ALL
  TO authenticated
  USING     ((SELECT get_my_role()) IN ('admin', 'csm'))
  WITH CHECK ((SELECT get_my_role()) IN ('admin', 'csm'));


-- ----------------------------------------------------------------
-- feedback_entries
-- ----------------------------------------------------------------

-- SELECT : admin, csm, closer, setter.
CREATE POLICY "feedback_entries: select all roles"
  ON public.feedback_entries
  FOR SELECT
  TO authenticated
  USING (
    (SELECT get_my_role()) IN ('admin', 'csm', 'closer', 'setter')
  );

-- INSERT : closer peut créer des feedbacks pour ses propres appels.
CREATE POLICY "feedback_entries: closer insert own"
  ON public.feedback_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT get_my_role()) = 'closer'
    AND user_id = auth.uid()
  );

-- UPDATE : closer peut modifier ses propres feedbacks.
CREATE POLICY "feedback_entries: closer update own"
  ON public.feedback_entries
  FOR UPDATE
  TO authenticated
  USING     ((SELECT get_my_role()) = 'closer' AND user_id = auth.uid())
  WITH CHECK ((SELECT get_my_role()) = 'closer' AND user_id = auth.uid());

-- ALL : admin et csm.
CREATE POLICY "feedback_entries: admin/csm full access"
  ON public.feedback_entries
  FOR ALL
  TO authenticated
  USING     ((SELECT get_my_role()) IN ('admin', 'csm'))
  WITH CHECK ((SELECT get_my_role()) IN ('admin', 'csm'));


-- ----------------------------------------------------------------
-- cash_entries  (admin / csm uniquement — aucun accès aux autres)
-- ----------------------------------------------------------------

CREATE POLICY "cash_entries: admin/csm full access"
  ON public.cash_entries
  FOR ALL
  TO authenticated
  USING     ((SELECT get_my_role()) IN ('admin', 'csm'))
  WITH CHECK ((SELECT get_my_role()) IN ('admin', 'csm'));


-- ----------------------------------------------------------------
-- documents
-- ----------------------------------------------------------------

-- SELECT : tous les utilisateurs authentifiés.
CREATE POLICY "documents: select all authenticated"
  ON public.documents
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT : tous les authentifiés peuvent uploader.
CREATE POLICY "documents: insert authenticated"
  ON public.documents
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE : admin/csm ou l'uploadeur lui-même.
CREATE POLICY "documents: update admin or uploader"
  ON public.documents
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT get_my_role()) IN ('admin', 'csm')
    OR uploaded_by = auth.uid()
  )
  WITH CHECK (
    (SELECT get_my_role()) IN ('admin', 'csm')
    OR uploaded_by = auth.uid()
  );

-- DELETE : admin/csm ou l'uploadeur lui-même.
CREATE POLICY "documents: delete admin or uploader"
  ON public.documents
  FOR DELETE
  TO authenticated
  USING (
    (SELECT get_my_role()) IN ('admin', 'csm')
    OR uploaded_by = auth.uid()
  );


-- ================================================================
-- FIN DU SCHÉMA
-- ================================================================
