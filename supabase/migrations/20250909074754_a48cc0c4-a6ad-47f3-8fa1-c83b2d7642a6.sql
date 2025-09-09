-- Fix search path for category functions
DROP FUNCTION IF EXISTS public.handle_category_update();
DROP FUNCTION IF EXISTS public.handle_category_delete();

-- Function to handle category updates across tables (with proper search path)
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to handle category deletion (with proper search path)
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;