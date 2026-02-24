// ============================================================================
// SERVICE: Párování produktových kombinací
// ============================================================================
// 
// Tento service volá SQL funkci match_product_combinations(), která na základě
// vstupních product_code vrátí doporučené doplňkové produkty podle tabulky leceni.
//
// Použití:
//   const paired = await matchProductCombinations(['NOHEPA', 'BESTFRIEND']);
//   // Vrátí: Prawtein Frankincense Plus, TČM 004, + Aloe/Merkaba doporučení
// ============================================================================

import { supabase } from '../lib/supabase';

// ============================================================================
// TYPY
// ============================================================================

/**
 * Napárovaný produkt vrácený z SQL funkce
 */
export interface PairedProduct {
  matched_product_code: string;
  matched_category: string;
  matched_product_name: string;
  matched_product_url: string | null;
  matched_thumbnail: string | null;
  aloe_recommended: string;  // TEXT: "ano" nebo "ne" nebo null
  aloe_product: string | null;  // Konkrétní název/kód Aloe produktu z leceni (např. "Aloe Vera Immunity")
  merkaba_recommended: string;  // TEXT: "ano" nebo "ne" nebo null
  combination_name: string;
}

/**
 * Agregované doporučení Aloe/Merkaba
 * (pokud alespoň jedna kombinace doporučuje, zobrazíme)
 */
export interface PairingRecommendations {
  products: PairedProduct[];
  aloe: boolean;
  aloeProduct: string | null;  // Konkrétní název/kód Aloe produktu (z leceni."Aloe")
  merkaba: boolean;
}

/**
 * Napáruje produkty pomocí SQL funkce match_product_combinations_with_problems
 * FILTRUJE POUZE podle problému (ne podle product_code)
 * 
 * Produkty z SQL se pak SPOJÍ s produkty extrahovanými z N8N odpovědi
 * 
 * @param problems - Pole problémů (např. ["Bolest hlavy – ze stresu"])
 * @returns Napárované produkty + agregované Aloe/Merkaba doporučení
 */
