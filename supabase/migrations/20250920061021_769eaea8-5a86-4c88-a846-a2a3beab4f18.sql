-- Create sale_items table for multiple items per sale
CREATE TABLE public.sale_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL,
  product_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price_per_unit NUMERIC NOT NULL CHECK (price_per_unit >= 0),
  total_amount NUMERIC NOT NULL CHECK (total_amount >= 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add customer information and remove product-specific fields from sales table
ALTER TABLE public.sales 
ADD COLUMN customer_name TEXT,
ADD COLUMN customer_phone TEXT,
ADD COLUMN sale_date TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Enable RLS for sale_items
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for sale_items (matching sales table policy)
CREATE POLICY "Anyone can manage sale items" 
ON public.sale_items 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Update the stock update function to work with sale_items
CREATE OR REPLACE FUNCTION public.handle_sale_item_stock_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.products 
  SET quantity = quantity - NEW.quantity
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger for sale_items stock updates
CREATE TRIGGER sale_items_stock_update
  AFTER INSERT ON public.sale_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_sale_item_stock_update();

-- Update existing sales table total_amount calculation function
CREATE OR REPLACE FUNCTION public.calculate_sale_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER  
SET search_path = 'public'
AS $$
BEGIN
  -- Update the sales table total when sale_items are inserted/updated/deleted
  UPDATE public.sales 
  SET total_amount = (
    SELECT COALESCE(SUM(total_amount), 0) 
    FROM public.sale_items 
    WHERE sale_id = COALESCE(NEW.sale_id, OLD.sale_id)
  )
  WHERE id = COALESCE(NEW.sale_id, OLD.sale_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers to automatically calculate sale totals
CREATE TRIGGER sale_total_on_insert
  AFTER INSERT ON public.sale_items
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_sale_total();

CREATE TRIGGER sale_total_on_update
  AFTER UPDATE ON public.sale_items
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_sale_total();

CREATE TRIGGER sale_total_on_delete
  AFTER DELETE ON public.sale_items
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_sale_total();