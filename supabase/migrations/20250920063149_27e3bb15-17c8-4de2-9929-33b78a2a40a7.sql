-- Update RLS policies to require authentication for all tables

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Anyone can manage products" ON public.products;
DROP POLICY IF EXISTS "Anyone can manage purchases" ON public.purchases;
DROP POLICY IF EXISTS "Anyone can manage sale items" ON public.sale_items;
DROP POLICY IF EXISTS "Anyone can manage sales" ON public.sales;

-- Create secure policies that require authentication
-- Categories policies
CREATE POLICY "Authenticated users can view categories" ON public.categories
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert categories" ON public.categories
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update categories" ON public.categories
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete categories" ON public.categories
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Products policies
CREATE POLICY "Authenticated users can view products" ON public.products
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert products" ON public.products
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update products" ON public.products
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete products" ON public.products
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Purchases policies
CREATE POLICY "Authenticated users can view purchases" ON public.purchases
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert purchases" ON public.purchases
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update purchases" ON public.purchases
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete purchases" ON public.purchases
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Sales policies
CREATE POLICY "Authenticated users can view sales" ON public.sales
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert sales" ON public.sales
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update sales" ON public.sales
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete sales" ON public.sales
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Sale items policies
CREATE POLICY "Authenticated users can view sale items" ON public.sale_items
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert sale items" ON public.sale_items
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update sale items" ON public.sale_items
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete sale items" ON public.sale_items
  FOR DELETE USING (auth.uid() IS NOT NULL);