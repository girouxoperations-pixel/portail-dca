-- Add csm_id column to cash_entries for direct CSM assignment on deals
ALTER TABLE public.cash_entries
  ADD COLUMN IF NOT EXISTS csm_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
