-- Create gallery table for company photos
CREATE TABLE public.gallery (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;

-- Create policies for gallery
CREATE POLICY "Company owners can manage their gallery" 
ON public.gallery 
FOR ALL 
USING (company_id IN (
  SELECT id FROM companies WHERE user_id = auth.uid()
));

CREATE POLICY "Public can view active gallery photos" 
ON public.gallery 
FOR SELECT 
USING (is_active = true);

-- Create storage bucket for gallery images
INSERT INTO storage.buckets (id, name, public) VALUES ('gallery', 'gallery', true);

-- Create storage policies for gallery
CREATE POLICY "Company owners can upload gallery images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'gallery' AND auth.uid() IS NOT NULL);

CREATE POLICY "Company owners can view their gallery images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'gallery');

CREATE POLICY "Company owners can delete their gallery images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'gallery' AND auth.uid() IS NOT NULL);

-- Add trigger for updated_at
CREATE TRIGGER update_gallery_updated_at
BEFORE UPDATE ON public.gallery
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();