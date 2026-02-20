/**
 * EO Směsi Workflow Service
 * 
 * Služba pro zpracování dotazů v EO Směsi chatu
 * 
 * WORKFLOW:
 * 1. Definice problému z user dotazu (GPT klasifikace)
 * 2. Nalezení problému v tabulce leceni
 * 3. Extrakce produktů: EO1, EO2, Prawtein, Aloe (ano/ne), Merkaba (ano/ne)
 * 4. Generování tabulky callout
 * 5. Tlačítko "Chci se o produktech dozvědět více" (Fáze 2)
 */

import { 
  classifyProblemFromUserMessage, 
  ProblemClassificationResult 
} from './problemClassificationService';
import { 
  matchProductCombinationsWithProblems, 
  PairingRecommendations,
  PairedProduct
} from './productPairingService';
import { supabase } from '../lib/supabase';

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

/**
 * Struktura léčebné tabulky (Medicine Table)
 * Obsahuje extrahované produkty z tabulky leceni
 */
export interface MedicineTable {
  eo1: string | null;      // Esenciální olej 1 (product_name)
  eo2: string | null;      // Esenciální olej 2 (product_name)
  prawtein: string | null; // Prawtein product (product_name)
  aloe: boolean;           // Doporučit Aloe?
  merkaba: boolean;        // Doporučit Merkaba?
  aloeUrl: string | null;  // 🆕 URL pro Aloe produkt (pokud je doporučen)
  merkabaUrl: string | null; // 🆕 URL pro Merkaba produkt (pokud je doporučen)
  
  // Metadata
  problemName: string;     // Název problému z tabulky leceni
  combinationName: string; // Název kombinace
  
  // Produktové detaily pro zobrazení (POUZE EO směsi a Prawtein, BEZ Aloe/Merkaba)
  products: Array<{
    code: string;
    name: string;
    category: string;
    url: string | null;
    thumbnail: string | null;
  }>;
}

/**
 * Výsledek zpracování EO Směsi dotazu
 */
export interface EoSmesiResult {
  success: boolean;
  
  // Krok 1: Definice problému
  problemClassification: ProblemClassificationResult;
  
  // Krok 2 & 3: Párování produktů + extrakce
  medicineTable: MedicineTable | null;
  
  // UI flags
  shouldShowTable: boolean;  // Zobrazit léčebnou tabulku?
  
  // Chybové stavy
  error?: string;
  
  // Debug info
  debugInfo?: {
    problemsFound: string[];
    pairingResults: PairingRecommendations;
  };
}

// ============================================================================
// HELPER FUNKCE
// ============================================================================

/**
 * Extrahuje léčebnou tabulku z napárovaných produktů
 * 
 * Logika:
 * - EO1, EO2: První 2 produkty z kategorie "Esenciální oleje" (pokud existují)
 * - Prawtein: První produkt z kategorie "Prawtein"
 * - TCM: FILTROVÁNO na frontendu (pro EO Směsi)
 * - Aloe, Merkaba: Boolean flags z pairing results
 * 
 * @param pairingResults - Výsledky z productPairingService
 * @param problemName - Název problému
 * @returns MedicineTable nebo null (pokud nejsou produkty)
 */
async function extractMedicineTable(
  pairingResults: PairingRecommendations,
  problemName: string
): Promise<MedicineTable | null> {
  const { products, aloe, merkaba } = pairingResults;
  
  if (products.length === 0) {
    return null;
  }
  
  const allProducts = products.map(p => ({
    code: p.matched_product_code || p.product_code,
    name: p.product_name,
    category: p.category,
    url: p.url,
    thumbnail: p.thumbnail
  }));
  
  // URL pro Aloe a Merkaba (nezobrazují se jako product pills, pouze jako textové odkazy)
  let aloeUrl: string | null = null;
  let merkabaUrl: string | null = null;
  
  if (aloe) {
    const { data: aloeProduct, error } = await supabase
      .from('product_feed_2')
      .select('product_code, product_name, category, url, thumbnail')
      .ilike('product_name', '%Aloe Vera gel%')
      .limit(1)
      .single();
    
    if (!error && aloeProduct) {
      aloeUrl = aloeProduct.url;
    }
  }
  
  const combinationName = products[0]?.combination_name || 'Kombinace produktů';
  
  if (merkaba) {
    const { data: merkabaProduct, error } = await supabase
      .from('product_feed_2')
      .select('product_code, product_name, category, url, thumbnail')
      .ilike('product_name', '%MERKABA Ultimate Elixir%')
      .limit(1)
      .single();
    
    if (!error && merkabaProduct) {
      merkabaUrl = merkabaProduct.url;
    }
  }
  
  const medicineTable: MedicineTable = {
    eo1: null,
    eo2: null,
    prawtein: products.find(p => p.category === 'Prawtein' || p.category?.includes('PRAWTEIN'))?.product_name || null,
    aloe,
    merkaba,
    aloeUrl,
    merkabaUrl,
    problemName,
    combinationName,
    products: allProducts
  };
  
  return medicineTable;
}

// ============================================================================
// HLAVNÍ FUNKCE
// ============================================================================

/**
 * Zpracuje dotaz uživatele v EO Směsi chatu
 * 
 * WORKFLOW (Fáze 1):
 * 1. Klasifikace problému z user dotazu (GPT)
 * 2. Vyhledání problému v tabulce leceni
 * 3. Extrakce produktů: EO1, EO2, Prawtein, Aloe, Merkaba
 * 4. Generování struktury pro Medicine Table Callout
 * 
 * @param userQuery - Dotaz uživatele (např. "Bolí mě hlava")
 * @param sessionId - Session ID pro tracking (volitelné)
 * @returns EoSmesiResult - Výsledek zpracování
 */
