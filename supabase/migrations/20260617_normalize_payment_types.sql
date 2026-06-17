-- Normalize existing payment_type values to lowercase-hyphen format
UPDATE public.csm_clients
SET payment_type = CASE
  WHEN lower(trim(payment_type)) IN ('pif')                         THEN 'pif'
  WHEN lower(regexp_replace(trim(payment_type), '\s+', '-', 'g'))
       IN ('2-vers', '2vers')                                        THEN '2-vers'
  WHEN lower(regexp_replace(trim(payment_type), '\s+', '-', 'g'))
       IN ('3-vers', '3vers')                                        THEN '3-vers'
  WHEN lower(trim(payment_type)) LIKE 'fin%'                        THEN 'financement'
  ELSE lower(regexp_replace(trim(payment_type), '\s+', '-', 'g'))
END
WHERE payment_type IS NOT NULL;
