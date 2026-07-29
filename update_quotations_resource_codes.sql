-- SIGO System - Standardize Resource Codes for Quotations
-- Updates legacy equipment codes (EQ-xxx to EP-000x) and non-digit labor codes (MO-xxx to MO-000x)

-- 1. Convert legacy EQ- prefix to standard EP- prefix for Equipment
UPDATE public.resources
SET code = 'EP-' || SUBSTRING(code FROM 4)
WHERE type = 'equipment' AND code LIKE 'EQ-%';

-- 2. Format equipment codes with standard 4-digit padding where numbers exist
UPDATE public.resources
SET code = 'EP-' || LPAD(REGEXP_REPLACE(code, '[^0-9]', '', 'g'), 4, '0')
WHERE type = 'equipment' 
  AND REGEXP_REPLACE(code, '[^0-9]', '', 'g') != '' 
  AND code NOT SIMILAR TO 'EP-[0-9]{4}';

-- 3. Format labor codes with standard 4-digit padding where numbers exist
UPDATE public.resources
SET code = 'MO-' || LPAD(REGEXP_REPLACE(code, '[^0-9]', '', 'g'), 4, '0')
WHERE type = 'labor' 
  AND REGEXP_REPLACE(code, '[^0-9]', '', 'g') != '' 
  AND code NOT SIMILAR TO 'MO-[0-9]{4}';

-- 4. Output resulting resource list for verification
SELECT id, code, name, type, base_price FROM public.resources ORDER BY type, code;
