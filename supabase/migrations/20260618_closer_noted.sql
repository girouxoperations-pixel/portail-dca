-- Allow closers to personally track recurring payments without creating cash entries
ALTER TABLE recurring_occurrences ADD COLUMN closer_noted boolean NOT NULL DEFAULT false;
