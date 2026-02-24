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
  aloeProductName: string | null;  // Konkrétní název Aloe produktu (např. "Aloe Vera Immunity")
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
  const { products, aloe, aloeProduct, merkaba } = pairingResults;
  
  if (products.length === 0) {
    return null;
  }
  
  // Pro EO Směsi chat NEPOUŽÍVÁME produkty ze SQL RPC (matched_product_name jsou undefined).
  // EO a Prawtein produkty se načítají přímo z tabulky leceni v getEOProductsForProblem/getPrawteinProductsForProblem.
  // SQL RPC slouží pouze pro detekci aloe/merkaba flagů a jejich URL.
  const allProducts: Array<{ code: string; name: string; category: string; url: string | null; thumbnail: string | null; }> = [];
  
  // URL pro Aloe a Merkaba (nezobrazují se jako product pills, pouze jako textové odkazy)
  let aloeUrl: string | null = null;
  let aloeProductName: string | null = aloeProduct || null;
  let merkabaUrl: string | null = null;
  
  if (aloe) {
    // Použijeme konkrétní název Aloe produktu z tabulky leceni (např. "Aloe Vera Immunity")
    // Pokud je hodnota příliš obecná (jen "Aloe"), hledáme standardní "Aloe Vera gel"
    const isSpecificAloe = aloeProduct && aloeProduct.toLowerCase() !== 'aloe' && aloeProduct.length > 5;
    const aloeSearchTerm = isSpecificAloe ? `%${aloeProduct}%` : '%Aloe Vera gel%';
    console.log('💧 Hledám Aloe produkt:', aloeSearchTerm, '(aloeProduct z leceni:', aloeProduct, ')');
    
    const { data: aloeData, error } = await supabase
      .from('product_feed_2')
      .select('product_code, product_name, category, url, thumbnail')
      .ilike('product_name', aloeSearchTerm)
      .limit(1);
    
    if (!error && aloeData && aloeData.length > 0) {
      aloeUrl = aloeData[0].url;
      // Zobrazovaný název:
      // - specifický (např. "Aloe vera Immunity") → hodnota z leceni
      // - obecný ("Aloe") → vždy "Aloe Vera"
      aloeProductName = (isSpecificAloe && aloeProduct) ? aloeProduct : 'Aloe Vera';
      console.log('✅ Nalezen Aloe produkt:', aloeData[0].product_name, '→ zobrazí se jako:', aloeProductName);
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
    prawtein: null,  // Prawtein se načítá v getPrawteinProductsForProblem()
    aloe,
    aloeProductName,
    merkaba,
    aloeUrl,
    merkabaUrl,
    problemName,
    combinationName,
    products: allProducts  // Zatím prázdné nebo jen ze SQL - doplní se v processEoSmesiQuery
  };
  
  return medicineTable;
}

// ============================================================================
// HLAVNÍ FUNKCE
// ============================================================================

/**
 * Sdílená logika: načte produkty z leceni + aloe/merkaba z SQL RPC pro daný problém.
 * Používá se jak v processEoSmesiQuery, tak v processEoSmesiQueryWithKnownProblem.
 */
async function buildMedicineTableForProblem(problemName: string): Promise<{
  medicineTable: MedicineTable | null;
  pairingResults: PairingRecommendations;
}> {
  const pairingResults = await matchProductCombinationsWithProblems([problemName]);

  const [eoProducts, prawteinProducts] = await Promise.all([
    getEOProductsForProblem(problemName),
    getPrawteinProductsForProblem(problemName)
  ]);

  const hasAnyProducts = eoProducts.length > 0 || prawteinProducts.length > 0 || pairingResults.products.length > 0;

  if (!hasAnyProducts) {
    return { medicineTable: null, pairingResults };
  }

  let medicineTable: MedicineTable;

  if (pairingResults.products.length > 0) {
    medicineTable = (await extractMedicineTable(pairingResults, problemName))!;
  } else {
    medicineTable = {
      eo1: null,
      eo2: null,
      prawtein: null,
      aloe: false,
      merkaba: false,
      aloeUrl: null,
      merkabaUrl: null,
      problemName,
      combinationName: 'Kombinace produktů',
      products: []
    };
  }

  medicineTable.products = [...eoProducts, ...prawteinProducts];
  if (eoProducts[0]) medicineTable.eo1 = eoProducts[0].name;
  if (eoProducts[1]) medicineTable.eo2 = eoProducts[1].name;
  if (prawteinProducts[0]) medicineTable.prawtein = prawteinProducts[0].name;

  return { medicineTable, pairingResults };
}

