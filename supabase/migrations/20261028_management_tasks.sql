CREATE TABLE public.management_tasks (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text        NOT NULL,
  category     text        NOT NULL DEFAULT 'autre'
                           CHECK (category IN ('remboursement','plateforme','paie','csm','admin','autre')),
  assigned_to  uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date     date,
  status       text        NOT NULL DEFAULT 'a_faire'
                           CHECK (status IN ('a_faire','en_cours','complete')),
  notes        text,
  created_by   uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.management_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "management_tasks: admin/head_csm full access"
  ON public.management_tasks
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND (role IN ('admin','head_csm') OR 'head_csm' = ANY(roles))
    )
  );

CREATE POLICY "management_tasks: assigned user can read and update status"
  ON public.management_tasks
  FOR SELECT
  TO authenticated
  USING (assigned_to = auth.uid());
