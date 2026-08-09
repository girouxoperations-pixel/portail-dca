-- Supprimer les commissions rétroactives créées automatiquement pour Jacinthe
-- lors de l'assignation par défaut du 2026-08-09.
-- Seules les coches faites à partir d'août 2026 doivent générer une commission.
DELETE FROM public.csm_commissions
WHERE csm_id = (SELECT id FROM public.profiles WHERE full_name ILIKE 'Jacinthe%' LIMIT 1)
  AND created_at::date = '2026-08-09';
