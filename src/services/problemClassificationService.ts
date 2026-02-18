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
  rawResponse?: string;
  error?: string;
}

// ============================================================================
// DYNAMICKÉ NAČÍTÁNÍ PROBLÉMŮ Z SUPABASE
// ============================================================================

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
      console.error('❌ Chyba při načítání problémů z leceni:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.warn('⚠️  Žádné problémy v tabulce leceni');
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
    
    console.log(`✅ Načteno ${problemsArray.length} kategorií problémů z Supabase`);
    console.log('📋 Kategorie:', problemsArray);
    
    return problemsArray;
    
  } catch (error) {
    console.error('❌ Kritická chyba při načítání problémů:', error);
    throw error;
  }
}

/**
 * Vygeneruje system prompt s aktuálními kategoriemi z Supabase
 */
function generateSystemPrompt(availableProblems: string[]): string {
  const problemsList = availableProblems.map(p => `- ${p}`).join('\n');
  
  return `Jsi lékařský expert specializující se na symptomy a zdravotní problémy.

Tvým úkolem je KLASIFIKOVAT zdravotní problém z textu uživatele podle těchto dostupných kategorií:

**DOSTUPNÉ KATEGORIE PROBLÉMŮ:**
${problemsList}

**PRAVIDLA KLASIFIKACE:**
1. Přečti si uživatelskou zprávu
2. Identifikuj zdravotní problém/symptom
3. Vyber POUZE kategorii, která se PŘESNĚ nachází v seznamu výše
4. NIKDY si nevymýšlej kategorie, které nejsou v seznamu
5. Můžeš vybrat VÍCE kategorií pokud uživatel popisuje více problémů
6. Pokud problém NENÍ PŘESNĚ v seznamu, vrať prázdné pole []

**PŘÍKLADY:**

Input: "Bolí mě hlava ze stresu a jsem přepracovaný"
Output: ["Bolest hlavy – ze stresu"]

Input: "Bolí mě hlava z přepracování"
Output: ["Bolest hlavy – ze stresu"]

Input: "Mám migrénové záchvaty"
Output: ["Migréna"]

Input: "Bolí mě koleno a ruka"
Output: ["Bolest kloubů – akutní"]

Input: "Boláček v zádech po sportování"
Output: ["Bolest svalů – přetížení"]

Input: "Bolí mě hlava a zub"
Output: ["Bolest hlavy – ze stresu", "Bolest zubů – akutní"]

Input: "Bolí mě dlouho hlava"
Output: ["Bolest hlavy – ze stresu"]
(POZOR: "Bolest hlavy – chronická" není v seznamu, proto vyber nejbližší EXISTUJÍCÍ kategorii)

Input: "Jak se máš?"
Output: []

Input: "Dobrý den, chtěl bych poradit"
Output: []

**KRITICKÉ PRAVIDLO PRO VÝSTUP:**
- Vrať VÝHRADNĚ validní JSON array - žádný text před ani za
- NEPIŠ vysvětlení, komentáře, zdůvodnění
- NEPOUŽÍVEJ markdown code blocks
- POUZE čistý JSON: ["kategorie1", "kategorie2"]
- Prázdný výsledek (žádný zdravotní problém): []
- ŽÁDNÝ další text - POUZE JSON array`;
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
    console.log('🔄 Načítám kategorie problémů z Supabase...');
    const availableProblems = await loadAvailableProblemsFromSupabase();
    
    if (availableProblems.length === 0) {
      console.warn('⚠️  Žádné kategorie problémů k dispozici');
      return {
        success: true,
        problems: []
      };
    }
    
    console.log(`✅ Načteno ${availableProblems.length} kategorií`);
    
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
    
    try {
      const responseText = data.response || '';
      
      // Odstranit markdown code blocks pokud jsou
      let jsonText = responseText.trim();
      const jsonMatch = responseText.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/) || responseText.match(/(\[[\s\S]*\])/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }
      
      problems = JSON.parse(jsonText);
      
      if (!Array.isArray(problems)) {
        problems = [];
      }
      
      // 🛡️ VALIDACE: Zkontroluj, že všechny problémy jsou v availableProblems
      const validProblems = problems.filter(p => availableProblems.includes(p));
      const invalidProblems = problems.filter(p => !availableProblems.includes(p));
      
      if (invalidProblems.length > 0) {
        console.warn('⚠️ LLM vrátilo neplatné problémy (ignoruji):', invalidProblems);
      }
      
      problems = validProblems;
    } catch (parseError) {
      console.error('❌ Chyba při parsování JSON:', parseError);
      problems = [];
    }
    
    console.log(`🔍 Klasifikované problémy:`, problems);
    
    return {
      success: true,
      problems: problems,
      rawResponse: data.response
    };
    
  } catch (error) {
    console.error('❌ Chyba při klasifikaci problému:', error);
    return {
      success: false,
      problems: [],
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
      console.error('❌ Chyba při načítání leceni:', error);
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

    console.log(`🔗 Nalezeno ${filtered.length} kombinací pro problémy:`, problems);
    
    return filtered;
  } catch (error) {
    console.error('❌ Chyba při hledání kombinací:', error);
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
