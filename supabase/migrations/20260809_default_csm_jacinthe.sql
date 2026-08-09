-- 1. Assigner Jacinthe à toutes les clientes sans CSM
UPDATE public.csm_clients
SET csm_id = (
  SELECT id FROM public.profiles WHERE full_name ILIKE 'Jacinthe%' LIMIT 1
)
WHERE csm_id IS NULL;

-- 2. Créer les commissions cert_setter manquantes pour les clientes déjà certifiées
INSERT INTO public.csm_commissions (csm_id, client_id, client_name, type, amount, description)
SELECT
  cc.csm_id,
  cc.id,
  cc.name,
  'cert_setter',
  50,
  'Certification setter — ' || cc.name
FROM public.csm_clients cc
LEFT JOIN public.csm_commissions com
  ON com.client_id = cc.id AND com.type = 'cert_setter'
WHERE cc.cert_setter_done = true
  AND cc.csm_id IS NOT NULL
  AND com.id IS NULL;

-- 3. Mettre à jour le trigger pour auto-assigner Jacinthe sur les nouvelles clientes
CREATE OR REPLACE FUNCTION public.create_csm_client_on_cash_entry()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  default_csm_id uuid;
BEGIN
  SELECT id INTO default_csm_id
  FROM public.profiles WHERE full_name ILIKE 'Jacinthe%' LIMIT 1;

  INSERT INTO public.csm_clients
    (cash_entry_id, closer_id, name, enrollment_date, payment_type, csm_id)
  VALUES (
    NEW.id,
    NEW.closed_by,
    COALESCE(NEW.client_name, 'Cliente inconnue'),
    NEW.entry_date,
    CASE
      WHEN NEW.methode = 'Financement' THEN 'financement'
      ELSE 'pif'
    END,
    default_csm_id
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
