-- Add quantity column to stock_products
ALTER TABLE public.stock_products
ADD COLUMN quantity integer NOT NULL DEFAULT 0;

-- Create function to decrease stock when sale is made
CREATE OR REPLACE FUNCTION public.decrease_stock_on_sale()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.stock_products
  SET quantity = quantity - NEW.quantity
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-decrease stock
CREATE TRIGGER decrease_stock_on_sale_trigger
AFTER INSERT ON public.stock_sales
FOR EACH ROW
EXECUTE FUNCTION public.decrease_stock_on_sale();