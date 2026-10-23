CREATE TABLE public.alveo_creances (
  id                 uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name        text          NOT NULL,
  contenu_consomme   numeric(12,2) NOT NULL DEFAULT 0,
  capital_paye       numeric(12,2) NOT NULL DEFAULT 0,
  balance_due        numeric(12,2) GENERATED ALWAYS AS (contenu_consomme - capital_paye) STORED,
  csm_id             uuid          REFERENCES public.profiles(id) ON DELETE SET NULL,
  status             text          NOT NULL DEFAULT 'actif'
                                   CHECK (status IN ('actif','en_collecte','regle','perdu')),
  notes              text,
  alveo_deal_id      uuid          REFERENCES public.alveo_deals(id) ON DELETE SET NULL,
  created_at         timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE public.alveo_creances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alveo_creances: admin/csm full access"
  ON public.alveo_creances
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND (role = 'admin' OR 'csm' = ANY(roles) OR 'head_csm' = ANY(roles))
    )
  );
