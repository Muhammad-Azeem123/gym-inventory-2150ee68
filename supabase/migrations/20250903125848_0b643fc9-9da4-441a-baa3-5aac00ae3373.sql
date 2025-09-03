-- Create products table to store gym equipment inventory
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  price_per_unit DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create purchases table to track equipment purchases
CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price_per_unit DECIMAL(10, 2) NOT NULL,
  total_cost DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create sales table to track equipment sales
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price_per_unit DECIMAL(10, 2) NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since gym equipment is typically managed by staff)
CREATE POLICY "Anyone can manage products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can manage purchases" ON public.purchases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can manage sales" ON public.sales FOR ALL USING (true) WITH CHECK (true);

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION public.update_product_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for products table
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_product_updated_at();

-- Create function to update product stock after purchase
CREATE OR REPLACE FUNCTION public.handle_purchase_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if product exists
  IF EXISTS (SELECT 1 FROM public.products WHERE name = NEW.product_name AND category = NEW.category) THEN
    -- Update existing product stock and price
    UPDATE public.products 
    SET quantity = quantity + NEW.quantity,
        price_per_unit = NEW.price_per_unit,
        updated_at = now()
    WHERE name = NEW.product_name AND category = NEW.category;
  ELSE
    -- Insert new product
    INSERT INTO public.products (name, category, quantity, price_per_unit)
    VALUES (NEW.product_name, NEW.category, NEW.quantity, NEW.price_per_unit);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for purchases
CREATE TRIGGER handle_purchase_insert_trigger
  AFTER INSERT ON public.purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_purchase_insert();

-- Create function to update product stock after sale
CREATE OR REPLACE FUNCTION public.handle_sale_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Update product stock
  UPDATE public.products 
  SET quantity = quantity - NEW.quantity,
      updated_at = now()
  WHERE name = NEW.product_name AND category = NEW.category;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for sales
CREATE TRIGGER handle_sale_insert_trigger
  AFTER INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_sale_insert();