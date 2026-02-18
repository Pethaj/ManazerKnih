const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://modopafybeslbcqjxsve.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZG9wYWZ5YmVzbGJjcWp4c3ZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTI1MzQyMSwiZXhwIjoyMDcwODI5NDIxfQ.HuQ2gL0IYxQvKzMx4lPYQCKZAOC8jIX8VYZmvL5YHhk';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function deploySQL() {
  console.log('🚀 Nasazuji SQL fix pro kategorii napárovaných produktů...');
  
  const sql = `
CREATE OR REPLACE FUNCTION match_product_combinations_with_problems(problems TEXT[])
RETURNS TABLE (
  matched_product_code TEXT,
  matched_category TEXT,
  matched_product_name TEXT,
  matched_product_url TEXT,
  matched_thumbnail TEXT,
  aloe_recommended TEXT,
  merkaba_recommended TEXT,
  combination_name TEXT,
  matched_problem TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH matched_rules AS (
    SELECT DISTINCT
      l."ID",
      l."Problém"::TEXT as problem,
      l."Prawtein"::TEXT as prawtein,
      l."TČM wan"::TEXT as tcm_wan,
      l."Aloe"::TEXT as aloe,
      l."Merkaba"::TEXT as merkaba,
      l."Poznámka"::TEXT as poznamka
    FROM leceni l
    WHERE
      (
        problems IS NULL
        OR array_length(problems, 1) IS NULL
        OR EXISTS (
          SELECT 1
          FROM unnest(problems) AS p
          WHERE UPPER(l."Problém"::TEXT) = UPPER(p)
        )
      )
  ),
  matched_products AS (
    SELECT 
      mr.poznamka as combination_name,
      mr.problem,
      mr.prawtein as product_code,
      'PRAWTEIN® – superpotravinové směsi'::TEXT as category,
      mr.aloe,
      mr.merkaba
    FROM matched_rules mr
    WHERE mr.prawtein IS NOT NULL AND mr.prawtein != ''
    
    UNION ALL
    
    SELECT 
      mr.poznamka as combination_name,
      mr.problem,
      mr.tcm_wan as product_code,
      'TČM - Tradiční čínská medicína'::TEXT as category,
      mr.aloe,
      mr.merkaba
    FROM matched_rules mr
    WHERE mr.tcm_wan IS NOT NULL AND mr.tcm_wan != ''
  )
  SELECT DISTINCT
    mp.product_code::TEXT,
    COALESCE(pf.category, mp.category)::TEXT as category,
    COALESCE(pf.product_name::TEXT, mp.product_code::TEXT) as product_name,
    pf.url::TEXT,
    pf.thumbnail::TEXT,
    CASE
      WHEN mp.aloe IS NOT NULL AND LOWER(TRIM(mp.aloe)) IN ('ano', 'yes', '1') THEN 'ano'::TEXT
      ELSE 'ne'::TEXT
    END as aloe_recommended,
    CASE
      WHEN mp.merkaba IS NOT NULL AND LOWER(TRIM(mp.merkaba)) IN ('ano', 'yes', '1') THEN 'ano'::TEXT
      ELSE 'ne'::TEXT
    END as merkaba_recommended,
    mp.combination_name::TEXT,
    mp.problem::TEXT as matched_problem
  FROM matched_products mp
  LEFT JOIN product_feed_2 pf ON pf.product_code = mp.product_code;
END;
$$ LANGUAGE plpgsql;
`;

  try {
    const { data, error } = await supabase.rpc('exec', { sql });
    
    if (error) {
      console.error('❌ Chyba při nasazení:', error);
      process.exit(1);
    }
    
    console.log('✅ SQL funkce úspěšně nasazena!');
    console.log('\n🧪 Testuji funkci...');
    
    // Test
    const { data: testData, error: testError } = await supabase.rpc(
      'match_product_combinations_with_problems',
      { problems: ['Bolest hlavy – ze stresu'] }
    );
    
    if (testError) {
      console.error('❌ Chyba při testu:', testError);
      process.exit(1);
    }
    
    console.log('✅ Test úspěšný!');
    console.log('📦 Nalezeno produktů:', testData?.length || 0);
    
    if (testData && testData.length > 0) {
      console.log('\n📋 Produkty:');
      testData.forEach((p) => {
        console.log(`   - ${p.matched_product_name} (${p.matched_category})`);
      });
    }
    
  } catch (err) {
    console.error('❌ Neočekávaná chyba:', err);
    process.exit(1);
  }
}

deploySQL();