/**
 * Přímé zpracování ZNÁMÉHO problému (vybraného uživatelem z dotazníku).
 * Přeskočí LLM klasifikaci - problém je již znám.
 */
export async function processEoSmesiQueryWithKnownProblem(
  problemName: string
): Promise<EoSmesiResult> {
  try {
    const { medicineTable, pairingResults } = await buildMedicineTableForProblem(problemName);
    const shouldShowTable = medicineTable !== null && medicineTable.products.length > 0;

    return {
      success: true,
      problemClassification: {
        success: true,
        problems: [problemName]
      },
      medicineTable,
      shouldShowTable,
      debugInfo: {
        problemsFound: [problemName],
        pairingResults
      }
    };
  } catch (error) {
    console.error('❌ EO Směsi chyba (known problem):', error);
    return {
      success: false,
      problemClassification: { success: false, problems: [], error: String(error) },
      medicineTable: null,
      shouldShowTable: false,
      error: error instanceof Error ? error.message : 'Neznámá chyba'
    };
  }
}

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
    
    // KROK 2-5: Sestavení medicine table pro nalezené problémy
    const { medicineTable, pairingResults } = await buildMedicineTableForProblem(problems[0]);
    const shouldShowTable = medicineTable !== null && medicineTable.products.length > 0;
    
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
 * Načte Prawtein produkty pro daný problém z tabulky leceni
 * Stejná logika jako u EO - načte názvy a napáruje podle kategorie
 * 
 * @param problemName - Název problému
 * @returns Pole product info pro Prawtein produkty
 */
