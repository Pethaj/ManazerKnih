/**
 * Inline Product Screening Service (Product Extractor)
 * 
 * Product Extractor - Agent pro identifikaci produktů/témat v textu odpovědi chatbota
 * Volá Supabase Edge Function, která používá OpenRouter GPT-4o-mini
 * související s čínskou medicínou a přírodní/alternativní medicínou
 * 
 * + Orchestrace párování kombinací produktů:
 *   1. Identifikace problému z user message (Problem Classifier)
 *   2. Extrakce produktů z bot response (Product Extractor)
 *   3. Párování kombinací podle tabulky leceni (Product Pairing Service)
 */

import { supabase } from '../lib/supabase';
import { classifyProblemFromUserMessage } from './problemClassificationService';
import { matchProductCombinations } from './productPairingService';

// ============================================================================
// KONFIGURACE
// ============================================================================

const EDGE_FUNCTION_URL = 'openrouter-proxy'; // Supabase Edge Function (používá fungující proxy)

// ============================================================================
// INTERFACES
// ============================================================================

export interface ScreeningResult {
  success: boolean;
  products: string[]; // Seznam názvů produktů/témat
  rawResponse?: string; // Pro debug
  error?: string;
}

/**
 * Výsledek kompletní orchestrace (problém + produkty + párování)
 */
export interface ProductScreeningWithPairingResult {
  success: boolean;
  
  // Krok 1: Identifikace problému
  problems: string[]; // Identifikované problémy z user message
  
  // Krok 2: Extrakce produktů
  extractedProducts: string[]; // Produkty extrahované z bot response
  
  // Krok 3: Párování kombinací (pokud je zapnuto)
  pairedProducts?: any[]; // Napárované produkty z leceni tabulky
  aloeRecommended?: boolean;
  merkabaRecommended?: boolean;
  
  // Debugging & errors
  rawResponse?: string;
  error?: string;
}

// ============================================================================
// SYSTEM PROMPT PRO PRODUCT SCREENING
// ============================================================================

const SYSTEM_PROMPT = `Jsi expert na tradiční čínskou medicínu a esenciální oleje BEWIT.

Tvým úkolem je identifikovat v textu POUZE **KONKRÉTNÍ NÁZVY PRODUKTŮ**.

**CO IDENTIFIKOVAT:**
1. **Názvy esenciálních olejů** - např. "LEVANDULE", "Levandule", "MÁTA PEPRNÁ", "Máta peprná", "KADIDLO", "Kadidlo", "DENT", "PEPPERMINT", "EUKALYPTUS"
2. **Názvy směsí** - např. "Imm", "Pure", "Relax", "MIG", "NOPA"
3. **České názvy rostlin/olejů** - např. "Bergamot", "Ylang-Ylang", "Heřmánek", "Tea Tree", "Čajovník", "Oregano", "Rozmarýn"
4. **Wany (čínské směsi)** - např. "009 - Čistý dech", "Shi Xiao Wan"
5. **Pinyin názvy** - např. "Te Xiao Bi Min Gan Wan", "Chuan Xiong Cha Tiao Wan"
6. **Produktové kódy** - např. "009", "033", "BEWIT KOKOSOVÝ OLEJ"
7. **Latinské názvy** - např. "Lavandula angustifolia", "Mentha piperita", "Citrus bergamia"
8. **PRAWTEINY (superpotravinové směsi)** - např. "PRAWTEIN Aloe Vera Plus", "PRAWTEIN Wofert", "PRAWTEIN Move It", "PRAWTEIN Woman M", "PRAWTEIN Acai Berry Plus", "PRAWTEIN Ava", "PRAWTEIN Alg" – produkty začínající na "PRAWTEIN" + název

**CO NEIDENTIFIKOVAT (IGNORUJ):**
❌ Obecné fráze typu: "svěží dech", "zdraví zubů", "bolest hlavy", "esenciální oleje"
❌ Účinky produktů: "antibakteriální", "protizánětlivé", "povzbuzující", "uklidňující"
❌ Tělesné části: "ústní dutina", "dásně", "zuby", "pokožka"
❌ Symptomy: "záněty", "citlivost", "paradontóza", "stres", "úzkost"
❌ Popisné fráze v kontextu "něco PRO X": "výplach PRO svěží dech", "pasta NA zuby", "olej PRO uklidnění"
❌ Obecná slova: "olej", "směs", "nosný olej", "kokosový olej" (pokud nejsou součástí názvu produktu).

**KLÍČOVÁ PRAVIDLA:**
- Identifikuj POUZE pokud je text **přímo název produktu/rostliny**, ne jeho účinek nebo použití
- Rozpoznávej názvy v JAKÉMKOLIV formátu: UPPERCASE, Title Case, lowercase
- Pokud vidíš frázi v kontextu "pro/na + X", IGNORUJ "X" (např. "voda pro svěží dech" → NEIDENTIFIKUJ "svěží dech")
- České i anglické názvy rostlin/olejů jsou platné (Levandule = Lavender, Máta = Peppermint)
- Pinyin názvy obvykle obsahují slova jako "Wan", "Tang", "Pian"
- Latinské názvy končí typicky na "-a", "-is", "-um" (např. Lavandula, officinalis)

**KRITICKÉ PRAVIDLO PRO VÝSTUP:**
- Vrať VÝHRADNĚ validní JSON array - žádný text před ani za
- NEPIŠ: "Zde je seznam...", "Produkty/wany:", "Zdravotní témata:", vysvětlení, komentáře
- NEPOUŽÍVEJ: markdown code blocks ani žádné formátování
- POUZE čistý JSON: ["produkt1", "produkt2"]
- Prázdný výsledek: []
- ŽÁDNÝ další text, žádné odstavce, žádné seznamy - POUZE JSON array

**PŘÍKLADY SPRÁVNÉHO VÝSTUPU:**

Input: "Doporučuji směs DENT pro ústní hygienu a PEPPERMINT."
Output: ["DENT", "PEPPERMINT"]

Input: "Levandule uklidňuje a Kadidlo pomáhá při meditaci."
Output: ["Levandule", "Kadidlo"]

Input: "Máta peprná (Mentha piperita) osvěžuje dech."
Output: ["Máta peprná", "Mentha piperita"]

Input: "Wan 009 - Čistý dech nebo Te Xiao Bi Min Gan Wan."
Output: ["009", "Te Xiao Bi Min Gan Wan"]

Input: "Olej z Bergamotu a Ylang-Ylang pro uklidnění."
Output: ["Bergamot", "Ylang-Ylang"]

Input: "Ústní voda pro svěží dech a zdraví zubů."
Output: []

Input: "Pomáhá při zánětech dásní a posiluje obranyschopnost."
Output: []

Input: "Doporučuji PRAWTEIN Aloe Vera Plus pro podporu imunity a PRAWTEIN Wofert pro harmonizaci."
Output: ["PRAWTEIN Aloe Vera Plus", "PRAWTEIN Wofert"]

Input: " Složení: Huang Qi, Gui PI"
Output: []`;

