-- Ensure the trigger is working correctly and recreate if needed
DROP TRIGGER IF EXISTS sync_likes_count_trigger ON public.likes;

-- Recreate the trigger function with better logging
CREATE OR REPLACE FUNCTION public.sync_company_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only update for company targets
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.target_type = 'company' THEN
      UPDATE public.companies 
      SET likes_count = (
        SELECT COUNT(*) 
        FROM public.likes 
        WHERE target_type = 'company' 
        AND target_id = NEW.target_id
      )
      WHERE id = NEW.target_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.target_type = 'company' THEN
      UPDATE public.companies 
      SET likes_count = (
        SELECT COUNT(*) 
        FROM public.likes 
        WHERE target_type = 'company' 
        AND target_id = OLD.target_id
      )
      WHERE id = OLD.target_id;
    END IF;
    RETURN OLD;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Create the trigger
CREATE TRIGGER sync_likes_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.likes
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_company_likes_count();