export async function getPrawteinProductsForProblem(
  problemName: string
): Promise<Array<{ code: string; name: string; category: string; url: string | null; thumbnail: string | null; }>> {
  try {
    const { data: leceniData, error: leceniError } = await supabase
      .from('leceni')
      .select('"Prawtein"')
      .eq('Problém', problemName)
      .limit(1);
    
    if (leceniError) {
      console.error('❌ Chyba při načítání Prawtein produktů z leceni:', leceniError);
      return [];
    }
    
    if (!leceniData || leceniData.length === 0) {
      return [];
    }
    
    const record = leceniData[0];
    const prawteinRaw = record['Prawtein'];
    
    if (!prawteinRaw || prawteinRaw.trim() === '') {
      return [];
    }
    
    // Extrahuj Prawtein názvy a rozděl je podle čárky (pokud je více v jedné buňce)
    const prawteinNames: string[] = [];
    
    if (prawteinRaw.includes(',')) {
      // Rozdělíme podle čárky a přidáme každý název zvlášť
      prawteinRaw.split(',').forEach((part: string) => {
        const trimmed = part.trim();
        if (trimmed) prawteinNames.push(trimmed);
      });
    } else {
      prawteinNames.push(prawteinRaw.trim());
    }
    
    if (prawteinNames.length === 0) {
      return [];
    }
    
    console.log('🔍 Prawtein názvy/kódy k vyhledání:', prawteinNames);
    
    const enrichedProducts: Array<{ code: string; name: string; category: string; url: string | null; thumbnail: string | null; }> = [];
    
    for (const prawteinName of prawteinNames) {
      try {
        let product = null;
        
        const isNumeric = /^\d+$/.test(prawteinName.trim());
        
        if (isNumeric) {
          // Hledáme přesně podle product_code
          const result1 = await supabase
            .from('product_feed_2')
            .select('product_code, product_name, category, url, thumbnail')
            .eq('product_code', prawteinName.trim())
            .eq('category', 'PRAWTEIN® – superpotravinové směsi')
            .limit(1);
          
          if (!result1.error && result1.data && result1.data.length > 0) {
            product = result1.data[0];
          }
          
          // Fallback: hledáme bez filtru kategorie
          if (!product) {
            const result2 = await supabase
              .from('product_feed_2')
              .select('product_code, product_name, category, url, thumbnail')
              .eq('product_code', prawteinName.trim())
              .limit(1);
            
            if (!result2.error && result2.data && result2.data.length > 0) {
              product = result2.data[0];
            }
          }
        } else {
          // Textové hledání: Pokus 1 - S prefixem "PRAWTEIN "
          const result1 = await supabase
            .from('product_feed_2')
            .select('product_code, product_name, category, url, thumbnail')
            .ilike('product_name', `%PRAWTEIN ${prawteinName}%`)
            .eq('category', 'PRAWTEIN® – superpotravinové směsi')
            .limit(1);
          
          if (!result1.error && result1.data && result1.data.length > 0) {
            product = result1.data[0];
          } else {
            // Pokus 2: Bez prefixu (fallback)
            const result2 = await supabase
              .from('product_feed_2')
              .select('product_code, product_name, category, url, thumbnail')
              .ilike('product_name', `%${prawteinName}%`)
              .eq('category', 'PRAWTEIN® – superpotravinové směsi')
              .limit(1);
            
            if (!result2.error && result2.data && result2.data.length > 0) {
              product = result2.data[0];
            }
          }
        }
        
        if (product) {
          console.log(`✅ Prawtein produkt přidán: ${product.product_name} (${product.category})`);
          enrichedProducts.push({
            code: product.product_code,
            name: product.product_name,
            category: product.category,
            url: product.url,
            thumbnail: product.thumbnail
          });
        } else {
          console.warn(`⚠️ Produkt "${prawteinName}" nebyl nalezen v kategorii Prawtein`);
        }
      } catch (err) {
        console.warn(`⚠️ Nepodařilo se najít Prawtein produkt: ${prawteinName}`, err);
      }
    }
    
    return enrichedProducts;
    
  } catch (error) {
    console.error('❌ Chyba při načítání Prawtein produktů:', error);
    return [];
  }
}

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
    
    console.log('🔍 EO názvy/kódy k vyhledání:', eoNames);
    
    const enrichedProducts: Array<{ code: string; name: string; category: string; url: string | null; thumbnail: string | null; }> = [];
    
    for (const eoName of eoNames) {
      try {
        let product = null;

        // Zkusíme nejprve přímé hledání podle product_code (pro číselné kódy jako "758", "2687")
        const isNumeric = /^\d+$/.test(eoName.trim());
        
        if (isNumeric) {
          // Hledáme přesně podle product_code
          const result = await supabase
            .from('product_feed_2')
            .select('product_code, product_name, category, url, thumbnail')
            .eq('product_code', eoName.trim())
            .eq('category', 'Směsi esenciálních olejů')
            .limit(1);
          
          if (!result.error && result.data && result.data.length > 0) {
            product = result.data[0];
          }
          
          // Fallback: hledáme bez filtru kategorie (pro případ jiné kategorie)
          if (!product) {
            const result2 = await supabase
              .from('product_feed_2')
              .select('product_code, product_name, category, url, thumbnail')
              .eq('product_code', eoName.trim())
              .limit(1);
            
            if (!result2.error && result2.data && result2.data.length > 0) {
              product = result2.data[0];
            }
          }
        } else {
          // Textové hledání podle product_name pouze v kategorii EO směsi
          const result = await supabase
            .from('product_feed_2')
            .select('product_code, product_name, category, url, thumbnail')
            .ilike('product_name', `%${eoName}%`)
            .eq('category', 'Směsi esenciálních olejů')
            .limit(1);
          
          if (!result.error && result.data && result.data.length > 0) {
            product = result.data[0];
          }
        }
        
        if (product) {
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
