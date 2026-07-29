-- SQL Script to clean up dummy resources and reset service compositions created with the buggy import behavior

-- 1. Remove references to the dummy INS- resources from service composition items
-- For service compositions that had these dummy items, we update their items JSONB to be empty []
-- so they can be composed correctly from scratch.
UPDATE service_compositions
SET items = '[]'::jsonb, updated_at = now()
WHERE EXISTS (
  SELECT 1 
  FROM jsonb_array_elements(items) AS elem
  JOIN resources r ON r.id = elem->>'resourceId'
  WHERE r.code LIKE 'INS-%'
);

-- 2. Delete the dummy material resources created with the 'INS-' prefix
DELETE FROM resources
WHERE code LIKE 'INS-%';
