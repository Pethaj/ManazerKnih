/**
 * Vector Database Diagnostics
 * Diagnostické nástroje pro ladění Supabase vektorové databáze
 */

import { supabase } from '../lib/supabase';

export interface DiagnosticResult {
  test: string;
  success: boolean;
  result?: any;
  error?: string;
}

/**
 * Kompletní diagnostika vektorové databáze
 */
export async function runVectorDiagnostics(): Promise<DiagnosticResult[]> {
  const results: DiagnosticResult[] = [];
  
  console.log('🔧 Spouštím diagnostiku vektorové databáze...');
  
  // Test 1: Ověření pgvector extension
  try {
    const { data, error } = await supabase
      .from('pg_extension')
      .select('extname, extversion')
      .eq('extname', 'vector');
    
    results.push({
      test: 'pgvector extension',
      success: !error && data && data.length > 0,
      result: data,
      error: error?.message
    });
  } catch (err) {
    results.push({
      test: 'pgvector extension',
      success: false,
      error: err instanceof Error ? err.message : 'Neznámá chyba'
    });
  }
  
  // Test 2: Ověření existence tabulky product_embeddings
  try {
    const { data, error } = await supabase
      .from('product_embeddings')
      .select('count(*)')
      .limit(1);
    
    results.push({
      test: 'product_embeddings tabulka',
      success: !error,
      result: data,
      error: error?.message
    });
  } catch (err) {
    results.push({
      test: 'product_embeddings tabulka',
      success: false,
      error: err instanceof Error ? err.message : 'Neznámá chyba'
    });
  }
  
  // Test 3: Počet záznamů v product_embeddings
  try {
    const { count, error } = await supabase
      .from('product_embeddings')
      .select('*', { count: 'exact', head: true });
    
    results.push({
      test: 'počet embeddingů',
      success: !error,
      result: { count },
      error: error?.message
    });
  } catch (err) {
    results.push({
      test: 'počet embeddingů',
      success: false,
      error: err instanceof Error ? err.message : 'Neznámá chyba'
    });
  }
  
  // Test 4: Počet záznamů s vygenerovanými embeddingy
  try {
    const { count, error } = await supabase
      .from('product_embeddings')
      .select('*', { count: 'exact', head: true })
      .eq('embedding_status', 'completed')
      .not('embedding', 'is', null);
    
    results.push({
      test: 'dokončené embeddingy',
      success: !error,
      result: { count },
      error: error?.message
    });
  } catch (err) {
    results.push({
      test: 'dokončené embeddingy',
      success: false,
      error: err instanceof Error ? err.message : 'Neznámá chyba'
    });
  }
  
  // Test 5: Ukázka embedding dat
  try {
    const { data, error } = await supabase
      .from('product_embeddings')
      .select('product_code, product_name, embedding_status, embedding_model')
      .limit(3);
    
    results.push({
      test: 'ukázka dat',
      success: !error,
      result: data,
      error: error?.message
    });
  } catch (err) {
    results.push({
      test: 'ukázka dat',
      success: false,
      error: err instanceof Error ? err.message : 'Neznámá chyba'
    });
  }
  
  // Test 6: Ověření RPC funkce search_products_by_vector
  try {
    // Vytvoříme testovací embedding (náhodný vektor 1536 dimenzí)
    const testEmbedding = Array.from({ length: 1536 }, () => Math.random() - 0.5);
    
    const { data, error } = await supabase.rpc('search_products_by_vector', {
      query_embedding: testEmbedding,
      similarity_threshold: 0.1,
      max_results: 1
    });
    
    results.push({
      test: 'RPC funkce search_products_by_vector',
      success: !error,
      result: { found: data?.length || 0 },
      error: error?.message
    });
  } catch (err) {
    results.push({
      test: 'RPC funkce search_products_by_vector',
      success: false,
      error: err instanceof Error ? err.message : 'Neznámá chyba'
    });
  }
  
  // Test 7: Ověření produktů v main tabulce
  try {
    const { count, error } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });
    
    results.push({
      test: 'produkty v main tabulce',
      success: !error,
      result: { count },
      error: error?.message
    });
  } catch (err) {
    results.push({
      test: 'produkty v main tabulce',
      success: false,
      error: err instanceof Error ? err.message : 'Neznámá chyba'
    });
  }
  
  return results;
}

/**
 * Vypíše výsledky diagnostiky do konzole
 */
export function printDiagnosticResults(results: DiagnosticResult[]): void {
  console.log('📊 === VÝSLEDKY DIAGNOSTIKY VEKTOROVÉ DATABÁZE ===');
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.test}:`, result.result || result.error);
  });
  
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  console.log(`📊 Úspěšnost: ${successCount}/${totalCount} testů prošlo`);
  
  if (successCount < totalCount) {
    console.log('🔧 Doporučení:');
    results.filter(r => !r.success).forEach(result => {
      console.log(`   - Opravte: ${result.test} (${result.error})`);
    });
  }
}

/**
 * Rychlý test vektorového vyhledávání
 */
export async function quickVectorSearchTest(): Promise<void> {
  console.log('🚀 Spouštím rychlý test vektorového vyhledávání...');
  
  const results = await runVectorDiagnostics();
  printDiagnosticResults(results);
}
