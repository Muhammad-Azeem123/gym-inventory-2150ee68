-- Drop the existing foreign key constraint
ALTER TABLE sale_items 
DROP CONSTRAINT IF EXISTS sale_items_product_id_fkey;

-- Add the foreign key constraint with CASCADE delete
ALTER TABLE sale_items
ADD CONSTRAINT sale_items_product_id_fkey 
FOREIGN KEY (product_id) 
REFERENCES products(id) 
ON DELETE CASCADE;