ALTER TABLE public.prospect_followups
  ADD COLUMN IF NOT EXISTS statut text NOT NULL DEFAULT 'actif'
    CONSTRAINT prospect_followups_statut_check
      CHECK (statut IN ('actif', 'contacté', 'closé', 'perdu'));

-- Sync existing done=true rows to 'closé'
UPDATE public.prospect_followups
SET statut = 'closé'
WHERE done = true AND statut = 'actif';
