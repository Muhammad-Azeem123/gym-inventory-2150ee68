-- Drop triggers first
DROP TRIGGER IF EXISTS category_name_update_trigger ON public.categories;
DROP TRIGGER IF EXISTS category_delete_check_trigger ON public.categories;

-- Drop functions  
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

-- Recreate triggers
CREATE TRIGGER category_name_update_trigger
AFTER UPDATE ON public.categories
FOR EACH ROW
WHEN (OLD.name IS DISTINCT FROM NEW.name)
EXECUTE FUNCTION public.handle_category_update();

CREATE TRIGGER category_delete_check_trigger
BEFORE DELETE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.handle_category_delete();