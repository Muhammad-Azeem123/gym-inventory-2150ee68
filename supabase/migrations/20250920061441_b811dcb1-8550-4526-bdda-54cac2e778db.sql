-- Add foreign key constraint between sale_items and products
ALTER TABLE public.sale_items 
ADD CONSTRAINT sale_items_product_id_fkey 
FOREIGN KEY (product_id) REFERENCES public.products(id);

-- Add foreign key constraint between sale_items and sales  
ALTER TABLE public.sale_items 
ADD CONSTRAINT sale_items_sale_id_fkey 
FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE CASCADE;