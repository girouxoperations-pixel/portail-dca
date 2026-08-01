-- Fix Naïla Lesage: clear a_collecter on her original cash_entry so Clientes shows PIF
UPDATE public.cash_entries
SET a_collecter = 0
WHERE id = (
  SELECT cash_entry_id
  FROM public.csm_clients
  WHERE name ILIKE 'naïla lesage'
  LIMIT 1
)
AND a_collecter > 0;
