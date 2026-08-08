-- Link csm_tasks to a recurring_occurrence for deduplication
ALTER TABLE csm_tasks
  ADD COLUMN IF NOT EXISTS recurring_occurrence_id uuid
    REFERENCES recurring_occurrences(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS csm_tasks_occurrence_unique
  ON csm_tasks(recurring_occurrence_id)
  WHERE recurring_occurrence_id IS NOT NULL;
