-- Allow all authenticated users to SELECT from cash_entries (read-only).
-- Write access (INSERT/UPDATE/DELETE) remains admin/csm only via the existing policy.

CREATE POLICY "cash_entries: select all authenticated"
  ON public.cash_entries
  FOR SELECT
  TO authenticated
  USING (true);
