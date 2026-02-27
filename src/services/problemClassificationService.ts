/**
 * Problem Classification Service (Problem Classifier)
 * 
 * Problem Classifier - Agent pro klasifikaci zdravotních problémů z uživatelské zprávy
 * Volá Supabase Edge Function s OpenRouter Claude
 */

import { supabase } from '../lib/supabase';

// ============================================================================
// KONFIGURACE
// ============================================================================

const EDGE_FUNCTION_URL = 'openrouter-proxy';

// ============================================================================
// INTERFACES
// ============================================================================

export interface ProblemClassificationResult {
  success: boolean;
  problems: string[]; // Seznam klasifikovaných problémů
  uncertainProblems?: string[]; // Pokud si agent není jistý - nabídne výběr
  requiresUserSelection?: boolean; // Zobrazit formulář?
  multipleProblems?: boolean; // Uživatel zmínil více problémů najednou
  allMentionedProblems?: string[]; // Všechny zmíněné problémy v pořadí zmínění (raw text)
  rawResponse?: string;
  error?: string;
}

// ============================================================================
// DYNAMICKÉ NAČÍTÁNÍ PROBLÉMŮ Z SUPABASE
// ============================================================================

/**
 * Normalizuje string pro porovnání - nahrazuje různé typy pomlček a čárky běžnými znaky
 */
function normalizeString(str: string): string {
  return str
    .replace(/[\u2013\u2014\u2212]/g, '-')  // en dash, em dash, minus → hyphen
    .replace(/[\u2018\u2019]/g, "'")        // smart quotes → apostrophe
    .replace(/\s+/g, ' ')                   // multiple spaces → single space
    .trim()
    .toUpperCase();
}

/**
 * Načte VŠECHNY unikátní problémy z tabulky leceni v Supabase
 * Toto je dynamické - kategorie se nemají hardcodovat v promptu!
 */
async function loadAvailableProblemsFromSupabase(): Promise<string[]> {
  try {
    // Načti sloupec "Problém" ze všech záznamů
    const { data, error } = await supabase
      .from('leceni')
      .select('Problém');
    
    if (error) {
      throw error;
    }
    
    if (!data || data.length === 0) {
      return [];
    }
    
    // Extrahuj unikátní problémy (můžou se opakovat v různých kombinacích)
    const problems = new Set<string>();
    
    data.forEach(row => {
      const problem = row['Problém'];
      if (problem && typeof problem === 'string' && problem.trim() !== '') {
        problems.add(problem.trim());
      }
    });
    
    const problemsArray = Array.from(problems);
    return problemsArray;
    
  } catch (error) {
    throw error;
  }
}

/**
 * Vygeneruje system prompt s aktuálními kategoriemi z Supabase
 */
