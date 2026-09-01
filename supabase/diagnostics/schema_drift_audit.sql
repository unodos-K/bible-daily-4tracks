-- Read-only public-schema inventory. Run this in the Supabase SQL Editor as an
-- administrative user when a schema-only dump cannot be produced locally.
-- It returns metadata only: no application rows, authentication records, or secrets.

-- Public tables, RLS state, and columns/defaults.
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  a.attname AS column_name,
  pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
  a.attnotnull AS not_null,
  pg_get_expr(d.adbin, d.adrelid) AS default_expression
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid
LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
WHERE n.nspname = 'public'
  AND c.relkind IN ('r', 'p')
  AND a.attnum > 0
  AND NOT a.attisdropped
ORDER BY c.relname, a.attnum;

-- Primary, foreign, unique, and check constraints.
SELECT
  conrelid::regclass::text AS table_name,
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid, true) AS definition
FROM pg_catalog.pg_constraint
WHERE connamespace = 'public'::regnamespace
ORDER BY table_name, constraint_name;

-- Non-constraint indexes.
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_catalog.pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- RLS policy definitions. The public invite policy must not include USING (true).
SELECT
  tablename,
  policyname,
  roles,
  cmd,
  qual AS using_expression,
  with_check
FROM pg_catalog.pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Application functions/RPCs, including SECURITY DEFINER, search_path, and grants.
SELECT
  p.oid::regprocedure::text AS function_signature,
  p.prosecdef AS security_definer,
  p.proconfig AS function_settings,
  p.proacl AS execute_acl,
  pg_get_functiondef(p.oid) AS definition
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
ORDER BY function_signature;

-- User-defined triggers in the public schema.
SELECT
  c.relname AS table_name,
  t.tgname AS trigger_name,
  pg_get_triggerdef(t.oid, true) AS definition
FROM pg_catalog.pg_trigger t
JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND NOT t.tgisinternal
ORDER BY table_name, trigger_name;

-- Applied migration versions, independent from the actual database objects above.
SELECT version, name
FROM supabase_migrations.schema_migrations
ORDER BY version;
