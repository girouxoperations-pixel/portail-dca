-- Replace the (recurring_deal_id, mois, annee) unique constraint with
-- (recurring_deal_id, date_attendue) so weekly deals can have multiple
-- occurrences in the same month without conflicting.

ALTER TABLE public.recurring_occurrences
  DROP CONSTRAINT IF EXISTS recurring_occurrences_recurring_deal_id_mois_annee_key;

ALTER TABLE public.recurring_occurrences
  ADD CONSTRAINT recurring_occurrences_deal_date_unique
    UNIQUE (recurring_deal_id, date_attendue);
