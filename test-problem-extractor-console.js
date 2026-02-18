// ============================================================================
// TESTOVÁNÍ REÁLNÉHO PROBLEM EXTRACTOR AGENTA
// ============================================================================
// Tento skript volá SKUTEČNÝ GPT agent přes Edge Function
// ŽÁDNÁ SIMULACE - pouze reálné API volání

// ============================================================================
// SUPABASE CLIENT SETUP
// ============================================================================

const SUPABASE_URL = 'https://modopafybeslbcqjxsve.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZG9wYWZ5YmVzbGJjcWp4c3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNTM0MjEsImV4cCI6MjA3MDgyOTQyMX0.8gxL0b9flTUyoltiEIJx8Djuiyx16rySlffHkd_nm1U';

// Import Supabase z CDN
const supabaseLib = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
const supabase = supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

console.log('%c✅ Supabase client inicializován', 'color: #10B981; font-weight: bold;');

// ============================================================================
// DYNAMICKÉ NAČÍTÁNÍ PROBLÉMŮ Z SUPABASE
// ============================================================================

/**
 * Načte VŠECHNY unikátní problémy z tabulky leceni v Supabase
 * REÁLNÁ DATA - žádná simulace!
 */
async function loadAvailableProblemsFromSupabase() {
  try {
    console.log('%c🔄 Načítám kategorie problémů z Supabase...', 'color: #3B82F6; font-weight: bold;');
    
    // Načti sloupec "Problém" ze všech záznamů
    const { data, error } = await supabase
      .from('leceni')
      .select('Problém');
    
    if (error) {
      console.error('%c❌ Chyba při načítání z Supabase:', 'color: #EF4444; font-weight: bold;', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.warn('%c⚠️  Žádné záznamy v tabulce leceni', 'color: #F59E0B; font-weight: bold;');
      return [];
    }
    
    console.log(`%c✅ Načteno ${data.length} záznamů z leceni`, 'color: #10B981; font-weight: bold;');
    
    // Extrahuj unikátní problémy (můžou se opakovat v různých kombinacích)
    const problems = new Set();
    
    data.forEach(row => {
      const problem = row['Problém'];
      if (problem && typeof problem === 'string' && problem.trim() !== '') {
        problems.add(problem.trim());
      }
    });
    
    const problemsArray = Array.from(problems);
    
    console.log(`%c✅ Nalezeno ${problemsArray.length} unikátních kategorií problémů`, 'color: #10B981; font-weight: bold;');
    console.log('%c📋 Kategorie:', 'color: #6B7280; font-weight: bold;', problemsArray);
    
    return problemsArray;
    
  } catch (error) {
    console.error('%c❌ Kritická chyba při načítání problémů:', 'color: #EF4444; font-weight: bold;', error);
    throw error;
  }
}

// ============================================================================
// DOSTUPNÉ KATEGORIE PROBLÉMŮ (budou načteny dynamicky z Supabase)
// ============================================================================

let leceniProblems = []; // Naplní se při prvním spuštění

/**
 * Vygeneruje system prompt s aktuálními kategoriemi z Supabase
 */
function generateSystemPrompt(availableProblems) {
  const problemsList = availableProblems.map(p => `- ${p}`).join('\n');
  
  return `Jsi lékařský expert specializující se na symptomy a zdravotní problémy.

Tvým úkolem je KLASIFIKOVAT zdravotní problém z textu uživatele podle těchto dostupných kategorií:

**DOSTUPNÉ KATEGORIE PROBLÉMŮ:**
${problemsList}

**PRAVIDLA KLASIFIKACE:**
1. Přečti si uživatelskou zprávu
2. Identifikuj zdravotní problém/symptom
3. Vyber NEJPŘESNĚJŠÍ kategorii ze seznamu výše
4. Pokud není přesná shoda, vyber NEJBLIŽŠÍ obecnější kategorii
5. Můžeš vybrat VÍCE kategorií pokud uživatel popisuje více problémů
6. Pokud problém není v seznamu, vrať prázdné pole []

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
Output: ["Bolest hlavy – nervová", "Bolest zubů – akutní"]

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
// REÁLNÝ PROBLEM CLASSIFIER - VOLÁ GPT PŘES EDGE FUNCTION
// ============================================================================

/**
 * Klasifikuje zdravotní problém z uživatelské zprávy pomocí REÁLNÉHO GPT
 * DYNAMICKY načítá kategorie z Supabase!
 */
async function classifyProblemFromUserMessage(userMessage) {
  console.log('%c🤖 VOLÁNÍ REÁLNÉHO GPT AGENTA...', 'color: #8B5CF6; font-weight: bold; font-size: 14px; background: #F5F3FF; padding: 8px; border-radius: 4px;');
  console.log('');
  console.log('%c📡 Edge Function: openrouter-proxy', 'color: #3B82F6; font-weight: bold;');
  console.log('%c🤖 Model: anthropic/claude-3-haiku', 'color: #3B82F6; font-weight: bold;');
  console.log('');
  
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
      console.warn('%c⚠️  Žádné kategorie problémů k dispozici', 'color: #F59E0B; font-weight: bold;');
      return {
        success: true,
        problems: []
      };
    }
    
    // Aktualizuj globální proměnnou pro validaci
    leceniProblems = availableProblems;
    
    // KROK 2: Vygeneruj system prompt s aktuálními kategoriemi
    const systemPrompt = generateSystemPrompt(availableProblems);
    
    console.log(`%c📚 Počet dostupných kategorií: ${availableProblems.length}`, 'color: #3B82F6; font-weight: bold;');
    console.log('');
    
    // KROK 3: REÁLNÉ VOLÁNÍ SUPABASE EDGE FUNCTION
    console.log('%c⏳ Odesílám request...', 'color: #F59E0B; font-style: italic;');
    
    const startTime = Date.now();
    
    const { data, error } = await supabase.functions.invoke('openrouter-proxy', {
      body: {
        systemPrompt: systemPrompt,
        userPrompt: `Klasifikuj zdravotní problém z následující zprávy uživatele. Vrať POUZE JSON array s názvem kategorie:\n\n"${userMessage}"`,
        model: 'anthropic/claude-3-haiku',
        temperature: 0.1,
        maxTokens: 200
      }
    });
    
    const responseTime = Date.now() - startTime;
    console.log(`%c✅ Response obdržena za ${responseTime}ms`, 'color: #10B981; font-weight: bold;');
    console.log('');
    
    if (error) {
      throw new Error(`Edge Function chyba: ${error.message}`);
    }
    
    if (!data || !data.success) {
      throw new Error(data?.error || 'Edge Function vrátila chybu');
    }
    
    // Parsuj JSON response
    let problems = [];
    
    try {
      const responseText = data.response || '';
      
      console.log('%c📄 Raw GPT response:', 'color: #6B7280; font-weight: bold;');
      console.log(responseText);
      console.log('');
      
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
    } catch (parseError) {
      console.error('%c❌ Chyba při parsování JSON:', 'color: #EF4444; font-weight: bold;', parseError);
      problems = [];
    }
    
    return {
      success: true,
      problems: problems,
      rawResponse: data.response,
      responseTime
    };
    
  } catch (error) {
    console.error('%c❌ Chyba při volání GPT agenta:', 'color: #EF4444; font-weight: bold;', error);
    return {
      success: false,
      problems: [],
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Validuje, že klasifikované problémy existují v tabulce leceni
 */
function validateProblems(problems) {
  const valid = [];
  const invalid = [];
  
  problems.forEach(problem => {
    if (leceniProblems.includes(problem)) {
      valid.push(problem);
    } else {
      invalid.push(problem);
    }
  });
  
  return { valid, invalid };
}

// ============================================================================
// HLAVNÍ TESTOVACÍ FUNKCE
// ============================================================================

/**
 * TESTUJE REÁLNÉHO PROBLEM EXTRACTOR AGENTA
 * Volá skutečný GPT přes Edge Function - ŽÁDNÁ SIMULACE!
 */
async function testProblemExtractor(userMessage) {
  console.clear();
  console.log('%c═══════════════════════════════════════════════════════════', 'color: #8B5CF6; font-weight: bold;');
  console.log('%c🧪 TEST: REÁLNÝ PROBLEM EXTRACTOR AGENT', 'color: #8B5CF6; font-weight: bold; font-size: 20px;');
  console.log('%c═══════════════════════════════════════════════════════════', 'color: #8B5CF6; font-weight: bold;');
  console.log('');
  console.log('%c📝 USER MESSAGE:', 'color: #3B82F6; font-weight: bold; font-size: 16px;');
  console.log(`   "${userMessage}"`);
  console.log('');
  console.log('%c═══════════════════════════════════════════════════════════', 'color: #E5E7EB;');
  console.log('');
  
  try {
    // VOLÁNÍ REÁLNÉHO GPT AGENTA
    const result = await classifyProblemFromUserMessage(userMessage);
    
    if (!result.success) {
      console.log('%c❌ CHYBA při klasifikaci', 'color: #EF4444; font-weight: bold; font-size: 16px;');
      console.log('');
      console.log(`%c   ${result.error}`, 'color: #EF4444;');
      return;
    }
    
    // Zobraz výsledky
    console.log('%c═══════════════════════════════════════════════════════════', 'color: #10B981; font-weight: bold;');
    console.log('%c✅ VÝSLEDKY REÁLNÉ KLASIFIKACE', 'color: #10B981; font-weight: bold; font-size: 18px;');
    console.log('%c═══════════════════════════════════════════════════════════', 'color: #10B981; font-weight: bold;');
    console.log('');
    
    if (result.problems.length === 0) {
      console.log('%cℹ️  ŽÁDNÝ PROBLÉM NEBYL IDENTIFIKOVÁN GPT AGENTEM', 'color: #F59E0B; font-weight: bold; font-size: 14px; background: #FEF3C7; padding: 8px; border-radius: 4px;');
      console.log('');
      console.log('%c💡 Možné důvody:', 'color: #F59E0B; font-weight: bold;');
      console.log('   - Uživatel nepopisuje zdravotní problém');
      console.log('   - Problém není v dostupných kategoriích');
      console.log('   - Text je příliš obecný nebo nejasný');
      console.log('');
    } else {
      console.log('%c🎯 IDENTIFIKOVANÉ PROBLÉMY (od GPT):', 'color: #10B981; font-weight: bold; font-size: 16px;');
      console.log('');
      result.problems.forEach((problem, index) => {
        console.log(`%c   ${index + 1}. ${problem}`, 'color: #10B981; font-weight: bold; font-size: 14px; background: #F0FDF4; padding: 6px; margin: 4px 0; border-left: 4px solid #10B981;');
      });
      console.log('');
      
      // Validace proti tabulce leceni
      const validation = validateProblems(result.problems);
      
      console.log('%c═══════════════════════════════════════════════════════════', 'color: #3B82F6; font-weight: bold;');
      console.log('%c🔍 VALIDACE PROTI TABULCE LECENI', 'color: #3B82F6; font-weight: bold; font-size: 16px;');
      console.log('%c═══════════════════════════════════════════════════════════', 'color: #3B82F6; font-weight: bold;');
      console.log('');
      
      if (validation.valid.length > 0) {
        console.log('%c✅ VALIDNÍ PROBLÉMY (existují v leceni):', 'color: #10B981; font-weight: bold;');
        validation.valid.forEach(p => {
          console.log(`   ✓ ${p}`);
        });
        console.log('');
      }
      
      if (validation.invalid.length > 0) {
        console.log('%c❌ NEVALIDNÍ PROBLÉMY (NEEXISTUJÍ v leceni):', 'color: #EF4444; font-weight: bold;');
        validation.invalid.forEach(p => {
          console.log(`   ✗ ${p}`);
        });
        console.log('');
        console.log('%c⚠️  VAROVÁNÍ: GPT vrátil kategorii, která není v tabulce leceni!', 'color: #F59E0B; font-weight: bold; background: #FEF3C7; padding: 8px; border-radius: 4px;');
        console.log('');
      }
      
      // Ukázka dalšího kroku
      if (validation.valid.length > 0) {
        console.log('%c═══════════════════════════════════════════════════════════', 'color: #6366F1; font-weight: bold;');
        console.log('%c➡️  DALŠÍ KROK V WORKFLOW', 'color: #6366F1; font-weight: bold; font-size: 16px;');
        console.log('%c═══════════════════════════════════════════════════════════', 'color: #6366F1; font-weight: bold;');
        console.log('');
        console.log('%c   Pro tyto problémy se nyní najdou kombinace v tabulce leceni', 'color: #6366F1; font-style: italic;');
        console.log('%c   a doporučí se odpovídající produkty (Prawtein, TČM, Aloe, Merkaba)', 'color: #6366F1; font-style: italic;');
        console.log('');
      }
    }
    
    // Statistiky
    console.log('%c═══════════════════════════════════════════════════════════', 'color: #9CA3AF;');
    console.log('%c📊 STATISTIKY', 'color: #6B7280; font-weight: bold;');
    console.log('%c═══════════════════════════════════════════════════════════', 'color: #9CA3AF;');
    console.log('');
    console.log(`   ⏱️  Response time: ${result.responseTime}ms`);
    console.log(`   🎯 Počet identifikovaných problémů: ${result.problems.length}`);
    console.log(`   ✅ Validní problémy: ${validateProblems(result.problems).valid.length}`);
    console.log(`   ❌ Nevalidní problémy: ${validateProblems(result.problems).invalid.length}`);
    console.log('');
    
    // Zobraz dostupné kategorie pro referenci
    console.log('%c═══════════════════════════════════════════════════════════', 'color: #9CA3AF;');
    console.log('%c📚 DOSTUPNÉ KATEGORIE V TABULCE LECENI', 'color: #6B7280; font-weight: bold;');
    console.log('%c═══════════════════════════════════════════════════════════', 'color: #9CA3AF;');
    console.log('');
    leceniProblems.forEach((problem, index) => {
      console.log(`   ${index + 1}. ${problem}`);
    });
    console.log('');
    
    // Vrat strukturovaný výsledek
    return {
      userMessage,
      detectedProblems: result.problems,
      validation: validateProblems(result.problems),
      responseTime: result.responseTime,
      rawResponse: result.rawResponse,
      nextSteps: validateProblems(result.problems).valid.length > 0 
        ? 'Pokračovat na hledání kombinací v tabulce leceni'
        : 'Nelze pokračovat - žádné validní problémy'
    };
    
  } catch (error) {
    console.error('%c❌ KRITICKÁ CHYBA:', 'color: #EF4444; font-weight: bold;', error);
    throw error;
  }
}

/**
 * Dávkové testování více zpráv najednou
 */
async function testMultipleMessages(messages) {
  console.clear();
  console.log('%c🎯 DÁVKOVÝ TEST - VÍCE ZPRÁV (REÁLNÝ GPT)', 'color: #8B5CF6; font-weight: bold; font-size: 18px;');
  console.log('');
  
  const results = [];
  
  for (let i = 0; i < messages.length; i++) {
    console.log(`%c[${i + 1}/${messages.length}] Testuji: "${messages[i]}"`, 'color: #3B82F6; font-weight: bold;');
    
    const result = await testProblemExtractor(messages[i]);
    results.push(result);
    
    if (i < messages.length - 1) {
      console.log('%c─────────────────────────────────────────────', 'color: #E5E7EB;');
      console.log('%c⏳ Čekám 2s před dalším testem...', 'color: #F59E0B; font-style: italic;');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Souhrn
  console.clear();
  console.log('%c═══════════════════════════════════════════════════════════', 'color: #8B5CF6; font-weight: bold;');
  console.log('%c📊 SOUHRN DÁVKOVÉHO TESTU (REÁLNÝ GPT)', 'color: #8B5CF6; font-weight: bold; font-size: 20px;');
  console.log('%c═══════════════════════════════════════════════════════════', 'color: #8B5CF6; font-weight: bold;');
  console.log('');
  
  results.forEach((result, index) => {
    console.log(`%c${index + 1}. "${result.userMessage}"`, 'color: #3B82F6; font-weight: bold;');
    if (result.detectedProblems.length > 0) {
      console.log(`   ✅ Identifikováno: ${result.detectedProblems.join(', ')}`);
      console.log(`   ⏱️  ${result.responseTime}ms`);
    } else {
      console.log('   ℹ️  Žádný problém nebyl identifikován');
    }
    console.log('');
  });
  
  const totalMessages = results.length;
  const messagesWithProblems = results.filter(r => r.detectedProblems.length > 0).length;
  const messagesWithoutProblems = totalMessages - messagesWithProblems;
  const avgResponseTime = Math.round(results.reduce((sum, r) => sum + r.responseTime, 0) / totalMessages);
  
  console.log('%c═══════════════════════════════════════════════════════════', 'color: #10B981; font-weight: bold;');
  console.log(`%c✅ Úspěšnost: ${messagesWithProblems}/${totalMessages} zpráv mělo identifikované problémy`, 'color: #10B981; font-weight: bold; font-size: 14px;');
  console.log(`%cℹ️  Bez problémů: ${messagesWithoutProblems}/${totalMessages} zpráv`, 'color: #F59E0B; font-weight: bold; font-size: 14px;');
  console.log(`%c⏱️  Průměrný response time: ${avgResponseTime}ms`, 'color: #3B82F6; font-weight: bold; font-size: 14px;');
  console.log('%c═══════════════════════════════════════════════════════════', 'color: #10B981; font-weight: bold;');
  
  return results;
}

// ============================================================================
// EXPORT FUNKCÍ DO WINDOW
// ============================================================================

window.testProblemExtractor = testProblemExtractor;
window.testMultipleMessages = testMultipleMessages;
window.leceniProblems = leceniProblems;

// ============================================================================
// STARTUP MESSAGE
// ============================================================================

console.clear();
console.log('%c═══════════════════════════════════════════════════════════', 'color: #8B5CF6; font-weight: bold;');
console.log('%c🚀 REÁLNÝ PROBLEM EXTRACTOR AGENT - TESTOVACÍ SKRIPT', 'color: #8B5CF6; font-weight: bold; font-size: 18px;');
console.log('%c═══════════════════════════════════════════════════════════', 'color: #8B5CF6; font-weight: bold;');
console.log('');
console.log('%c✅ Skript úspěšně načten', 'color: #10B981; font-weight: bold;');
console.log('%c✅ Supabase client připojen', 'color: #10B981; font-weight: bold;');
console.log('%c🤖 Připraveno volat REÁLNÉHO GPT agenta', 'color: #8B5CF6; font-weight: bold;');
console.log('');
console.log('%c⚠️  POZOR: Tento skript volá SKUTEČNÝ GPT agent!', 'color: #F59E0B; font-weight: bold; background: #FEF3C7; padding: 8px; border-radius: 4px;');
console.log('%c   Každé volání stojí tokeny/peníze', 'color: #F59E0B;');
console.log('');
console.log('%c═══════════════════════════════════════════════════════════', 'color: #3B82F6; font-weight: bold;');
console.log('%c📖 POUŽITÍ - ZÁKLADNÍ TEST', 'color: #3B82F6; font-weight: bold; font-size: 16px;');
console.log('%c═══════════════════════════════════════════════════════════', 'color: #3B82F6; font-weight: bold;');
console.log('');
console.log('%c  await testProblemExtractor("Bolí mě hlava ze stresu")', 'color: #10B981; font-size: 14px; font-weight: bold; background: #F0FDF4; padding: 8px; border-radius: 4px;');
console.log('');
console.log('%c  await testProblemExtractor("Mám migrénové záchvaty")', 'color: #10B981; font-size: 14px; font-weight: bold; background: #F0FDF4; padding: 8px; border-radius: 4px;');
console.log('');
console.log('%c  await testProblemExtractor("Boláček v koleni po sportování")', 'color: #10B981; font-size: 14px; font-weight: bold; background: #F0FDF4; padding: 8px; border-radius: 4px;');
console.log('');
console.log('%c═══════════════════════════════════════════════════════════', 'color: #6366F1; font-weight: bold;');
console.log('%c📖 POUŽITÍ - DÁVKOVÝ TEST', 'color: #6366F1; font-weight: bold; font-size: 16px;');
console.log('%c═══════════════════════════════════════════════════════════', 'color: #6366F1; font-weight: bold;');
console.log('');
console.log('%c  await testMultipleMessages([', 'color: #6366F1; font-size: 14px; font-weight: bold;');
console.log('%c    "Bolí mě hlava",', 'color: #6366F1; font-size: 14px;');
console.log('%c    "Mám migrénové záchvaty",', 'color: #6366F1; font-size: 14px;');
console.log('%c    "Bolest kolena"', 'color: #6366F1; font-size: 14px;');
console.log('%c  ])', 'color: #6366F1; font-size: 14px; font-weight: bold;');
console.log('');
console.log('%c═══════════════════════════════════════════════════════════', 'color: #F59E0B; font-weight: bold;');
console.log('%c💡 PŘÍKLADY TEXTŮ PRO TESTOVÁNÍ', 'color: #F59E0B; font-weight: bold; font-size: 16px;');
console.log('%c═══════════════════════════════════════════════════════════', 'color: #F59E0B; font-weight: bold;');
console.log('');
console.log('%c  Bolest hlavy:', 'color: #F59E0B; font-weight: bold;');
console.log('    - "Bolí mě hlava ze stresu"');
console.log('    - "Jsem přepracovaný a bolí mě hlava"');
console.log('    - "Mám nervovou bolest hlavy"');
console.log('');
console.log('%c  Migréna:', 'color: #F59E0B; font-weight: bold;');
console.log('    - "Mám migrénové záchvaty"');
console.log('    - "Trpím migrénou"');
console.log('');
console.log('%c  Bolest kloubů:', 'color: #F59E0B; font-weight: bold;');
console.log('    - "Bolí mě koleno"');
console.log('    - "Mám chronickou bolest kloubů"');
console.log('    - "Zánět v rameni"');
console.log('');
console.log('%c  Bolest svalů:', 'color: #F59E0B; font-weight: bold;');
console.log('    - "Svalové křeče"');
console.log('    - "Bolí mě záda po sportování"');
console.log('    - "Záboly v zádech po cvičení"');
console.log('');
console.log('%c  Ostatní:', 'color: #F59E0B; font-weight: bold;');
console.log('    - "Bolest zubů"');
console.log('    - "Akutní bolest"');
console.log('');
console.log('%c═══════════════════════════════════════════════════════════', 'color: #9CA3AF;');
console.log('%c📋 DOSTUPNÉ KATEGORIE', 'color: #9CA3AF; font-weight: bold; font-size: 14px;');
console.log('%c═══════════════════════════════════════════════════════════', 'color: #9CA3AF;');
console.log('');
console.log('%c  Pro zobrazení seznamu dostupných kategorií:', 'color: #6B7280;');
console.log('%c    leceniProblems', 'color: #6B7280; font-family: monospace; background: #F3F4F6; padding: 4px 8px; border-radius: 4px;');
console.log('');
