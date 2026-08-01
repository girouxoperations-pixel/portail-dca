-- Fix Naïla Lesage: set collected = montant_courant so a_collecter (generated) becomes 0
UPDATE public.cash_entries
SET collected = montant_courant
WHERE id = (
  SELECT cash_entry_id
  FROM public.csm_clients
  WHERE name ILIKE 'naïla lesage'
  LIMIT 1
)
AND montant_courant > collected;