export async function matchProductCombinationsWithProblems(
  problems: string[]
): Promise<PairingRecommendations> {
  // Validace vstupu
  if (!problems || problems.length === 0) {
    console.log('🔗 Párování: Žádné problémy k napárování');
    return { products: [], aloe: false, aloeProduct: null, merkaba: false };
  }

  console.log('🔗 Párování kombinací produktů POUZE podle problému...');
  console.log('🔍 Problémy:', problems);

  try {
    // Volání SQL funkce přes RPC - BEZ product_codes!
    const { data, error } = await supabase
      .rpc('match_product_combinations_with_problems', {
        problems: problems
      });

    if (error) {
      console.error('❌ Chyba při párování produktů s problémy:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('ℹ️ Žádné napárované produkty nenalezeny pro problémy:', problems);
      return { products: [], aloe: false, aloeProduct: null, merkaba: false };
    }

    // Typovaný výsledek
    const pairedProducts = data as PairedProduct[];

    // Agreguj Aloe/Merkaba doporučení
    const aloe = pairedProducts.some(p => p.aloe_recommended?.toLowerCase() === 'ano');
    const aloeProductEntry = pairedProducts.find(p => p.aloe_recommended?.toLowerCase() === 'ano' && p.aloe_product);
    const aloeProduct = aloeProductEntry?.aloe_product ?? null;
    const merkaba = pairedProducts.some(p => p.merkaba_recommended?.toLowerCase() === 'ano');

    console.log('✅ Napárováno produktů z SQL:', pairedProducts.length);
    console.log('💧 Aloe doporučeno:', aloe);
    console.log('💧 Aloe produkt (z leceni):', aloeProduct);
    console.log('✨ Merkaba doporučeno:', merkaba);
    
    pairedProducts.forEach(p => {
      console.log(`   - ${p.matched_product_name} (${p.matched_category}) [Problém: ${(p as any).matched_problem}]`);
    });

    return {
      products: pairedProducts,
      aloe,
      aloeProduct,
      merkaba
    };

  } catch (error) {
    console.error('❌ Kritická chyba při párování s problémy:', error);
    return { products: [], aloe: false, aloeProduct: null, merkaba: false };
  }
}

// ============================================================================
// HLAVNÍ FUNKCE
// ============================================================================

/**
 * Napáruje produkty pomocí SQL funkce match_product_combinations
 * 
 * @param productCodes - Pole product_code (např. ['NOHEPA', 'BESTFRIEND'])
 * @returns Napárované produkty + agregované Aloe/Merkaba doporučení
 */
export async function matchProductCombinations(
  productCodes: string[]
): Promise<PairingRecommendations> {
  // Validace vstupu
  if (!productCodes || productCodes.length === 0) {
    console.log('🔗 Párování: Žádné produkty k napárování');
    return { products: [], aloe: false, aloeProduct: null, merkaba: false };
  }

  console.log('🔗 Párování kombinací produktů...');
  console.log('📥 Vstupní kódy:', productCodes);

  try {
    // Volání SQL funkce přes RPC
    const { data, error } = await supabase
      .rpc('match_product_combinations', {
        input_codes: productCodes
      });

    if (error) {
      console.error('❌ Chyba při párování produktů:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('ℹ️ Žádné napárované produkty nenalezeny');
      return { products: [], aloe: false, aloeProduct: null, merkaba: false };
    }

    // Typovaný výsledek
    const pairedProducts = data as PairedProduct[];

    // Agreguj Aloe/Merkaba doporučení
    // Pokud alespoň jedna kombinace doporučuje, zobrazíme
    const aloe = pairedProducts.some(p => p.aloe_recommended?.toLowerCase() === 'ano');
    const aloeProductEntry = pairedProducts.find(p => p.aloe_recommended?.toLowerCase() === 'ano' && p.aloe_product);
    const aloeProduct = aloeProductEntry?.aloe_product ?? null;
    const merkaba = pairedProducts.some(p => p.merkaba_recommended?.toLowerCase() === 'ano');

    console.log('✅ Napárováno produktů:', pairedProducts.length);
    console.log('💧 Aloe doporučeno:', aloe);
    console.log('💧 Aloe produkt (z leceni):', aloeProduct);
    console.log('✨ Merkaba doporučeno:', merkaba);
    
    pairedProducts.forEach(p => {
      console.log(`   - ${p.matched_product_name} (${p.matched_category})`);
    });

    return {
      products: pairedProducts,
      aloe,
      aloeProduct,
      merkaba
    };

  } catch (error) {
    console.error('❌ Kritická chyba při párování:', error);
    return { products: [], aloe: false, aloeProduct: null, merkaba: false };
  }
}

// ============================================================================
// HELPER FUNKCE
// ============================================================================

/**
 * Převede PairedProduct na formát kompatibilní s existující RecommendedProduct
 * (pro snadnou integraci s existujícími komponentami)
 */
export function convertPairedToRecommended(paired: PairedProduct) {
  return {
    product_code: paired.matched_product_code,
    product_name: paired.matched_product_name,
    url: paired.matched_product_url || '',
    description: paired.combination_name, // Název kombinace jako popis
    category: paired.matched_category,
    image_url: paired.matched_thumbnail,
    thumbnail: paired.matched_thumbnail
  };
}

/**
 * Extrahuje product_code z produktů (pro vstup do matching funkce)
 */
export function extractProductCodes(products: Array<{ product_code?: string; productCode?: string }>): string[] {
  return products
    .map(p => p.product_code || p.productCode)
    .filter((code): code is string => !!code)
    .map(code => code.trim())
    .filter(code => code.length > 0);
}

/**
 * Deduplikuje produkty podle product_code
 */
export function deduplicateProducts<T extends { matched_product_code?: string; product_code?: string }>(
  products: T[]
): T[] {
  const seen = new Set<string>();
  return products.filter(p => {
    const code = p.matched_product_code || p.product_code;
    if (!code || seen.has(code)) return false;
    seen.add(code);
    return true;
  });
}

// ============================================================================
// TESTOVACÍ FUNKCE
// ============================================================================

/**
 * Testovací funkce pro ověření párování
 * Volej z konzole: await testProductPairing(['NOHEPA'])
 */
export async function testProductPairing(codes: string[]) {
  console.log('🧪 TEST: Párování produktů');
  console.log('📥 Vstup:', codes);
  
  const result = await matchProductCombinations(codes);
  
  console.log('📤 Výsledek:');
  console.log('   Produkty:', result.products.length);
  console.log('   Aloe:', result.aloe ? '✅ Ano' : '❌ Ne');
  console.log('   Merkaba:', result.merkaba ? '✅ Ano' : '❌ Ne');
  console.table(result.products);
  
  return result;
}
