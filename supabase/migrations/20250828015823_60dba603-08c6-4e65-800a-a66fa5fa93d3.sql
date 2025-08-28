-- Identificar e corrigir problemas de Security Definer View

-- Primeiro, vamos verificar que tipo de objeto é companies_public
SELECT 
  schemaname, 
  tablename as name,
  'table' as object_type
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'companies_public'

UNION ALL

SELECT 
  schemaname,
  viewname as name,
  'view' as object_type  
FROM pg_views 
WHERE schemaname = 'public' AND viewname = 'companies_public'

UNION ALL

SELECT 
  n.nspname as schemaname,
  c.relname as name,
  CASE c.relkind 
    WHEN 'v' THEN 'view'
    WHEN 'm' THEN 'materialized_view'
    WHEN 'r' THEN 'table'
    ELSE 'other'
  END as object_type
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' AND c.relname = 'companies_public';