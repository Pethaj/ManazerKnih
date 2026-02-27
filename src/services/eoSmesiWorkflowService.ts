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
  companionProducts: Array<{ name: string; url: string | null; thumbnail: string | null; category: string }>;  // Doprovodné produkty (Panacea, is_companion=true)
  
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
  // Companion = Panacea (is_companion=true) + TČM wan (is_companion=false, ale EO Směsi flow ho nezobrazuje standardně)
  const companionProducts = products
    .filter(p => p.is_companion || p.matched_category === 'TČM - Tradiční čínská medicína')
    .map(p => ({
      name: p.matched_product_name,
      url: p.matched_product_url,
      thumbnail: p.matched_thumbnail,
      category: p.matched_category
    }));
  
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
    companionProducts,
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

  const [eoProducts, prawteinProducts, tcmProducts] = await Promise.all([
    getEOProductsForProblem(problemName),
    getPrawteinProductsForProblem(problemName),
    getTCMProductsForProblem(problemName)
  ]);

  const hasAnyProducts = eoProducts.length > 0 || prawteinProducts.length > 0 || tcmProducts.length > 0 || pairingResults.products.length > 0;

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
      aloeProductName: null,
      merkaba: false,
      aloeUrl: null,
      merkabaUrl: null,
      companionProducts: [],
      problemName,
      combinationName: 'Kombinace produktů',
      products: []
    };
  }

  medicineTable.products = [...eoProducts, ...prawteinProducts];
  if (eoProducts[0]) medicineTable.eo1 = eoProducts[0].name;
  if (eoProducts[1]) medicineTable.eo2 = eoProducts[1].name;
  if (prawteinProducts[0]) medicineTable.prawtein = prawteinProducts[0].name;

  // TČM wan produkty – přidáme do companionProducts (pokud ještě nejsou ze SQL RPC)
  if (tcmProducts.length > 0) {
    const existingCompanionNames = new Set(medicineTable.companionProducts.map(p => p.name?.toLowerCase()));
    for (const tcm of tcmProducts) {
      if (!existingCompanionNames.has(tcm.name.toLowerCase())) {
        medicineTable.companionProducts.push({
          name: tcm.name,
          url: tcm.url,
          thumbnail: tcm.thumbnail,
          category: tcm.category
        });
      }
    }
  }

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
    console.log('🔍 Processing EO Směsi with Known Problem:', problemName);
    
    const { medicineTable, pairingResults } = await buildMedicineTableForProblem(problemName);
    const shouldShowTable = medicineTable !== null && medicineTable.products.length > 0;

    console.log('🎯 EO Směsi – klasifikovaný problém:', problemName);
    console.log('🛒 EO Směsi – nalezené produkty:', medicineTable ? {
      eoSměsi: medicineTable.products.map(p => `${p.name} (${p.code})`),
      prawtein: medicineTable.prawtein || '–',
      aloe: medicineTable.aloe ? `✅ ${medicineTable.aloeProductName || 'Aloe'}` : '–',
      merkaba: medicineTable.merkaba ? '✅ Merkaba' : '–',
      companionProducts: medicineTable.companionProducts?.map(p => p.name) || [],
      shouldShowTable
    } : '⚠️ Žádná tabulka nebyla sestavena');

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
    console.log('🔍 Processing EO Směsi Query:', {
      userQuery: userQuery.substring(0, 100),
      sessionId: sessionId
    });
    
    // KROK 1: DEFINICE PROBLÉMU
    const problemClassification = await classifyProblemFromUserMessage(userQuery);
    
    console.log('📊 EO Směsi – výsledek klasifikace:', {
      success: problemClassification.success,
      certain: problemClassification.problems,
      uncertain: problemClassification.uncertainProblems,
      requiresUserSelection: problemClassification.requiresUserSelection,
      multipleProblems: problemClassification.multipleProblems,
      shouldShowTable: !problemClassification.requiresUserSelection && (problemClassification.problems?.length ?? 0) > 0
    });
    
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
    
    console.log('🎯 EO Směsi – klasifikovaný problém:', problems[0]);
    console.log('🛒 EO Směsi – nalezené produkty:', medicineTable ? {
      eoSměsi: medicineTable.products.map(p => `${p.name} (${p.code})`),
      prawtein: medicineTable.prawtein || '–',
      aloe: medicineTable.aloe ? `✅ ${medicineTable.aloeProductName || 'Aloe'}` : '–',
      merkaba: medicineTable.merkaba ? '✅ Merkaba' : '–',
      companionProducts: medicineTable.companionProducts?.map(p => p.name) || [],
      shouldShowTable
    } : '⚠️ Žádná tabulka nebyla sestavena');
    
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
          enrichedProducts.push({
            code: product.product_code,
            name: product.product_name,
            category: product.category,
            url: product.url,
            thumbnail: product.thumbnail
          });
        } else {
        }
      } catch (err) {
      }
    }
    
    return enrichedProducts;
    
  } catch (error) {
    return [];
  }
}

