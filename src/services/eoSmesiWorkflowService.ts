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

// Vrátí správný cenový sloupec podle customer type. Výchozí je 'price_a'.
function getPriceColumn(customerType?: string | null): 'price_a' | 'price_b' | 'price_c' {
  if (customerType === 'B') return 'price_b';
  if (customerType === 'C') return 'price_c';
  return 'price_a';
}

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

/**
 * Ingredience s popisem z tabulky ingredients_description
 */
export interface IngredientWithDescription {
  name: string;
  description: string | null;
}

/**
 * Struktura léčebné tabulky (Medicine Table)
 * Obsahuje extrahované produkty z tabulky leceni
 */
export interface MedicineTable {
  eo1: string | null;      // Esenciální olej 1 (product_name)
  eo2: string | null;      // Esenciální olej 2 (product_name)
  eo1Slozeni: IngredientWithDescription[];    // Účinné látky EO1 (z tabulky slozeni + popis)
  eo2Slozeni: IngredientWithDescription[];    // Účinné látky EO2 (z tabulky slozeni + popis)
  prawteinSlozeni: IngredientWithDescription[];  // Účinné látky Prawtein (z tabulky slozeni + popis)
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
    description?: string;
    category: string;
    url: string | null;
    thumbnail: string | null;
    price?: number | null;
    currency?: string;
    variants_json?: Array<{
      variant_name: string | null;
      price_a: number | null;
      price_b: number | null;
      price_b_percents: number | null;
      price_c: number | null;
      price_c_percents: number | null;
      in_action: number;
      availability: number;
      accessibility: string[];
      add_to_cart_id: string | null;
    }> | null;
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
      .from('product_feed_abc')
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
      .from('product_feed_abc')
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
    eo1Slozeni: [],
    eo2Slozeni: [],
    prawteinSlozeni: [],
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
async function buildMedicineTableForProblem(problemName: string, customerType?: string | null): Promise<{
  medicineTable: MedicineTable | null;
  pairingResults: PairingRecommendations;
}> {
  console.log('🔧 [buildMedicineTableForProblem] START:', { problemName });
  
  try {
    const pairingResults = await matchProductCombinationsWithProblems([problemName]);
    console.log('🔧 [buildMedicineTableForProblem] matchProductCombinations OK:', pairingResults.products.length);

    const [eoProducts, prawteinProducts, tcmProducts] = await Promise.all([
      getEOProductsForProblem(problemName, customerType),
      getPrawteinProductsForProblem(problemName, customerType),
      getTCMProductsForProblem(problemName, customerType)
    ]);
    
    console.log('🔧 [buildMedicineTableForProblem] Promise.all OK:', {
      eoProducts: eoProducts.length,
      prawteinProducts: prawteinProducts.length,
      tcmProducts: tcmProducts.length
    });

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
      eo1Slozeni: [],
      eo2Slozeni: [],
      prawteinSlozeni: [],
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

  // Načteme kódy EO směsí přímo z leceni (stejné hodnoty jako v Ing_sol.produkt)
  const { data: leceniRow } = await supabase
    .from('leceni')
    .select('"EO 1", "EO 2"')
    .eq('Problém', problemName)
    .limit(1);

  const eo1Code = leceniRow?.[0]?.['EO 1'] ?? null;
  const eo2Code = leceniRow?.[0]?.['EO 2'] ?? null;

  // Načti Ing_sol paralelně pro EO1 a EO2 pomocí kódů z leceni
  const [eo1IngSol, eo2IngSol] = await Promise.all([
    eo1Code ? getIngredientsByProblemAndEO(problemName, eo1Code) : Promise.resolve([]),
    eo2Code ? getIngredientsByProblemAndEO(problemName, eo2Code) : Promise.resolve([])
  ]);

  medicineTable.eo1Slozeni = eo1IngSol;
  medicineTable.eo2Slozeni = eo2IngSol;
  medicineTable.prawteinSlozeni = [];

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
  } catch (error) {
    console.error('🔧 [buildMedicineTableForProblem] CHYBA:', error);
    return { medicineTable: null, pairingResults: { products: [], aloe: false, merkaba: false } };
  }
}

/**
 * Přímé zpracování ZNÁMÉHO problému (vybraného uživatelem z dotazníku).
 * Přeskočí LLM klasifikaci - problém je již znám.
 */
export async function processEoSmesiQueryWithKnownProblem(
  problemName: string,
  customerType?: string | null
): Promise<EoSmesiResult> {
  try {
    const { medicineTable, pairingResults } = await buildMedicineTableForProblem(problemName, customerType);

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
  sessionId?: string,
  customerType?: string | null
): Promise<EoSmesiResult> {
  console.log('⚙️ [processEoSmesiQuery] INICIALIZACE - userQuery:', userQuery);
  
  try {
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
    const { medicineTable, pairingResults } = await buildMedicineTableForProblem(problems[0], customerType);
    const shouldShowTable = medicineTable !== null && medicineTable.products.length > 0;

    console.log('🔎 [processEoSmesiQuery] Výsledek:', {
      shouldShowTable,
      'medicineTable !== null': medicineTable !== null,
      'products.length': medicineTable?.products?.length ?? 'N/A',
      products: medicineTable?.products,
      problemName: medicineTable?.problemName,
    });
    
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
    // #region agent log H1/H2/H3
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    console.error('❌ [processEoSmesiQuery] CHYBA:', errorMessage, error);
    // #endregion
    
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
 * Načte ingredience z tabulky ing_sol pro daný problém + konkrétní EO směs.
 * Tato funkce je hlavní pro zobrazení látek v EO Směsi chatu.
 *
 * Logika:
 * - Tabulka ing_sol obsahuje záznamy pro kombinaci (problém + EO směs)
 * - Dotazuje se přes sloupce: problem, eo_smes, ingredience, popis
 * - Vrátí IngredientWithDescription[] – popis může být prázdný (zobrazí se jen název)
 *
 * @param problemName - Název problému (shoduje se s tabulkou leceni)
 * @param eoSmes - Název konkrétní EO směsi (shoduje se s EO 1 / EO 2 z leceni)
 * @returns Pole ingrediencí (název + popis, popis může být null)
 */
export async function getIngredientsByProblemAndEO(
  problemName: string,
  eoSmes: string
): Promise<IngredientWithDescription[]> {
  try {
    const { data, error } = await supabase
      .from('Ing_sol')
      .select('ingredience, popis')
      .eq('problem', problemName)
      .eq('produkt', eoSmes);

    if (error) {
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    const result: IngredientWithDescription[] = data.map(
      (row: { ingredience: string; popis: string | null }) => ({
        name: row.ingredience,
        description: row.popis || null
      })
    );

    return result;
  } catch (_err) {
    console.error(
      `%c❌ [ing_sol] KRITICKÁ CHYBA při načítání:`,
      'color: #e74c3c; font-weight: bold;'
    );
    console.error(_err);
    return [];
  }
}

/**
 * Načte ingredience ze ing_sol pro VŠECHNY EO směsi daného problému.
 * Vrátí deduplikovaný seznam ingrediencí přes všechny EO směsi.
 * Pokud pro danou EO směs nejsou záznamy, přeskočí ji tiše.
 *
 * @param problemName - Název problému
 * @param eoNames - Pole názvů EO směsí (EO 1, EO 2, ...)
 * @returns Deduplikované pole ingrediencí
 */
export async function getIngredientsByProblemAndEOList(
  problemName: string,
  eoNames: string[]
): Promise<IngredientWithDescription[]> {
  if (eoNames.length === 0) return [];

  console.log(
    `%c🌿 [ing_sol] Načítám ingredience pro ${eoNames.length} EO směs(í): ${eoNames.join(', ')}`,
    'color: #9b59b6; font-weight: bold;'
  );

  const allResults = await Promise.all(
    eoNames.map(eo => getIngredientsByProblemAndEO(problemName, eo))
  );

  // Deduplikace podle názvu ingredience (zachová první výskyt)
  const seen = new Set<string>();
  const merged: IngredientWithDescription[] = [];
  for (const list of allResults) {
    for (const item of list) {
      if (!seen.has(item.name.toLowerCase())) {
        seen.add(item.name.toLowerCase());
        merged.push(item);
      }
    }
  }

  if (merged.length > 0) {
    console.log(
      `%c✅ [ing_sol] Celkem po deduplikaci: ${merged.length} ingrediencí`,
      'color: #2ecc71; font-weight: bold;'
    );
  }

  return merged;
}

/**
 * Načte účinné látky pro daný problém z tabulky ingredient-solution.
 * Tato funkce slouží pro nový mód "filtrovat látky podle problému".
 * Vrátí IngredientWithDescription[] s popisem specifickým pro konkrétní problém.
 * 
 * Logování:
 * - Zobrazuje se seznam gefiltovaných ingrediencí s jejich popisy
 * - Strukturované logování s CSS stylem pro lepší čitelnost v konzoli
 * - Detailní debug informace pro diagnostiku
 *
 * @param problemName - Název problému (kategorie v ingredient-solution)
 * @returns Pole látek s popisem specifickým pro tento problém
 */
export async function getIngredientsByProblem(
  problemName: string
): Promise<IngredientWithDescription[]> {
  try {
    console.log(`%c🌿 [Filtrovat látky podle problému] START`, 'color: #2ecc71; font-weight: bold; font-size: 14px;');
    console.log(`%cProblém: ${problemName}`, 'color: #3498db; font-size: 12px;');
    
    const { data, error } = await supabase
      .from('ingredient-solution')
      .select('ingredience, popis')
      .eq('kategorie', problemName);

    if (error || !data || data.length === 0) {
      console.warn(`%c⚠️ [ingredient-solution] Žádná data pro problém: "${problemName}"`, 'color: #f39c12; font-weight: bold;');
      if (error) {
        console.error('Detaily chyby:', error.message);
      }
      return [];
    }

    const result = data.map((row: { ingredience: string; popis: string }) => ({
      name: row.ingredience,
      description: row.popis || null
    }));

    // 📊 HLAVNÍ LOG - Strukturované zobrazení gefiltovaných ingrediencí
    console.groupCollapsed(
      `%c✅ [Filtrovat látky podle problému] Nalezeno ${result.length} ingrediencí pro: "${problemName}"`,
      'color: #2ecc71; font-weight: bold; font-size: 13px;'
    );
    
    // Zobraz tabulkový formát v konzoli
    console.table(result.map((item, idx) => ({
      'Poř.': idx + 1,
      'Ingredience': item.name,
      'Popis': item.description || '(bez popisu)'
    })));

    // Detailní výpis s formátováním
    console.log(`%c═══════════════════════════════════════════════════════`, 'color: #95a5a6;');
    result.forEach((item, idx) => {
      const hasDescription = item.description && item.description.length > 0;
      const style = hasDescription 
        ? 'color: #27ae60; font-weight: 500;' 
        : 'color: #95a5a6; font-style: italic;';
      
      console.log(
        `%c${idx + 1}. ${item.name}${hasDescription ? ` – ${item.description}` : ' (bez popisu)'}`,
        style
      );
    });
    console.log(`%c═══════════════════════════════════════════════════════`, 'color: #95a5a6;');
    
    console.groupEnd();

    // 📈 Summary log na konci
    const withDescription = result.filter(i => i.description).length;
    const withoutDescription = result.filter(i => !i.description).length;
    
    console.log(
      `%c✨ SOUHRN: ${result.length} ingrediencí (${withDescription} s popisem, ${withoutDescription} bez popisu)`,
      'color: #3498db; background-color: #ecf0f1; padding: 8px 12px; border-radius: 4px;'
    );

    return result;
  } catch (_error) {
    console.error(`%c❌ [ingredient-solution] KRITICKÁ CHYBA při načítání látek:`, 'color: #e74c3c; font-weight: bold;');
    console.error('Detaily chyby:', _error);
    return [];
  }
}

/**
 * Načte Prawtein produkty pro daný problém z tabulky leceni
 * Stejná logika jako u EO - načte názvy a napáruje podle kategorie
 * 
 * @param problemName - Název problému
 * @param customerType - Typ zákazníka ('A', 'B', 'C') pro výběr cenového sloupce
 * @returns Pole product info pro Prawtein produkty
 */
export async function getPrawteinProductsForProblem(
  problemName: string,
  customerType?: string | null
): Promise<Array<{ code: string; name: string; description?: string; category: string; url: string | null; thumbnail: string | null; price?: number | null; currency?: string; variants_json?: any[] | null; }>> {
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
    const priceColumn = getPriceColumn(customerType);
    const enrichedProducts: Array<{ code: string; name: string; category: string; url: string | null; thumbnail: string | null; price?: number | null; currency?: string; variants_json?: any[] | null; }> = [];
    
    for (const prawteinName of prawteinNames) {
      try {
        let product = null;
        
        const isNumeric = /^\d+$/.test(prawteinName.trim());
        
        if (isNumeric) {
          // Hledáme přesně podle product_code
          const result1 = await supabase
            .from('product_feed_abc')
            .select(`product_code, product_name, description_short, category, url, thumbnail, ${priceColumn}, currency, variants_json`)
            .eq('product_code', prawteinName.trim())
            .eq('category', 'PRAWTEIN® – superpotravinové směsi')
            .limit(1);
          
          if (!result1.error && result1.data && result1.data.length > 0) {
            product = result1.data[0];
          }
          
          // Fallback: hledáme bez filtru kategorie
          if (!product) {
            const result2 = await supabase
              .from('product_feed_abc')
              .select(`product_code, product_name, description_short, category, url, thumbnail, ${priceColumn}, currency, variants_json`)
              .eq('product_code', prawteinName.trim())
              .limit(1);
            
            if (!result2.error && result2.data && result2.data.length > 0) {
              product = result2.data[0];
            }
          }
        } else {
          // Textové hledání: Pokus 1 - S prefixem "PRAWTEIN "
          const result1 = await supabase
            .from('product_feed_abc')
            .select(`product_code, product_name, description_short, category, url, thumbnail, ${priceColumn}, currency, variants_json`)
            .ilike('product_name', `%PRAWTEIN ${prawteinName}%`)
            .eq('category', 'PRAWTEIN® – superpotravinové směsi')
            .limit(1);
          
          if (!result1.error && result1.data && result1.data.length > 0) {
            product = result1.data[0];
          } else {
            // Pokus 2: Bez prefixu (fallback)
            const result2 = await supabase
              .from('product_feed_abc')
              .select(`product_code, product_name, description_short, category, url, thumbnail, ${priceColumn}, currency, variants_json`)
              .ilike('product_name', `%${prawteinName}%`)
              .eq('category', 'PRAWTEIN® – superpotravinové směsi')
              .limit(1);
            
            if (!result2.error && result2.data && result2.data.length > 0) {
              product = result2.data[0];
            }
          }
        }
        
        if (product) {
          const priceValue = product[priceColumn] ?? null;
          enrichedProducts.push({
            code: product.product_code,
            name: product.product_name,
            description: product.description_short || undefined,
            category: product.category,
            url: product.url,
            thumbnail: product.thumbnail,
            price: priceValue,
            currency: product.currency || 'CZK',
            variants_json: product.variants_json || null
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
 * Načte sloupec "TČM wan" a vyhledá produkt v product_feed_abc podle kódu nebo názvu.
 *
 * @param problemName - Název problému
 * @param customerType - Typ zákazníka ('A', 'B', 'C') pro výběr cenového sloupce
 * @returns Pole product info pro TČM wan produkty
 */
export async function getTCMProductsForProblem(
  problemName: string,
  customerType?: string | null
): Promise<Array<{ code: string; name: string; description?: string; category: string; url: string | null; thumbnail: string | null; price?: number | null; currency?: string; }>> {
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

    const enrichedProducts: Array<{ code: string; name: string; category: string; url: string | null; thumbnail: string | null; price?: number | null; currency?: string; }> = [];
    const priceColumn = getPriceColumn(customerType);

    for (const tcmName of tcmNames) {
      try {
        let product = null;
        const isNumeric = /^\d+$/.test(tcmName);

        if (isNumeric) {
          // Wany produkty mají v product_feed_abc product_name ve formátu "063 - Klidné dřevo"
          // Číslo je součástí názvu, NE product_code → hledáme přes LIKE na product_name
          const result = await supabase
            .from('product_feed_abc')
            .select(`product_code, product_name, description_short, category, url, thumbnail, ${priceColumn}, currency, variants_json`)
            .ilike('product_name', `${tcmName}%`)
            .limit(1);

          if (!result.error && result.data && result.data.length > 0) {
            product = result.data[0];
          }

          // Fallback: exact match na product_code (pro jiné typy produktů)
          if (!product) {
            const result2 = await supabase
              .from('product_feed_abc')
              .select(`product_code, product_name, description_short, category, url, thumbnail, ${priceColumn}, currency, variants_json`)
              .eq('product_code', tcmName)
              .limit(1);

            if (!result2.error && result2.data && result2.data.length > 0) {
              product = result2.data[0];
            }
          }
        } else {
          // Textový match – stejná logika jako SQL RPC (exact, pak LIKE)
          const result1 = await supabase
            .from('product_feed_abc')
            .select(`product_code, product_name, description_short, category, url, thumbnail, ${priceColumn}, currency, variants_json`)
            .ilike('product_name', tcmName)
            .limit(1);

          if (!result1.error && result1.data && result1.data.length > 0) {
            product = result1.data[0];
          } else {
            const result2 = await supabase
              .from('product_feed_abc')
              .select(`product_code, product_name, description_short, category, url, thumbnail, ${priceColumn}, currency, variants_json`)
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
            description: product.description_short || undefined,
            category: product.category,
            url: product.url,
            thumbnail: product.thumbnail,
            price: product[priceColumn] ?? null,
            currency: product.currency || 'CZK'
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
 * @param customerType - Typ zákazníka ('A', 'B', 'C') pro výběr cenového sloupce
 * @returns Pole product info pro EO produkty
 */
export async function getEOProductsForProblem(
  problemName: string,
  customerType?: string | null
): Promise<Array<{ code: string; name: string; description?: string; category: string; url: string | null; thumbnail: string | null; price?: number | null; currency?: string; variants_json?: any[] | null; }>> {
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
    const priceColumn = getPriceColumn(customerType);
    const enrichedProducts: Array<{ code: string; name: string; category: string; url: string | null; thumbnail: string | null; price?: number | null; currency?: string; variants_json?: any[] | null; }> = [];
    
    for (const eoName of eoNames) {
      try {
        let product = null;

        // Zkusíme nejprve přímé hledání podle product_code (pro číselné kódy jako "758", "2687")
        const isNumeric = /^\d+$/.test(eoName.trim());
        
        if (isNumeric) {
          // Hledáme přesně podle product_code
          const result = await supabase
            .from('product_feed_abc')
            .select(`product_code, product_name, description_short, category, url, thumbnail, ${priceColumn}, currency, variants_json`)
            .eq('product_code', eoName.trim())
            .eq('category', 'Směsi esenciálních olejů')
            .limit(1);
          
          if (!result.error && result.data && result.data.length > 0) {
            product = result.data[0];
          }
          
          // Fallback: hledáme bez filtru kategorie (pro případ jiné kategorie)
          if (!product) {
            const result2 = await supabase
              .from('product_feed_abc')
              .select(`product_code, product_name, description_short, category, url, thumbnail, ${priceColumn}, currency, variants_json`)
              .eq('product_code', eoName.trim())
              .limit(1);
            
            if (!result2.error && result2.data && result2.data.length > 0) {
              product = result2.data[0];
            }
          }
        } else {
          // Textové hledání podle product_name pouze v kategorii EO směsi
          const result = await supabase
            .from('product_feed_abc')
            .select(`product_code, product_name, description_short, category, url, thumbnail, ${priceColumn}, currency, variants_json`)
            .ilike('product_name', `%${eoName}%`)
            .eq('category', 'Směsi esenciálních olejů')
            .limit(1);
          
          if (!result.error && result.data && result.data.length > 0) {
            product = result.data[0];
          }
        }
        
        if (product) {
          const priceValue = product[priceColumn] ?? null;
          enrichedProducts.push({
            code: product.product_code,
            name: product.product_name,
            description: product.description_short || undefined,
            category: product.category,
            url: product.url,
            thumbnail: product.thumbnail,
            price: priceValue,
            currency: product.currency || 'CZK',
            variants_json: product.variants_json || null
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

// ============================================================================
// HELPER: Načtení složení EO1 a EO2 z tabulky leceni
// ============================================================================

/**
 * Načte účinné látky pro EO1, EO2 a Prawtein přímo z tabulky slozeni
 * a doplní jejich popis z tabulky ingredients_description.
 * Párování je case-insensitive podle blend_name.
 * Zobrazují se pouze PRVNÍ 3 látky z každého produktu.
 * Látky bez záznamu v ingredients_description mají description: null a nezobrazí se.
 *
 * @param problemName - Název problému (pro načtení EO 1, EO 2, Prawtein z leceni)
 * @returns Objekt s poli látek (s popisem) pro eo1, eo2 a prawtein
 */
async function getEOSlozeniForProblem(
  problemName: string
): Promise<{ eo1Slozeni: IngredientWithDescription[]; eo2Slozeni: IngredientWithDescription[]; prawteinSlozeni: IngredientWithDescription[] }> {
  try {
    const { data: leceniData, error: leceniError } = await supabase
      .from('leceni')
      .select('"EO 1", "EO 2", "Prawtein"')
      .eq('Problém', problemName)
      .limit(1);

    if (leceniError || !leceniData || leceniData.length === 0) {
      return { eo1Slozeni: [], eo2Slozeni: [], prawteinSlozeni: [] };
    }

    const record = leceniData[0];

    // Pokud buňka obsahuje více produktů oddělených čárkou (např. "COLWIT, NOSE"),
    // vezmeme jen první pro eo1Name / eo2Name / prawteinName – složení se zobrazuje pouze
    // pro primární produkt, ne pro všechny v buňce.
    const splitFirst = (raw: string | null): string | null => {
      if (!raw || raw.trim() === '') return null;
      return raw.includes(',') ? raw.split(',')[0].trim() : raw.trim();
    };

    const eo1Name: string | null = splitFirst(record['EO 1']);
    const eo2Name: string | null = splitFirst(record['EO 2']);
    const prawteinName: string | null = splitFirst(record['Prawtein']);

    // Načte názvy látek z tabulky slozeni (max 3 z každého produktu)
    const fetchRawIngredients = async (productName: string | null): Promise<string[]> => {
      if (!productName || productName.trim() === '' || productName === 'null') return [];
      const name = productName.trim();

      // Pokus 1: přesná shoda (case-insensitive)
      let result = await supabase
        .from('slozeni')
        .select('ingredients')
        .ilike('blend_name', name)
        .limit(1);

      // Pokus 2: LIKE s obsahem (pro "BODYGUARD" najde "PRAWTEIN Bodyguard")
      if (result.error || !result.data || result.data.length === 0) {
        result = await supabase
          .from('slozeni')
          .select('ingredients')
          .ilike('blend_name', `%${name}%`)
          .limit(1);
      }

      if (result.error || !result.data || result.data.length === 0) return [];
      const raw: string = result.data[0].ingredients || '';
      return raw
        .split('|')
        .map((s: string) => s.trim())
        .filter(Boolean)
        .slice(0, 3);
    };

    const [eo1Names, eo2Names, prawteinNames] = await Promise.all([
      fetchRawIngredients(eo1Name),
      fetchRawIngredients(eo2Name),
      fetchRawIngredients(prawteinName)
    ]);

    // Všechny unikátní názvy látek
    const allUniqueNames = Array.from(new Set([...eo1Names, ...eo2Names, ...prawteinNames]));

    // Paralelní dotazy – každá látka zvlášť (PostgREST .in() selhává na názvech se závorkami)
    let descriptionMap: Record<string, string> = {};
    if (allUniqueNames.length > 0) {
      const results = await Promise.all(
        allUniqueNames.map(name =>
          supabase
            .from('ingredients_description')
            .select('Ingredient, Description')
            .eq('Ingredient', name)
            .limit(1)
        )
      );
      
      for (let i = 0; i < results.length; i++) {
        const { data, error } = results[i];
        if (data && data.length > 0 && data[0].Ingredient && data[0].Description) {
          descriptionMap[data[0].Ingredient] = data[0].Description;
        }
      }
    }

    // Sestaví IngredientWithDescription[] – pouze látky s existujícím popisem
    const toEnriched = (names: string[]): IngredientWithDescription[] =>
      names
        .filter(name => descriptionMap[name] != null)
        .map(name => ({ name, description: descriptionMap[name] }));

    return {
      eo1Slozeni: toEnriched(eo1Names),
      eo2Slozeni: toEnriched(eo2Names),
      prawteinSlozeni: toEnriched(prawteinNames)
    };
  } catch (_error) {
    return { eo1Slozeni: [], eo2Slozeni: [], prawteinSlozeni: [] };
  }
}

// ============================================================================
// HELPER: Logování ingrediencí
// ============================================================================

/**
 * Formátované logování seznamu ingrediencí do konzole.
 * Používá se pro diagnostiku a monitoring získaných ingrediencí.
 * 
 * Příklad logů:
 * - Zelené logy = úspěšně načtené ingredience
 * - Červené logy = chyby při načítání
 * - Tabulkový formát v konzoli pro lepší přehled
 * 
 * @param ingredients - Pole ingrediencí k zalogování
 * @param problemName - Název problému (pro kontext v logu)
 * @param source - Zdroj dat ('ingredient-solution', 'slozeni', atd.)
 */
export function logFilteredIngredients(
  ingredients: IngredientWithDescription[],
  problemName: string,
  source: 'ingredient-solution' | 'slozeni' | 'product' = 'ingredient-solution'
): void {
  const sourceLabel = {
    'ingredient-solution': '📋 ingredient-solution (problém)',
    'slozeni': '📦 slozeni (produkt)',
    'product': '🔗 produkt'
  }[source];

  console.group(
    `%c✨ [INGREDIENCE ZALOGOVÁNO] ${sourceLabel} | ${problemName}`,
    'color: #2ecc71; font-weight: bold; font-size: 13px;'
  );

  if (ingredients.length === 0) {
    console.warn(
      `%c⚠️ Žádné ingredience nenalezeny!`,
      'color: #f39c12; font-weight: bold;'
    );
  } else {
    // Tabulka
    const tableData = ingredients.map((item, idx) => ({
      '#': idx + 1,
      'Ingredience': item.name,
      'Popis': item.description ? item.description.substring(0, 60) + (item.description.length > 60 ? '...' : '') : '(bez popisu)'
    }));
    
    console.table(tableData);

    // Statistika
    const withDescription = ingredients.filter(i => i.description).length;
    const withoutDescription = ingredients.filter(i => !i.description).length;
    
    console.log(
      `%c📊 STATISTIKA: ${ingredients.length} ingrediencí (${withDescription} s popisem, ${withoutDescription} bez)`,
      'color: #3498db; background: #ecf0f1; padding: 6px 10px; border-radius: 3px;'
    );
  }

  console.groupEnd();
}
