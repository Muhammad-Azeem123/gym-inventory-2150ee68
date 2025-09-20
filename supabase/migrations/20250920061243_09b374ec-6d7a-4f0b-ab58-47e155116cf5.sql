-- Drop the trigger first
DROP TRIGGER IF EXISTS update_stock_on_sale ON public.sales;

-- Then drop the function
DROP FUNCTION IF EXISTS public.handle_sale_stock_update();

-- Now safely remove old product-specific columns from sales table
ALTER TABLE public.sales 
DROP COLUMN IF EXISTS product_id CASCADE,
DROP COLUMN IF EXISTS product_name CASCADE,
DROP COLUMN IF EXISTS quantity CASCADE,
DROP COLUMN IF EXISTS price_per_unit CASCADE;