function generateSystemPrompt(availableProblems: string[]): string {
  const problemsList = availableProblems.map(p => `- ${p}`).join('\n');
  
  return `Jsi lékařský expert specializující se na symptomy a zdravotní problémy.

Tvým úkolem je KLASIFIKOVAT zdravotní problém z textu uživatele podle dostupných kategorií.

**KROK 1 – DETEKUJ, KOLIK PROBLÉMŮ UŽIVATEL ZMÍNIL:**

Pokud uživatel zmíní více zdravotních problémů najednou (spojené "a", "také", "zároveň", "navíc", "plus", čárkou apod.):
- Nastav "multiple_problems": true
- Do "all_mentioned" uveď všechny zmíněné problémy jako stručný raw text v pořadí, v jakém je uživatel zmínil
- "certain" a "uncertain" vyplň POUZE pro PRVNÍ zmíněný problém – ostatní ignoruj

Pokud uživatel zmínil jen jeden problém:
- Nastav "multiple_problems": false
- "all_mentioned": []
- "certain" a "uncertain" vyplň normálně

**KROK 2 – KLASIFIKUJ (pouze pro první zmíněný problém):**

**DOSTUPNÉ KATEGORIE PROBLÉMŮ:**
${problemsList}

**SITUACE A: JEDNOZNAČNĚ IDENTIFIKOVANÝ PROBLÉM**
Použij "certain" POUZE pokud:
- Uživatel zmíní PŘÍČINU (ze stresu, po sportování, chronická, nervová, atd.) A tato příčina jednoznačně určuje JEDINOU kategorii
- Uživatelova zpráva přesně odpovídá JEDINÉ kategorii – žádná jiná není relevantní
- V dostupných kategoriích existuje POUZE JEDNA možná shoda

→ {"certain": ["přesný název kategorie"], "uncertain": [], "multiple_problems": ..., "all_mentioned": [...]}

**SITUACE B: NEJEDNOZNAČNÝ / OBECNÝ PROBLÉM (VÝCHOZÍ STAV)**
Použij "uncertain" pokud:
- Uživatel použije obecný termín bez dostatečného upřesnění
- Pro daný problém existuje více možných kategorií (různé podtypy, příčiny, závažnosti)
- Nelze s jistotou určit JEDINOU správnou kategorii

→ {"certain": [], "uncertain": ["kategorie1", "kategorie2", "kategorie3"], "multiple_problems": ..., "all_mentioned": [...]}
(Max 5 nejrelevantnějších kategorií, seřazených od nejpravděpodobnější)

**KRITICKÉ PRAVIDLO:** "certain" může mít MAXIMÁLNĚ 1 položku. Více položek → vše do "uncertain".

**PŘÍKLADY:**

Input: "mám bolest kolenou a bolí mě hlava"
Output: {"certain": [], "uncertain": ["Klouby – akutní bolest", "Klouby – chronické", "Klouby – degenerativní"], "multiple_problems": true, "all_mentioned": ["bolest kolenou", "bolest hlavy"]}

Input: "mám ucpaný nos a bolí mě hlava"
Output: {"certain": [], "uncertain": ["Nachlazení (rýma, viróza)", "Zánět nosohltanu (rinofaryngitida)"], "multiple_problems": true, "all_mentioned": ["ucpaný nos", "bolest hlavy"]}

Input: "trápí mě záda a také žlučník"
Output: {"certain": [], "uncertain": ["Záda – akutní blokáda", "Záda – chronická bolest", "Záda – přetížení / sezení"], "multiple_problems": true, "all_mentioned": ["záda", "žlučník"]}

Input: "Bolí mě hlava ze stresu"
Output: {"certain": ["Bolest hlavy – ze stresu"], "uncertain": [], "multiple_problems": false, "all_mentioned": []}

Input: "Bolí mě hlava"
Output: {"certain": [], "uncertain": ["Bolest hlavy – akutní", "Bolest hlavy – ze stresu", "Bolest hlavy – nervová"], "multiple_problems": false, "all_mentioned": []}

Input: "mám žlučníkové kameny"
Output: {"certain": ["Žlučník - žlučové kameny"], "uncertain": [], "multiple_problems": false, "all_mentioned": []}

Input: "Jak se máš?"
Output: {"certain": [], "uncertain": [], "multiple_problems": false, "all_mentioned": []}

**KRITICKÉ PRAVIDLO PRO VÝSTUP:**
- Vrať VÝHRADNĚ validní JSON objekt - žádný text před ani za
- NEPIŠ vysvětlení, komentáře, zdůvodnění
- NEPOUŽÍVEJ markdown code blocks
- POUZE čistý JSON: {"certain": [...], "uncertain": [...], "multiple_problems": false, "all_mentioned": [...]}
- ŽÁDNÝ další text - POUZE JSON objekt`;
}

// ============================================================================
// HLAVNÍ FUNKCE
// ============================================================================

/**
 * Klasifikuje zdravotní problém z uživatelské zprávy pomocí GPT
 * DYNAMICKY načítá kategorie problémů z Supabase!
 */
