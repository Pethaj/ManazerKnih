import { matchProductNames } from './src/services/productNameMatchingService';

/**
 * Test matching pro směsi esenciálních olejů
 * 
 * Testuje, že:
 * 1. "NOHEPA" se správně namapuje na "NOHEPA esenciální olej"
 * 2. Kategorie směsí EO je správně rozpoznána
 * 3. Matching má vysokou podobnost (> 0.9)
 */
async function testEssentialOilBlendMatching() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🧪 TEST: Matching směsí esenciálních olejů');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // Test produkty, které by měly být namapovány
  const testProducts = [
    'NOHEPA',           // Měl by namapovat na NOHEPA esenciální olej
    'NO',               // Jiná směs
    'NOPA',             // Jiná směs
    'Chuan Xiong Cha Tiao Wan',  // Wan (pro srovnání)
    '004',              // Číselný kód wanu
  ];
  
  console.log('📋 Testované produkty:', testProducts);
  console.log('');
  
  const result = await matchProductNames(testProducts);
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('📊 VÝSLEDKY TESTOVÁNÍ');
  console.log('═══════════════════════════════════════════════════════');
  
  console.log('\n✅ NAMAPOVANÉ PRODUKTY:');
  result.matches.forEach((match, index) => {
    const isEOBlend = match.category?.toLowerCase().includes('směs') && 
                      match.category?.toLowerCase().includes('esenciální');
    
    console.log(`\n${index + 1}. "${match.matched_from}"`);
    console.log(`   → ${match.product_name} (ID: ${match.id})`);
    console.log(`   📊 Podobnost: ${(match.similarity * 100).toFixed(1)}%`);
    console.log(`   🏷️  Kategorie: ${match.category || 'N/A'}`);
    console.log(`   ${isEOBlend ? '🌿 Směs esenciálních olejů' : '📦 Jiný produkt'}`);
    console.log(`   🔗 URL: ${match.url}`);
  });
  
  console.log('\n❌ NENAMAPOVANÉ PRODUKTY:');
  if (result.unmatched.length === 0) {
    console.log('   Všechny produkty byly úspěšně namapovány! 🎉');
  } else {
    result.unmatched.forEach((name) => {
      console.log(`   - ${name}`);
    });
  }
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🎯 KONTROLA NOHEPA');
  console.log('═══════════════════════════════════════════════════════');
  
  const nohepaMatch = result.matches.find(m => m.matched_from === 'NOHEPA');
  
  if (!nohepaMatch) {
    console.log('❌ NOHEPA nebyl namapován!');
  } else {
    console.log(`✅ NOHEPA namapován na: ${nohepaMatch.product_name}`);
    console.log(`   ID produktu: ${nohepaMatch.id}`);
    console.log(`   Očekávané ID: 3730`);
    console.log(`   Podobnost: ${(nohepaMatch.similarity * 100).toFixed(1)}%`);
    console.log(`   Kategorie: ${nohepaMatch.category}`);
    
    if (nohepaMatch.id === 3730) {
      console.log('\n🎉 ÚSPĚCH! NOHEPA je správně namapován na ID 3730');
    } else {
      console.log('\n⚠️  VAROVÁNÍ: NOHEPA je namapován na jiný produkt než očekávaný (3730)');
    }
    
    if (nohepaMatch.similarity < 0.9) {
      console.log(`⚠️  VAROVÁNÍ: Podobnost je příliš nízká (${(nohepaMatch.similarity * 100).toFixed(1)}%), očekáváno > 90%`);
    }
  }
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📈 STATISTIKY');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`Celkem testováno: ${testProducts.length}`);
  console.log(`Namapováno: ${result.matches.length}`);
  console.log(`Nenamapováno: ${result.unmatched.length}`);
  console.log(`Úspěšnost: ${((result.matches.length / testProducts.length) * 100).toFixed(1)}%`);
  
  const eoBlends = result.matches.filter(m => 
    m.category?.toLowerCase().includes('směs') && 
    m.category?.toLowerCase().includes('esenciální')
  );
  console.log(`Směsi EO: ${eoBlends.length}`);
  
  console.log('\n═══════════════════════════════════════════════════════\n');
}

// Spustíme test
testEssentialOilBlendMatching().catch(console.error);