// ============================================================================
// HLAVNÍ FUNKCE dulezita
// ============================================================================

/**
 * Screenuje text na produkty/témata pomocí GPT mini
 * 
 * @param text - Text odpovědi z chatbota
 * @returns ScreeningResult s identifikovanými produkty
 */
export async function screenTextForProducts(text: string): Promise<ScreeningResult> {
  try {
    // Validace vstupu
    if (!text || text.trim().length === 0) {
      return {
        success: true,
        products: []
      };
    }
    
    // Pokud je text příliš krátký, není co screenovat
    if (text.trim().length < 20) {
      return {
        success: true,
        products: []
      };
    }
    
    
    // ✅ OPRAVENO: Posíláme systemPrompt a userPrompt místo { text }
    const { data, error } = await supabase.functions.invoke(EDGE_FUNCTION_URL, {
      body: {
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: `Analyzuj následující text a extrahuj POUZE názvy produktů (wanů, esenciálních olejů, PRAWTEINů, rostlin). Vrať POUZE JSON array:\n\n${text}`,
        model: 'anthropic/claude-3-haiku',
        temperature: 0.1,
        maxTokens: 500
      }
    });
    
    if (error) {
      throw new Error(`Edge Function chyba: ${error.message}`);
    }
    
    if (!data) {
      throw new Error('Edge Function nevrátila žádná data');
    }
    
    
    if (!data.success) {
      throw new Error(data.error || 'Edge Function vrátila chybu');
    }
    
    // ✅ OPRAVENO: Parsujeme `response` místo `products`
    // Edge Function vrací JSON string v `response` poli
    let products: string[] = [];
    
    try {
      const responseText = data.response || '';
      
      // Odstranit markdown code blocks pokud jsou
      let jsonText = responseText.trim();
      const jsonMatch = responseText.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/) || responseText.match(/(\[[\s\S]*\])/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }
      
      products = JSON.parse(jsonText);
      
      if (!Array.isArray(products)) {
        products = [];
      }
    } catch (parseError) {
      products = [];
    }
    
    
    return {
      success: true,
      products: products,
      rawResponse: data.response
    };
    
  } catch (error) {
    return {
      success: false,
      products: [],
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// ============================================================================
// ORCHESTRACE: Product Screening + Problem Classification + Pairing
// ============================================================================

/**
 * Kompletní orchestrace pro webhook událost:
 * 
 * FLOW:
 * 1. ⚡ Parallel: Identifikace problému (z user msg) + Extrakce produktů (z bot response)
 * 2. ⏳ Čekání na oba výsledky
 * 3. 🔗 Spuštění Product Pairing Service (pokud máme problém + produkty)
 * 
 * @param userMessage - Zpráva od uživatele (např. "bolí mě hlava")
 * @param botResponse - Odpověď chatbota (obsahuje zmínky o produktech)
 * @param enablePairing - Zapnuto párování kombinací? (z chatbot settings)
 * @returns Kompletní výsledek s problémem, produkty a napárovanými kombinacemi
 */
export async function screenProductsWithPairing(
  userMessage: string,
  botResponse: string,
  enablePairing: boolean = true
): Promise<ProductScreeningWithPairingResult> {
  
  console.log('🚀 Spouštím kompletní product screening s párováním...');
  console.log('📥 User message:', userMessage);
  console.log('📥 Bot response length:', botResponse.length);
  console.log('🔗 Párování zapnuto:', enablePairing);
  
  try {
    // ============================================================================
    // KROK 1: PARALLEL - Identifikace problému + Extrakce produktů
    // ============================================================================
    
    console.log('⚡ Spouštím parallel: Problem Classification + Product Extraction...');
    
    const [problemResult, productResult] = await Promise.all([
      // Agent 1: Problem Classifier
      classifyProblemFromUserMessage(userMessage),
      
      // Agent 2: Product Extractor
      screenTextForProducts(botResponse)
    ]);
    
    console.log('✅ Problem Classification dokončena:', problemResult.problems);
    console.log('✅ Product Extraction dokončena:', productResult.products);
    
    // ============================================================================
    // KROK 2: VALIDACE - Máme problém a produkty?
    // ============================================================================
    
    const hasProblems = problemResult.success && problemResult.problems.length > 0;
    const hasProducts = productResult.success && productResult.products.length > 0;
    
    if (!hasProblems) {
      console.log('⚠️ Žádný problém identifikován - párování nebude spuštěno');
    }
    
    if (!hasProducts) {
      console.log('⚠️ Žádné produkty extrahovány - párování nebude spuštěno');
    }
    
    // Základní výsledek bez párování
    const result: ProductScreeningWithPairingResult = {
      success: true,
      problems: problemResult.problems,
      extractedProducts: productResult.products,
      rawResponse: productResult.rawResponse
    };
    
    // ============================================================================
    // KROK 3: PÁROVÁNÍ - Pouze pokud máme problém + produkty + je zapnuto
    // ============================================================================
    
    if (enablePairing && hasProblems && hasProducts) {
      console.log('🔗 Spouštím Product Pairing Service...');
      console.log('📋 Vstup - Problémy:', problemResult.problems);
      console.log('📋 Vstup - Produkty:', productResult.products);
      
      try {
        // Najdi product_code pro extrahované produkty
        const productCodes = await findProductCodesByNames(productResult.products);
        
        if (productCodes.length === 0) {
          console.log('⚠️ Žádné product_code nalezeny pro extrahované produkty');
          return result;
        }
        
        console.log('🔍 Nalezené product_code:', productCodes);
        
        // Spusť párování kombinací
        const pairingResult = await matchProductCombinations(productCodes);
        
        result.pairedProducts = pairingResult.products;
        result.aloeRecommended = pairingResult.aloe;
        result.merkabaRecommended = pairingResult.merkaba;
        
        console.log('✅ Product Pairing dokončeno:');
        console.log('   - Napárované produkty:', pairingResult.products.length);
        console.log('   - Aloe doporučeno:', pairingResult.aloe);
        console.log('   - Merkaba doporučeno:', pairingResult.merkaba);
        
      } catch (pairingError) {
        console.error('❌ Chyba při párování kombinací:', pairingError);
        // Nepřerušujeme - vracíme alespoň základní výsledek
      }
    }
    
    console.log('🎉 Kompletní screening dokončen!');
    return result;
    
  } catch (error) {
    console.error('❌ Kritická chyba v product screening orchestraci:', error);
    return {
      success: false,
      problems: [],
      extractedProducts: [],
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Helper: Najde product_code v databázi podle názvů produktů
 * 
 * @param productNames - Názvy produktů extrahované z textu
 * @returns Pole product_code
 */
async function findProductCodesByNames(productNames: string[]): Promise<string[]> {
  if (productNames.length === 0) {
    return [];
  }
  
  console.log('🔍 Hledám product_code pro názvy:', productNames);
  
  try {
    // Hledej v product_feed_2 (obsahuje esenciální oleje, prawteiny, TČM)
    const { data, error } = await supabase
      .from('product_feed_2')
      .select('product_code, product_name');
    
    if (error) {
      console.error('❌ Chyba při načítání product_feed_2:', error);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.log('⚠️ Žádné produkty v product_feed_2');
      return [];
    }
    
    // Matching logika: Fuzzy match (case-insensitive, obsahuje)
    const productCodes: string[] = [];
    
    productNames.forEach(extractedName => {
      const normalizedExtracted = extractedName.toLowerCase().trim();
      
      // Najdi produkt, jehož název obsahuje extrahovaný název
      const matchedProduct = data.find(product => {
        const normalizedProductName = product.product_name.toLowerCase();
        
        // Match 1: Extrahovaný název je obsažen v product_name
        if (normalizedProductName.includes(normalizedExtracted)) {
          return true;
        }
        
        // Match 2: Product_name je obsažen v extrahovaném názvu
        if (normalizedExtracted.includes(normalizedProductName)) {
          return true;
        }
        
        // Match 3: Odstranit "esenciální olej", "BEWIT", "PRAWTEIN" a zkusit znovu
        const cleanedProductName = normalizedProductName
          .replace(/esenciální olej/gi, '')
          .replace(/bewit/gi, '')
          .replace(/prawtein/gi, '')
          .trim();
        
        const cleanedExtracted = normalizedExtracted
          .replace(/esenciální olej/gi, '')
          .replace(/bewit/gi, '')
          .replace(/prawtein/gi, '')
          .trim();
        
        return cleanedProductName === cleanedExtracted || 
               cleanedProductName.includes(cleanedExtracted) ||
               cleanedExtracted.includes(cleanedProductName);
      });
      
      if (matchedProduct) {
        console.log(`   ✅ Match: "${extractedName}" → ${matchedProduct.product_code} (${matchedProduct.product_name})`);
        productCodes.push(matchedProduct.product_code);
      } else {
        console.log(`   ❌ No match: "${extractedName}"`);
      }
    });
    
    return [...new Set(productCodes)]; // Deduplikace
    
  } catch (error) {
    console.error('❌ Chyba při hledání product_code:', error);
    return [];
  }
}

// ============================================================================
// TEST FUNKCE
// ============================================================================

/**
 * Testovací funkce pro ověření funkčnosti
 */
export async function testProductScreening(): Promise<void> {
  // Test funkce - lze použít pro debugging
}

/**
 * Testovací funkce pro kompletní orchestraci
 * 
 * Použití:
 * import { testProductScreeningWithPairing } from './services/inlineProductScreeningService';
 * await testProductScreeningWithPairing();
 */
export async function testProductScreeningWithPairing(): Promise<void> {
  console.log('🧪 TEST: Product Screening s párováním');
  console.log('='.repeat(60));
  
  // Testovací data
  const userMessage = "Bolí mě hlava ze stresu a jsem přepracovaný";
  const botResponse = `
    Doporučuji vám LEVANDULE esenciální olej pro uklidnění a KADIDLO pro meditaci.
    Můžete také zkusit směs RELAX nebo NOPA pro podporu nervového systému.
    PRAWTEIN Aloe Vera Plus může pomoct s regenerací.
  `;
  const enablePairing = true;
  
  console.log('📥 User message:', userMessage);
  console.log('📥 Bot response:', botResponse.trim());
  console.log('🔗 Párování:', enablePairing);
  console.log('='.repeat(60));
  
  const result = await screenProductsWithPairing(
    userMessage,
    botResponse,
    enablePairing
  );
  
  console.log('='.repeat(60));
  console.log('📤 VÝSLEDEK:');
  console.log('='.repeat(60));
  console.log('✅ Success:', result.success);
  console.log('');
  console.log('🔍 Identifikované problémy:', result.problems);
  console.log('📦 Extrahované produkty:', result.extractedProducts);
  console.log('');
  
  if (result.pairedProducts && result.pairedProducts.length > 0) {
    console.log('🔗 Napárované produkty:');
    result.pairedProducts.forEach(p => {
      console.log(`   - ${p.matched_product_name} (${p.matched_category})`);
    });
    console.log('');
    console.log('💧 Aloe doporučeno:', result.aloeRecommended ? '✅ ANO' : '❌ NE');
    console.log('✨ Merkaba doporučeno:', result.merkabaRecommended ? '✅ ANO' : '❌ NE');
  } else {
    console.log('⚠️ Žádné napárované produkty');
  }
  
  if (result.error) {
    console.log('');
    console.log('❌ Error:', result.error);
  }
  
  console.log('='.repeat(60));
}

