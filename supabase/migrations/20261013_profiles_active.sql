-- Add active flag to profiles; inactive users are hidden from dropdowns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

-- Désactiver Alexandra Lizotte
UPDATE public.profiles
SET active = false
WHERE full_name ILIKE '%Alexandra Lizotte%';
