-- Create function to sync likes count from new likes table to companies table
CREATE OR REPLACE FUNCTION public.sync_company_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the likes_count in companies table based on actual likes in likes table
  UPDATE public.companies 
  SET likes_count = (
    SELECT COUNT(*) 
    FROM public.likes 
    WHERE target_type = 'company' 
    AND target_id = COALESCE(NEW.target_id, OLD.target_id)
  )
  WHERE id = COALESCE(NEW.target_id, OLD.target_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Create triggers to automatically sync likes count
CREATE TRIGGER sync_likes_on_insert
  AFTER INSERT ON public.likes
  FOR EACH ROW
  WHEN (NEW.target_type = 'company')
  EXECUTE FUNCTION public.sync_company_likes_count();

CREATE TRIGGER sync_likes_on_delete
  AFTER DELETE ON public.likes
  FOR EACH ROW
  WHEN (OLD.target_type = 'company')
  EXECUTE FUNCTION public.sync_company_likes_count();

-- Initial sync of all existing companies likes count
DO $$
DECLARE
  company_record RECORD;
  actual_likes_count INTEGER;
BEGIN
  FOR company_record IN 
    SELECT id FROM public.companies
  LOOP
    SELECT COUNT(*) INTO actual_likes_count
    FROM public.likes 
    WHERE target_type = 'company' 
    AND target_id = company_record.id;
    
    UPDATE public.companies 
    SET likes_count = actual_likes_count
    WHERE id = company_record.id;
  END LOOP;
END $$;