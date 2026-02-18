/**
 * TEST: Product Pairing s merge logikou
 * 
 * Tento script testuje:
 * 1. Problem Classification → ["Bolest hlavy – ze stresu"]
 * 2. SQL Pairing → [Prawtein, TČM, Aloe]
 * 3. Product Extractor → [NO, NOSE, 004]
 * 4. Merge + Deduplikace
 * 
 * Spuštění:
 * node test-pairing-merge.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Chybí SUPABASE credentials v .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPairingMerge() {
  console.log('🧪 TEST: Product Pairing s Merge logikou');
  console.log('='.repeat(70));
  
  // KROK 1: Simulace Problem Classification
  const problems = ["Bolest hlavy – ze stresu"];
  console.log('🔍 KROK 1: Problem Classification');
  console.log('   Problémy:', problems);
  console.log('');
  
  // KROK 2: SQL Pairing (POUZE podle problému)
  console.log('🔗 KROK 2: SQL Pairing (pouze podle problému)');
  console.log('   SQL: SELECT * FROM match_product_combinations_with_problems(', problems, ')');
  
  const { data: sqlProducts, error } = await supabase
    .rpc('match_product_combinations_with_problems', {
      problems: problems
    });
  
  if (error) {
    console.error('❌ SQL chyba:', error);
    return;
  }
  
  console.log('   ✅ SQL vrátilo produkty:', sqlProducts?.length || 0);
  sqlProducts?.forEach(p => {
    console.log(`      - ${p.matched_product_name} (${p.matched_category})`);
  });
  console.log('');
  
  // KROK 3: Simulace Product Extractor (z N8N odpovědi)
  const extractedProducts = [
    { product_code: '918', product_name: 'NO esenciální olej', category: 'Směsi EO' },
    { product_code: '2288', product_name: 'NOSE esenciální olej', category: 'Směsi EO' },
    { product_code: '2737', product_name: '004 - Eliminace větru', category: 'TČM' }
  ];
  
  console.log('📦 KROK 3: Product Extractor (simulace)');
  console.log('   Extrahované produkty:', extractedProducts.length);
  extractedProducts.forEach(p => {
    console.log(`      - ${p.product_name} (${p.category})`);
  });
  console.log('');
  
  // KROK 4: Párované produkty z SQL
  const pairedProducts = sqlProducts?.map(p => ({
    product_code: p.matched_product_code,
    product_name: p.matched_product_name,
    category: p.matched_category,
    source: 'pairing'
  })) || [];
  
  console.log('🔗 KROK 4: Párované produkty ze SQL');
  console.log('   Párované produkty:', pairedProducts.length);
  pairedProducts.forEach(p => {
    console.log(`      - ${p.product_name} (${p.category})`);
  });
  console.log('');
  
  // KROK 5: MERGE + Deduplikace
  console.log('🔀 KROK 5: MERGE + Deduplikace');
  console.log('   Spojuji: Extrahované + Párované');
  
  const allProducts = [...extractedProducts, ...pairedProducts];
  console.log('   Před deduplikací:', allProducts.length);
  
  // Deduplikace podle product_code
  const uniqueProducts = Array.from(
    new Map(allProducts.map(p => [p.product_code, p])).values()
  );
  
  console.log('   Po deduplikaci:', uniqueProducts.length);
  console.log('   Duplicit odstraněno:', allProducts.length - uniqueProducts.length);
  console.log('');
  
  // VÝSLEDEK
  console.log('🎉 VÝSLEDEK: Finální seznam produktů');
  console.log('='.repeat(70));
  uniqueProducts.forEach((p, i) => {
    console.log(`${i + 1}. ${p.product_name} (${p.category}) [${p.product_code}]`);
  });
  console.log('');
  console.log('📊 Statistika:');
  console.log('   - Extrahované produkty:', extractedProducts.length);
  console.log('   - Párované produkty:', pairedProducts.length);
  console.log('   - Celkem před merge:', allProducts.length);
  console.log('   - Finální (po deduplikaci):', uniqueProducts.length);
  console.log('='.repeat(70));
}

// Spusť test
testPairingMerge().catch(console.error);
