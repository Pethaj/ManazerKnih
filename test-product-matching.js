/**
 * Test script pro Product Name Matching
 * 
 * Spusť v browser console (F12 → Console) když máš otevřenou aplikaci
 * 
 * Použití:
 *   1. Otevři aplikaci (npm run dev)
 *   2. Otevři browser console (F12)
 *   3. Zkopíruj tento celý soubor
 *   4. Vlož do konzole a Enter
 *   5. Sleduj výstup
 */

(async function testProductMatching() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 TESTING PRODUCT NAME MATCHING');
  console.log('='.repeat(80));
  
  try {
    // Import služeb
    console.log('\n📦 Importuji služby...');
    const { screenTextForProducts } = await import('./src/services/inlineProductScreeningService.ts');
    const { matchProductNames } = await import('./src/services/productNameMatchingService.ts');
    
    console.log('✅ Služby úspěšně naimportovány\n');
    
    // Test případy
    const testCases = [
      {
        name: 'Test 1: Konkrétní produkt - Te Xiao Bi Min Gan Wan',
        text: 'Doporučuji Te Xiao Bi Min Gan Wan (009) pro nosní průchodnost a uvolnění dutin.'
      },
      {
        name: 'Test 2: Číselné kódy',
        text: 'Zkuste produkt 009 nebo případně 010 pro podporu imunity.'
      },
      {
        name: 'Test 3: Český název',
        text: 'Pro bolest hlavy zkuste Čistý dech, který obsahuje bylinnou směs.'
      },
      {
        name: 'Test 4: Mix produktů',
        text: 'Doporučuji wan Te Xiao Bi Min Gan Wan a také Levandule 15ml pro relaxaci.'
      },
      {
        name: 'Test 5: Žádné produkty',
        text: 'Dobrý den, jak se dnes máte? Doufám, že všechno probíhá dobře.'
      }
    ];
    
    // Spusť testy
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      
      console.log('\n' + '-'.repeat(80));
      console.log(`🔬 ${testCase.name}`);
      console.log('-'.repeat(80));
      console.log(`📝 Text: "${testCase.text}"`);
      console.log('');
      
      // 1. Screening
      console.log('🔍 Krok 1: Screening produktů...');
      const screeningStart = performance.now();
      const screeningResult = await screenTextForProducts(testCase.text);
      const screeningTime = ((performance.now() - screeningStart) / 1000).toFixed(2);
      
      if (screeningResult.success) {
        console.log(`✅ Screening úspěšný (${screeningTime}s)`);
        console.log(`📦 Identifikováno ${screeningResult.products.length} položek:`, screeningResult.products);
        
        if (screeningResult.products.length > 0) {
          // 2. Matching
          console.log('\n🔍 Krok 2: Matching v databázi...');
          const matchingStart = performance.now();
          const matchingResult = await matchProductNames(screeningResult.products);
          const matchingTime = ((performance.now() - matchingStart) / 1000).toFixed(2);
          
          if (matchingResult.success) {
            console.log(`✅ Matching úspěšný (${matchingTime}s)`);
            console.log(`📊 Nalezeno: ${matchingResult.matches.length} / ${screeningResult.products.length}`);
            
            if (matchingResult.matches.length > 0) {
              console.log('\n🎯 NALEZENÉ PRODUKTY:');
              matchingResult.matches.forEach((match, idx) => {
                console.log(`  ${idx + 1}. ${match.product_name}`);
                console.log(`     Pinyin: ${match.pinyin_name}`);
                console.log(`     Shoda: ${(match.similarity * 100).toFixed(0)}%`);
                console.log(`     URL: ${match.url}`);
              });
            }
            
            if (matchingResult.unmatched.length > 0) {
              console.log('\n⚠️ NENALEZENÉ:');
              matchingResult.unmatched.forEach((item, idx) => {
                console.log(`  ${idx + 1}. ${item}`);
              });
            }
          } else {
            console.log(`❌ Matching selhal: ${matchingResult.error}`);
          }
        } else {
          console.log('ℹ️ Žádné produkty k matchování');
        }
      } else {
        console.log(`❌ Screening selhal: ${screeningResult.error}`);
      }
    }
    
    // Souhrn
    console.log('\n' + '='.repeat(80));
    console.log('✅ TESTY DOKONČENY');
    console.log('='.repeat(80));
    console.log('\n💡 TIP: Otevři Network tab (F12 → Network) pro detailnější info o API callech\n');
    
  } catch (error) {
    console.error('\n❌ KRITICKÁ CHYBA PŘI TESTECH:', error);
    console.error('\n🔧 TROUBLESHOOTING:');
    console.error('  1. Zkontroluj, že máš správnou URL aplikace');
    console.error('  2. Zkontroluj, že edge function "screen-products" běží');
    console.error('  3. Zkontroluj, že SQL funkce "get_products_with_pinyin_names" existuje');
    console.error('  4. Zkontroluj browser console pro další chyby\n');
  }
})();


