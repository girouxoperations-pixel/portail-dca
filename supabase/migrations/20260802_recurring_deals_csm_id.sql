ALTER TABLE public.recurring_deals
  ADD COLUMN IF NOT EXISTS csm_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
