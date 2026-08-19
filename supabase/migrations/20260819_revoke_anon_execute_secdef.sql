-- Revoke direct RPC access to SECURITY DEFINER functions from anon and authenticated.
-- These are all trigger helpers / internal functions — they should never be called
-- directly via /rest/v1/rpc by unauthenticated or authenticated users.
-- Triggers and internal calls are unaffected (they run as the DB owner, not via RPC).

REVOKE EXECUTE ON FUNCTION public.create_cm_followup_on_csm_client()  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_csm_client_on_cash_entry()   FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_followup_on_cash_entry()     FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_my_role()                        FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_my_roles()                       FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                    FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_onboarding_date_to_csm()       FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_primary_role()                  FROM anon, authenticated;