export async function processEoSmesiQuery(
  userQuery: string,
  sessionId?: string
): Promise<EoSmesiResult> {
  try {
    // KROK 1: DEFINICE PROBLÉMU
    const problemClassification = await classifyProblemFromUserMessage(userQuery);
    
    if (!problemClassification.success) {
      return {
        success: false,
        problemClassification,
        medicineTable: null,
        shouldShowTable: false,
        error: problemClassification.error || 'Nepodařilo se klasifikovat problém'
      };
    }
    
    const problems = problemClassification.problems;
    
    if (problems.length === 0) {
      return {
        success: true,
        problemClassification,
        medicineTable: null,
        shouldShowTable: false
      };
    }
    
    // KROK 2: PÁROVÁNÍ PRODUKTŮ
    const pairingResults = await matchProductCombinationsWithProblems(problems);
    
    // KROK 3: EXTRAKCE DO MEDICINE TABLE (async!)
    const medicineTable = await extractMedicineTable(
      pairingResults,
      problems[0]
    );
    
    // KROK 4: NAČTENÍ EO PRODUKTŮ (eo_1, eo_2) z tabulky leceni
    if (medicineTable) {
      const eoProducts = await getEOProductsForProblem(problems[0]);
      
      if (eoProducts.length > 0) {
        // Přidáme EO produkty do seznamu
        medicineTable.products = [
          ...eoProducts,
          ...medicineTable.products
        ];
        
        // Nastavíme názvy pro eo1 a eo2
        if (eoProducts[0]) medicineTable.eo1 = eoProducts[0].name;
        if (eoProducts[1]) medicineTable.eo2 = eoProducts[1].name;
      }
    }
    
    const shouldShowTable = medicineTable !== null;
    
    return {
      success: true,
      problemClassification,
      medicineTable,
      shouldShowTable,
      debugInfo: {
        problemsFound: problems,
        pairingResults
      }
    };
    
  } catch (error) {
    console.error('❌ EO Směsi chyba:', error);
    
    return {
      success: false,
      problemClassification: {
        success: false,
        problems: [],
        error: error instanceof Error ? error.message : 'Neznámá chyba'
      },
      medicineTable: null,
      shouldShowTable: false,
      error: error instanceof Error ? error.message : 'Neznámá chyba při zpracování'
    };
  }
}

// ============================================================================
// HELPER: Načtení EO produktů z tabulky leceni
// ============================================================================

/**
 * Načte EO produkty (eo_1, eo_2, eo_3) pro daný problém z tabulky leceni
 * 
 * @param problemName - Název problému
 * @returns Pole product info pro EO produkty
 */
export async function getEOProductsForProblem(
  problemName: string
): Promise<Array<{ code: string; name: string; category: string; url: string | null; thumbnail: string | null; }>> {
  try {
    const { data: leceniData, error: leceniError } = await supabase
      .from('leceni')
      .select('"EO 1", "EO 2", "EO 3"')
      .eq('Problém', problemName)
      .limit(1);
    
    if (leceniError) {
      console.error('❌ Chyba při načítání EO produktů z leceni:', leceniError);
      return [];
    }
    
    if (!leceniData || leceniData.length === 0) {
      return [];
    }
    
    const record = leceniData[0];
    
    // Extrahuj EO názvy a rozděl je podle čárky (pokud je více EO v jedné buňce)
    const eoNamesRaw = [record['EO 1'], record['EO 2']].filter(name => name && name.trim() !== '');
    const eoNames: string[] = [];
    
    // Rozděl každou buňku podle čárky (pro případy jako "BEST FRIEND, LEVANDULE")
    eoNamesRaw.forEach(name => {
      if (name.includes(',')) {
        // Rozdělíme podle čárky a přidáme každý název zvlášť
        name.split(',').forEach(part => {
          const trimmed = part.trim();
          if (trimmed) eoNames.push(trimmed);
        });
      } else {
        eoNames.push(name.trim());
      }
    });
    
    if (eoNames.length === 0) {
      return [];
    }
    
    console.log('🔍 EO názvy k vyhledání:', eoNames);
    
    const enrichedProducts: Array<{ code: string; name: string; category: string; url: string | null; thumbnail: string | null; }> = [];
    
    for (const eoName of eoNames) {
      try {
        // ✅ KLÍČOVÉ: Hledáme POUZE v kategorii "Směsi esenciálních olejů"
        // Protože stejný název může existovat ve více kategoriích (COLDET olej vs COLDET Plus tělový olej)
        const { data: product, error } = await supabase
          .from('product_feed_2')
          .select('product_code, product_name, category, url, thumbnail')
          .ilike('product_name', `%${eoName}%`)
          .eq('category', 'Směsi esenciálních olejů')  // 🔑 Filtr přímo v dotazu!
          .limit(1)
          .single();
        
        if (!error && product) {
          console.log(`✅ EO produkt přidán: ${product.product_name} (${product.category})`);
          enrichedProducts.push({
            code: product.product_code,
            name: product.product_name,
            category: product.category,
            url: product.url,
            thumbnail: product.thumbnail
          });
        } else {
          console.warn(`⚠️ Produkt "${eoName}" nebyl nalezen ve "Směsi esenciálních olejů"`);
        }
      } catch (err) {
        console.warn(`⚠️ Nepodařilo se najít EO produkt: ${eoName}`, err);
      }
    }
    
    return enrichedProducts;
    
  } catch (error) {
    console.error('❌ Chyba při načítání EO produktů:', error);
    return [];
  }
}
