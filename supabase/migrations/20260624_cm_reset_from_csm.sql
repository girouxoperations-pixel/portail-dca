-- Reset cm_followups to match csm_clients exactly.
-- Drops the duplicate "on_sale" trigger and repopulates from csm_clients.

-- 1. Drop the trigger that fired on cash_entries (created duplicates + included recurring)
DROP TRIGGER IF EXISTS trg_cm_followup_on_sale ON public.cash_entries;
DROP FUNCTION IF EXISTS public.create_cm_followup_on_sale();

-- 2. Update the csm_client trigger to also propagate cash_entry_id
CREATE OR REPLACE FUNCTION public.create_cm_followup_on_csm_client()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.cm_followups (client_name, cm_id, created_at, csm_client_id, cash_entry_id)
  VALUES (
    NEW.name,
    NULL,
    COALESCE(NEW.enrollment_date::timestamptz, NOW()),
    NEW.id,
    NEW.cash_entry_id
  )
  ON CONFLICT (csm_client_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 3. Wipe all existing cm_followups (reset to clean state)
DELETE FROM public.cm_followups;

-- 4. Repopulate from csm_clients (only real sales, no recurring)
INSERT INTO public.cm_followups (client_name, cm_id, created_at, csm_client_id, cash_entry_id)
SELECT
  name,
  NULL,
  COALESCE(enrollment_date::timestamptz, NOW()),
  id,
  cash_entry_id
FROM public.csm_clients
ON CONFLICT (csm_client_id) DO NOTHING;
