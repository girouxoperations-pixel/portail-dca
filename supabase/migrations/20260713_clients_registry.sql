-- Master client registry for all years (2024, 2025, 2026+)
-- 2024/2025: historical data imported from Excel
-- 2026+: live data comes from csm_clients + cash_entries (not stored here)

CREATE TABLE public.clients_registry (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  year          int         NOT NULL,
  name          text        NOT NULL,
  phone         text,
  email         text,
  entry_date    date,
  exit_date     date,
  methode       text,                   -- Interac, Crédit, Financement
  montant_reste numeric,               -- remaining balance (historical only; 2026 computed live)
  status        text        NOT NULL DEFAULT 'completed'
                            CHECK (status IN ('completed', 'dropped', 'refund', 'active')),
  notes         text,
  cash_entry_id uuid        REFERENCES public.cash_entries(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON public.clients_registry (year);
CREATE INDEX ON public.clients_registry (entry_date);

ALTER TABLE public.clients_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients_registry: admin full access"
  ON public.clients_registry FOR ALL TO authenticated
  USING  ((SELECT get_my_role()) = 'admin')
  WITH CHECK ((SELECT get_my_role()) = 'admin');
