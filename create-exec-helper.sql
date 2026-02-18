-- ============================================================================
-- HELPER: Vytvoření RPC funkce pro spouštění DDL
-- ============================================================================

CREATE OR REPLACE FUNCTION exec_ddl(sql_query TEXT)
RETURNS TEXT AS $$
BEGIN
  EXECUTE sql_query;
  RETURN 'Success';
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'Error: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant pro service role
GRANT EXECUTE ON FUNCTION exec_ddl TO service_role;
