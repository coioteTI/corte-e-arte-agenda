-- Enable realtime for likes table
ALTER TABLE public.likes REPLICA IDENTITY FULL;

-- Add likes table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.likes;

-- Also enable realtime for companies table to sync likes_count
ALTER TABLE public.companies REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.companies;