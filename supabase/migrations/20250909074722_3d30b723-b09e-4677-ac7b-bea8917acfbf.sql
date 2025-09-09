-- Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Create policy for category access
CREATE POLICY "Anyone can manage categories" 
ON public.categories 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert existing categories from products table
INSERT INTO public.categories (name)
SELECT DISTINCT category 
FROM public.products 
WHERE category IS NOT NULL AND category != ''
ON CONFLICT (name) DO NOTHING;

-- Function to handle category updates across tables
CREATE OR REPLACE FUNCTION public.handle_category_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Update products table when category name changes
  IF OLD.name != NEW.name THEN
    UPDATE public.products 
    SET category = NEW.name 
    WHERE category = OLD.name;
    
    UPDATE public.purchases 
    SET category = NEW.name 
    WHERE category = OLD.name;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for category updates
CREATE TRIGGER category_name_update_trigger
AFTER UPDATE ON public.categories
FOR EACH ROW
WHEN (OLD.name IS DISTINCT FROM NEW.name)
EXECUTE FUNCTION public.handle_category_update();

-- Function to handle category deletion
CREATE OR REPLACE FUNCTION public.handle_category_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if category is being used
  IF EXISTS (SELECT 1 FROM public.products WHERE category = OLD.name) OR
     EXISTS (SELECT 1 FROM public.purchases WHERE category = OLD.name) THEN
    RAISE EXCEPTION 'Cannot delete category "%" as it is being used in products or purchases', OLD.name;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for category deletion
CREATE TRIGGER category_delete_check_trigger
BEFORE DELETE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.handle_category_delete();