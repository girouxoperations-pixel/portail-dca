-- Add RDV agenda and deals fields to setter daily entries
ALTER TABLE setter_entries
  ADD COLUMN rdv_agenda integer NOT NULL DEFAULT 0,
  ADD COLUMN deals       integer NOT NULL DEFAULT 0;
