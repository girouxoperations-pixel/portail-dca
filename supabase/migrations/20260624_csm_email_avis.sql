-- Add email_avis column to csm_clients for tracking legal notices
ALTER TABLE public.csm_clients
  ADD COLUMN IF NOT EXISTS email_avis text
    CHECK (email_avis IN ('1er_avis', '2e_avis', '3e_avis', 'mise_en_demeure'))
    DEFAULT NULL;
