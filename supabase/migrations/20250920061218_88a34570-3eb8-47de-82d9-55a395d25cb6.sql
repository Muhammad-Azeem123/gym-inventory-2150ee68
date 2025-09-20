-- Remove old product-specific columns from sales table since we now use sale_items
ALTER TABLE public.sales 
DROP COLUMN IF EXISTS product_id CASCADE,
DROP COLUMN IF EXISTS product_name CASCADE,
DROP COLUMN IF EXISTS quantity CASCADE,
DROP COLUMN IF EXISTS price_per_unit CASCADE;

-- Remove the old stock update trigger since we now use sale_items
DROP TRIGGER IF EXISTS sales_stock_update ON public.sales;

-- Remove the old function since it's no longer needed
DROP FUNCTION IF EXISTS public.handle_sale_stock_update();