export async function classifyProblemFromUserMessage(userMessage: string): Promise<ProblemClassificationResult> {
  try {
    // Validace vstupu
    if (!userMessage || userMessage.trim().length === 0) {
      return {
        success: true,
        problems: []
      };
    }
    
    // KROK 1: Načti dostupné kategorie problémů z Supabase
    const availableProblems = await loadAvailableProblemsFromSupabase();
    
    if (availableProblems.length === 0) {
      return {
        success: true,
        problems: []
      };
    }
    // KROK 2: Vygeneruj system prompt s aktuálními kategoriemi
    const systemPrompt = generateSystemPrompt(availableProblems);
    
    // KROK 3: Zavolej GPT přes Edge Function
    const { data, error } = await supabase.functions.invoke(EDGE_FUNCTION_URL, {
      body: {
        systemPrompt: systemPrompt,
        userPrompt: `Klasifikuj zdravotní problém z následující zprávy uživatele. Vrať POUZE JSON array s názvem kategorie:\n\n"${userMessage}"`,
        model: 'anthropic/claude-3-haiku',
        temperature: 0.1,
        maxTokens: 200
      }
    });
    
    if (error) {
      throw new Error(`Edge Function chyba: ${error.message}`);
    }
    
    if (!data || !data.success) {
      throw new Error(data?.error || 'Edge Function vrátila chybu');
    }
    
    // Parsuj JSON response
    let problems: string[] = [];
    let uncertainProblems: string[] = [];
    let multipleProblems = false;
    let allMentionedProblems: string[] = [];
    
    try {
      const responseText = data.response || '';
      console.log('🧠 Raw response od agenta:', responseText);
      
      // Odstranit markdown code blocks pokud jsou
      let jsonText = responseText.trim();
      const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) || responseText.match(/(\{[\s\S]*\})/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }
      
      const parsed = JSON.parse(jsonText);
      
      // Formát: { "certain": [...], "uncertain": [...], "multiple_problems": bool, "all_mentioned": [...] }
      if (parsed && typeof parsed === 'object') {
        const certain = Array.isArray(parsed.certain) ? parsed.certain : [];
        const uncertain = Array.isArray(parsed.uncertain) ? parsed.uncertain : [];
        multipleProblems = parsed.multiple_problems === true;
        allMentionedProblems = Array.isArray(parsed.all_mentioned) ? parsed.all_mentioned : [];
        
        // 🛡️ VALIDACE: Zkontroluj, že všechny problémy jsou v availableProblems
        // Použij normalizovanou mapu pro tolerantní porovnání
        const normalizedMap = new Map<string, string>();
        availableProblems.forEach(p => {
          normalizedMap.set(normalizeString(p), p);
        });
        
        // Mapuj LLM odpovědi na originální názvy z DB
        problems = certain
          .map(p => normalizedMap.get(normalizeString(p)))
          .filter((p): p is string => p !== undefined);
          
        uncertainProblems = uncertain
          .map(p => normalizedMap.get(normalizeString(p)))
          .filter((p): p is string => p !== undefined);
        
        const invalidCertain = certain.filter(p => !normalizedMap.has(normalizeString(p)));
        const invalidUncertain = uncertain.filter(p => !normalizedMap.has(normalizeString(p)));
        
        // 🛡️ OCHRANA: certain může mít maximálně 1 položku (pravidlo promptu)
        // Pokud agent vrátí více, přesuneme vše do uncertain a zobrazíme dotazník
        if (problems.length > 1) {
          uncertainProblems = [...problems, ...uncertainProblems];
          problems = [];
        }

        if (multipleProblems) {
          console.log('🔀 Více problémů zmíněno:', allMentionedProblems);
        }
        if (problems.length > 0) {
          console.log('✅ Jisté problémy (certain):', problems);
        }
        if (uncertainProblems.length > 0) {
          console.log('❓ Nejisté problémy (uncertain):', uncertainProblems);
        }
        
        if (invalidCertain.length > 0) {
          console.warn('⚠️ Neplatné certain kategorie (nenalezeny v DB):', invalidCertain);
        }
        if (invalidUncertain.length > 0) {
          console.warn('⚠️ Neplatné uncertain kategorie (nenalezeny v DB):', invalidUncertain);
        }
      }
    } catch (parseError) {
      console.error('❌ Chyba parsování JSON odpovědi agenta:', parseError);
      problems = [];
      uncertainProblems = [];
    }
    
    const requiresUserSelection = uncertainProblems.length > 0 && problems.length === 0;
    if (uncertainProblems.length > 0) {
      console.log('📋 Vyžaduje výběr uživatele (requiresUserSelection):', requiresUserSelection);
    }
    
    const result = {
      success: true,
      problems: problems,
      uncertainProblems: uncertainProblems,
      requiresUserSelection: requiresUserSelection,
      multipleProblems: multipleProblems,
      allMentionedProblems: allMentionedProblems,
      rawResponse: data.response
    };
    
    console.log('🤖 Výsledek klasifikace agenta:', {
      certain: problems,
      uncertain: uncertainProblems,
      requiresUserSelection,
      multipleProblems,
      allMentioned: allMentionedProblems,
      rawResponse: data.response
    });
    
    return result;
    
  } catch (error) {
    return {
      success: false,
      problems: [],
      uncertainProblems: [],
      requiresUserSelection: false,
      multipleProblems: false,
      allMentionedProblems: [],
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Najde kombinace v tabulce leceni pro zadané problémy a EO
 */
export async function findCombinationsForProblemsAndEOs(
  problems: string[],
  productCodes: string[]
): Promise<any[]> {
  try {
    if (problems.length === 0 && productCodes.length === 0) {
      return [];
    }

    const { supabase: supabaseClient } = await import('../lib/supabase');

    // Načti všechny záznamy z leceni
    const { data: allRecords, error } = await supabaseClient
      .from('leceni')
      .select('*');

    if (error || !allRecords || allRecords.length === 0) {
      return [];
    }

    // Filtruj podle problémů
    let filtered = allRecords;
    
    if (problems.length > 0) {
      filtered = filtered.filter(record => {
        const recordProblem = record['Problém']?.toUpperCase() || '';
        return problems.some(p => recordProblem === p.toUpperCase());
      });
    }

    // Pokud máme product codes, najdi jejich názvy a filtruj i podle EO
    if (productCodes.length > 0) {
      const { data: products } = await supabaseClient
        .from('product_feed_2')
        .select('product_code, product_name')
        .in('product_code', productCodes);

      if (products && products.length > 0) {
        const productNames = products.map(p => 
          p.product_name.replace(/ esenciální olej$/i, '').toUpperCase()
        );

        filtered = filtered.filter(record => {
          const eo1 = record['EO 1']?.toUpperCase() || '';
          const eo2 = record['EO 2']?.toUpperCase() || '';
          const eo3 = record['EO 3']?.toUpperCase() || '';
          
          return productNames.some(name => 
            eo1.includes(name) || eo2.includes(name) || eo3.includes(name)
          );
        });
      }
    }
    return filtered;
  } catch (error) {
    return [];
  }
}

/**
 * Extrahuje produkty a doporučení z kombinací v leceni
 */
export function extractPairingProducts(combinations: any[]) {
  if (!combinations || combinations.length === 0) {
    return {
      prawteins: [],
      tcmWans: [],
      aloe: false,
      merkaba: false
    };
  }

  const prawteins = new Set<string>();
  const tcmWans = new Set<string>();
  let aloe = false;
  let merkaba = false;

  combinations.forEach(combination => {
    if (combination.Prawtein && combination.Prawtein.trim() !== '' && combination.Prawtein !== '–') {
      combination.Prawtein.split(',').forEach((p: string) => {
        const trimmed = p.trim();
        if (trimmed && trimmed !== '–') prawteins.add(trimmed);
      });
    }

    if (combination['TČM wan'] && combination['TČM wan'].trim() !== '' && combination['TČM wan'] !== '–') {
      tcmWans.add(combination['TČM wan'].trim());
    }

    if (combination.Aloe && combination.Aloe.trim() !== '' && combination.Aloe !== '–') {
      aloe = true;
    }

    if (combination.Merkaba && combination.Merkaba.trim() !== '' && combination.Merkaba !== '–' && combination.Merkaba.toLowerCase() === 'ano') {
      merkaba = true;
    }
  });

  return {
    prawteins: Array.from(prawteins),
    tcmWans: Array.from(tcmWans),
    aloe,
    merkaba
  };
}