/**
 * Načte TČM wan produkty pro daný problém z tabulky leceni
 * Načte sloupec "TČM wan" a vyhledá produkt v product_feed_2 podle kódu nebo názvu.
 *
 * @param problemName - Název problému
 * @returns Pole product info pro TČM wan produkty
 */
export async function getTCMProductsForProblem(
  problemName: string
): Promise<Array<{ code: string; name: string; category: string; url: string | null; thumbnail: string | null; }>> {
  try {
    const { data: leceniData, error: leceniError } = await supabase
      .from('leceni')
      .select('"TČM wan"')
      .eq('Problém', problemName)
      .limit(1);

    if (leceniError || !leceniData || leceniData.length === 0) {
      return [];
    }

    const record = leceniData[0];
    const tcmRaw = record['TČM wan'];

    if (!tcmRaw || tcmRaw.trim() === '' || tcmRaw.trim() === '–') {
      return [];
    }

    const tcmNames: string[] = tcmRaw.includes(',')
      ? tcmRaw.split(',').map((p: string) => p.trim()).filter(Boolean)
      : [tcmRaw.trim()];

    const enrichedProducts: Array<{ code: string; name: string; category: string; url: string | null; thumbnail: string | null; }> = [];

    for (const tcmName of tcmNames) {
      try {
        let product = null;
        const isNumeric = /^\d+$/.test(tcmName);

        if (isNumeric) {
          // Wany produkty mají v product_feed_2 product_name ve formátu "063 - Klidné dřevo"
          // Číslo je součástí názvu, NE product_code → hledáme přes LIKE na product_name
          const result = await supabase
            .from('product_feed_2')
            .select('product_code, product_name, category, url, thumbnail')
            .ilike('product_name', `${tcmName}%`)
            .limit(1);

          if (!result.error && result.data && result.data.length > 0) {
            product = result.data[0];
          }

          // Fallback: exact match na product_code (pro jiné typy produktů)
          if (!product) {
            const result2 = await supabase
              .from('product_feed_2')
              .select('product_code, product_name, category, url, thumbnail')
              .eq('product_code', tcmName)
              .limit(1);

            if (!result2.error && result2.data && result2.data.length > 0) {
              product = result2.data[0];
            }
          }
        } else {
          // Textový match – stejná logika jako SQL RPC (exact, pak LIKE)
          const result1 = await supabase
            .from('product_feed_2')
            .select('product_code, product_name, category, url, thumbnail')
            .ilike('product_name', tcmName)
            .limit(1);

          if (!result1.error && result1.data && result1.data.length > 0) {
            product = result1.data[0];
          } else {
            const result2 = await supabase
              .from('product_feed_2')
              .select('product_code, product_name, category, url, thumbnail')
              .ilike('product_name', `%${tcmName}%`)
              .limit(1);

            if (!result2.error && result2.data && result2.data.length > 0) {
              product = result2.data[0];
            }
          }
        }

        if (product) {
          enrichedProducts.push({
            code: product.product_code,
            name: product.product_name,
            category: product.category,
            url: product.url,
            thumbnail: product.thumbnail
          });
        }
      } catch (_err) {
        // pokračuj na další produkt
      }
    }

    return enrichedProducts;
  } catch (_error) {
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
          enrichedProducts.push({
            code: product.product_code,
            name: product.product_name,
            category: product.category,
            url: product.url,
            thumbnail: product.thumbnail
          });
        } else {
        }
      } catch (err) {
      }
    }
    
    return enrichedProducts;
    
  } catch (error) {
    return [];
  }
}
