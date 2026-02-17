import { matchProductNames } from './src/services/productNameMatchingService';

/**
 * KRITICKÝ TEST: NO, NOSE, NOPA matching
 * 
 * Testuje, že:
 * 1. "NO" se namapuje na "NO esenciální olej" (ID 3738), NE na "005 - Vůně magnólie"
 * 2. "NOSE" se namapuje na "NOSE esenciální olej" (ID 3738 nebo jiné)
 * 3. "NOPA" se namapuje na "NOPA esenciální olej"
 * 4. Všechny mají podobnost > 90%
 */
async function testCriticalEOMatching() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🔥 KRITICKÝ TEST: NO, NOSE, NOPA matching');
  console.log('═══════════════════════════════════════════════════════\n');
  
  const testProducts = ['NO', 'NOSE', 'NOPA'];
  
  console.log('📋 Testované produkty:', testProducts);
  console.log('');
  
  const result = await matchProductNames(testProducts);
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('📊 VÝSLEDKY');
  console.log('═══════════════════════════════════════════════════════\n');
  
  let allPassed = true;
  
  // Test NO
  const noMatch = result.matches.find(m => m.matched_from === 'NO');
  console.log('🔍 TEST: NO');
  if (!noMatch) {
    console.log('  ❌ FAILED: NO nebyl namapován!');
    allPassed = false;
  } else {
    console.log(`  → Namapován na: ${noMatch.product_name} (ID: ${noMatch.id})`);
    console.log(`  → Podobnost: ${(noMatch.similarity * 100).toFixed(1)}%`);
    console.log(`  → Kategorie: ${noMatch.category}`);
    
    const isEO = noMatch.product_name.toLowerCase().includes('esenciální');
    const isCorrectId = noMatch.id === 3738;
    const hasHighSimilarity = noMatch.similarity >= 0.9;
    
    if (isEO && hasHighSimilarity) {
      console.log('  ✅ PASSED: Je to esenciální olej s vysokou podobností');
      if (isCorrectId) {
        console.log('  ✅ BONUS: Správné ID (3738)!');
      }
    } else {
      console.log(`  ❌ FAILED: ${!isEO ? 'Není esenciální olej!' : 'Nízká podobnost!'}`);
      allPassed = false;
    }
  }
  
  console.log('');
  
  // Test NOSE
  const noseMatch = result.matches.find(m => m.matched_from === 'NOSE');
  console.log('🔍 TEST: NOSE');
  if (!noseMatch) {
    console.log('  ❌ FAILED: NOSE nebyl namapován!');
    allPassed = false;
  } else {
    console.log(`  → Namapován na: ${noseMatch.product_name} (ID: ${noseMatch.id})`);
    console.log(`  → Podobnost: ${(noseMatch.similarity * 100).toFixed(1)}%`);
    console.log(`  → Kategorie: ${noseMatch.category}`);
    
    const isCorrectName = noseMatch.product_name.toLowerCase().includes('nose');
    const hasHighSimilarity = noseMatch.similarity >= 0.9;
    
    if (isCorrectName && hasHighSimilarity) {
      console.log('  ✅ PASSED: Správný produkt s vysokou podobností');
    } else {
      console.log(`  ❌ FAILED: ${!isCorrectName ? 'Špatný produkt!' : 'Nízká podobnost!'}`);
      allPassed = false;
    }
  }
  
  console.log('');
  
  // Test NOPA
  const nopaMatch = result.matches.find(m => m.matched_from === 'NOPA');
  console.log('🔍 TEST: NOPA');
  if (!nopaMatch) {
    console.log('  ❌ FAILED: NOPA nebyl namapován!');
    allPassed = false;
  } else {
    console.log(`  → Namapován na: ${nopaMatch.product_name} (ID: ${nopaMatch.id})`);
    console.log(`  → Podobnost: ${(nopaMatch.similarity * 100).toFixed(1)}%`);
    console.log(`  → Kategorie: ${nopaMatch.category}`);
    
    const isCorrectName = nopaMatch.product_name.toLowerCase().includes('nopa');
    const hasHighSimilarity = nopaMatch.similarity >= 0.9;
    
    if (isCorrectName && hasHighSimilarity) {
      console.log('  ✅ PASSED: Správný produkt s vysokou podobností');
    } else {
      console.log(`  ❌ FAILED: ${!isCorrectName ? 'Špatný produkt!' : 'Nízká podobnost!'}`);
      allPassed = false;
    }
  }
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  
  if (allPassed) {
    console.log('✅ VŠECHNY TESTY PROŠLY!');
    console.log('🎉 Matching pro NO, NOSE, NOPA funguje správně!');
  } else {
    console.log('❌ NĚKTERÉ TESTY SELHALY!');
    console.log('⚠️  Je potřeba další ladění matching algoritmu.');
  }
  
  console.log('═══════════════════════════════════════════════════════\n');
  
  // Statistiky
  console.log('📈 STATISTIKY:');
  console.log(`Celkem testováno: ${testProducts.length}`);
  console.log(`Namapováno: ${result.matches.length}`);
  console.log(`Nenamapováno: ${result.unmatched.length}`);
  
  if (result.unmatched.length > 0) {
    console.log(`\nNenamapované: ${result.unmatched.join(', ')}`);
  }
  
  console.log('');
}

testCriticalEOMatching().catch(console.error);
