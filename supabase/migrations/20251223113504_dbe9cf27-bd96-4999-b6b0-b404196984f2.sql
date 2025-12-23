-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS decrease_stock_on_sale_trigger ON public.stock_sales;

-- Create improved function to handle stock on sale INSERT
CREATE OR REPLACE FUNCTION public.decrease_stock_on_sale()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.stock_products
  SET quantity = quantity - NEW.quantity
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to handle stock on sale UPDATE (restore old quantity, deduct new quantity)
CREATE OR REPLACE FUNCTION public.adjust_stock_on_sale_update()
RETURNS TRIGGER AS $$
BEGIN
  -- First restore the old quantity
  UPDATE public.stock_products
  SET quantity = quantity + OLD.quantity
  WHERE id = OLD.product_id;
  
  -- Then deduct the new quantity
  UPDATE public.stock_products
  SET quantity = quantity - NEW.quantity
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to restore stock on sale DELETE
CREATE OR REPLACE FUNCTION public.restore_stock_on_sale_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.stock_products
  SET quantity = quantity + OLD.quantity
  WHERE id = OLD.product_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for INSERT (decrease stock)
CREATE TRIGGER stock_sale_insert_trigger
AFTER INSERT ON public.stock_sales
FOR EACH ROW
EXECUTE FUNCTION public.decrease_stock_on_sale();

-- Create trigger for UPDATE (adjust stock based on quantity change)
CREATE TRIGGER stock_sale_update_trigger
AFTER UPDATE ON public.stock_sales
FOR EACH ROW
WHEN (OLD.quantity IS DISTINCT FROM NEW.quantity OR OLD.product_id IS DISTINCT FROM NEW.product_id)
EXECUTE FUNCTION public.adjust_stock_on_sale_update();

-- Create trigger for DELETE (restore stock)
CREATE TRIGGER stock_sale_delete_trigger
AFTER DELETE ON public.stock_sales
FOR EACH ROW
EXECUTE FUNCTION public.restore_stock_on_sale_delete();

-- Enable realtime for stock tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_sales;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_categories;