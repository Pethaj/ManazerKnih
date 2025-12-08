/**
 * Product Funnel Service
 * ============================================================================
 * 🎯 PRODUKTOVÝ FUNNEL PRO WANY CHAT
 * ============================================================================
 * 
 * VEŠKERÁ LOGIKA JE TADY (ne v Edge Function):
 * - System prompty
 * - User prompty
 * - Parsování odpovědí
 * - Business logika
 * 
 * Edge Function je jen proxy pro OpenRouter API.
 */

import { supabase } from '../lib/supabase';

// ============================================================================
// INTERFACES
// ============================================================================

export interface FunnelProduct {
  product_code: string;
  product_name: string;
  description?: string;
  description_short?: string;
  description_long?: string;
  price?: number;
  currency?: string;
  url?: string;
  thumbnail?: string;
  category?: string;
}

export interface FunnelRequest {
  symptomList: string[];
  recommendedProducts: FunnelProduct[];
  userMessage: string;
  conversationContext?: string;
}

export interface FunnelResponse {
  success: boolean;
  selectedProducts: FunnelProduct[];
  funnelText: string;
  error?: string;
}

// ============================================================================
// KONFIGURACE
// ============================================================================

const EDGE_FUNCTION_URL = 'openrouter-proxy';  // Nová dedikovaná Edge Function
const MODEL = 'anthropic/claude-3-haiku';  // ✅ OPRAVENO: Správný model ID pro OpenRouter
const TEMPERATURE = 0.4;
const MAX_TOKENS = 1500;

// ============================================================================
// SYSTEM PROMPT PRO PRODUCT FUNNEL
// ============================================================================

const PRODUCT_FUNNEL_SYSTEM_PROMPT = `Jsi expert na tradiční čínskou medicínu (TČM) a produkty BEWIT.

## TVŮJ ÚKOL
Na základě symptomů uživatele vyber 2 NEJLEPŠÍ produkty z poskytnutého seznamu a vytvoř detailní doporučení.

## PRAVIDLA
1. Vyber PŘESNĚ 2 produkty, které nejlépe odpovídají symptomům
2. Pro každý produkt vysvětli PROČ je vhodný pro dané symptomy
3. Uveď jak produkt používat
4. Buď konkrétní a praktický
5. Piš v češtině, přátelským tónem

## FORMÁT ODPOVĚDI
Vrať POUZE validní JSON objekt (bez markdown, bez \`\`\`):
{
  "selectedProductCodes": ["kód1", "kód2"],
  "recommendation": "Markdown text s detailním doporučením obou produktů"
}

## PŘÍKLAD RECOMMENDATION TEXTU
"## 🎯 Doporučení na míru

Na základě vašich symptomů (**bolest hlavy**, **únava**) jsem vybral tyto 2 produkty:

### 1. 009 - Čistý dech
Tento wan je ideální pro vaše potíže, protože...
**Jak používat:** 2-3 kuličky 2x denně...

### 2. 004 - Eliminace větru  
Výborně pomáhá při bolestech hlavy, protože...
**Jak používat:** 2 kuličky ráno a večer..."`;

// ============================================================================
// HLAVNÍ FUNKCE
// ============================================================================

/**
 * Spustí produktový funnel
 */
export async function runProductFunnel(
  symptomList: string[],
  recommendedProducts: FunnelProduct[],
  userMessage: string,
  conversationContext?: string
): Promise<FunnelResponse> {
  const startTime = performance.now();
  
  console.log('%c═══════════════════════════════════════════════════════════════════', 'color: #F59E0B; font-weight: bold;');
  console.log('%c🎯 PRODUCT FUNNEL - START', 'color: #F59E0B; font-weight: bold; font-size: 14px;');
  console.log('%c═══════════════════════════════════════════════════════════════════', 'color: #F59E0B; font-weight: bold;');
  
  console.log('%c───────────────────────────────────────────────────────────────────', 'color: #F59E0B;');
  console.log('%c📥 VSTUPNÍ DATA:', 'color: #F59E0B; font-weight: bold;');
  console.log('%c───────────────────────────────────────────────────────────────────', 'color: #F59E0B;');
  console.log(`🩺 Symptomy (${symptomList.length}):`, symptomList);
  console.log(`📦 Produkty k výběru (${recommendedProducts.length}):`, recommendedProducts.map(p => p.product_name));
  console.log(`📝 User message: "${userMessage}"`);

  try {
    // Pokud nemáme žádné produkty, nelze spustit funnel
    if (!recommendedProducts || recommendedProducts.length === 0) {
      console.log('%c⚠️ Žádné produkty pro funnel!', 'color: orange;');
      return {
        success: false,
        selectedProducts: [],
        funnelText: 'Bohužel nemám k dispozici žádné produkty pro doporučení.',
        error: 'Žádné produkty k výběru'
      };
    }

    // Pokud nemáme symptomy, použijeme celou zprávu
    const symptoms = symptomList.length > 0 ? symptomList : [userMessage];
    
    // Sestavíme user prompt s produkty
    let userPrompt = `SYMPTOMY UŽIVATELE:\n${symptoms.join(', ')}\n\nZPRÁVA UŽIVATELE:\n"${userMessage}"\n\n`;
    
    userPrompt += `DOSTUPNÉ PRODUKTY:\n`;
    recommendedProducts.forEach((p, i) => {
      userPrompt += `\n${i + 1}. ${p.product_name} (kód: ${p.product_code})`;
      if (p.description_short) {
        userPrompt += `\n   Popis: ${p.description_short.substring(0, 200)}`;
      }
      if (p.price) {
        userPrompt += `\n   Cena: ${p.price} ${p.currency || 'Kč'}`;
      }
    });

    userPrompt += `\n\nVyber 2 nejlepší produkty a vytvoř doporučení. Vrať JSON.`;

    console.log('%c───────────────────────────────────────────────────────────────────', 'color: #F59E0B;');
    console.log('%c📡 VOLÁM OPENROUTER API (přes Edge Function)...', 'color: #F59E0B; font-weight: bold;');
    console.log('%c───────────────────────────────────────────────────────────────────', 'color: #F59E0B;');
    console.log(`🤖 Model: ${MODEL}`);
    console.log(`🌡️ Temperature: ${TEMPERATURE}`);

    const apiStartTime = performance.now();

    // Zavoláme Edge Function (ta jen proxuje OpenRouter)
    const { data, error } = await supabase.functions.invoke(EDGE_FUNCTION_URL, {
      body: {
        systemPrompt: PRODUCT_FUNNEL_SYSTEM_PROMPT,
        userPrompt: userPrompt,
        model: MODEL,
        temperature: TEMPERATURE,
        maxTokens: MAX_TOKENS
      }
    });

    const apiDuration = performance.now() - apiStartTime;
    console.log(`⏱️ API response time: ${apiDuration.toFixed(0)}ms`);

    if (error) {
      console.log('%c❌ EDGE FUNCTION CHYBA:', 'color: #EF4444; font-weight: bold;');
      console.log(`   Error: ${error.message}`);
      throw new Error(`Edge Function chyba: ${error.message}`);
    }

    if (!data || !data.success) {
      throw new Error(data?.error || 'Edge Function nevrátila data');
    }

    const responseText = data.response;
    console.log('📄 AI Response (preview):', responseText.substring(0, 300));

    // PARSOVÁNÍ ODPOVĚDI (naše logika)
    let result: { selectedProductCodes: string[]; recommendation: string };
    try {
      let jsonText = responseText;
      
      // Odstranit markdown code blocks pokud jsou
      const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) || responseText.match(/(\{[\s\S]*\})/);
      if (jsonMatch) jsonText = jsonMatch[1];
      
      result = JSON.parse(jsonText);

      // Validace
      if (!Array.isArray(result.selectedProductCodes)) {
        throw new Error('selectedProductCodes není pole');
      }
      if (!result.recommendation || typeof result.recommendation !== 'string') {
        throw new Error('recommendation není string');
      }

    } catch (parseError) {
      console.error('%c❌ Chyba při parsování, použijeme celý text jako doporučení', 'color: #EF4444;', parseError);
      // Fallback: použijeme prvních 2 produkty a celý text
      result = {
        selectedProductCodes: recommendedProducts.slice(0, 2).map(p => p.product_code),
        recommendation: responseText
      };
    }

    // Najdeme vybrané produkty
    let selectedProducts = recommendedProducts.filter(p => 
      result.selectedProductCodes.includes(p.product_code)
    ).slice(0, 2);

    // Pokud nenašlo žádné, vezmeme první 2
    if (selectedProducts.length === 0) {
      console.log('%c⚠️ Žádné produkty nenalezeny podle kódů, používám první 2', 'color: orange;');
      selectedProducts = recommendedProducts.slice(0, 2);
    }

    const totalDuration = performance.now() - startTime;

    console.log('%c═══════════════════════════════════════════════════════════════════', 'color: #10B981; font-weight: bold;');
    console.log('%c✅ PRODUCT FUNNEL - VÝSLEDEK', 'color: #10B981; font-weight: bold; font-size: 14px;');
    console.log('%c═══════════════════════════════════════════════════════════════════', 'color: #10B981; font-weight: bold;');
    console.log(`📦 Vybrané produkty (${selectedProducts.length}):`, selectedProducts.map(p => p.product_name));
    console.log(`📝 Délka textu: ${result.recommendation.length} znaků`);
    console.log(`⏱️ Celkový čas: ${totalDuration.toFixed(0)}ms`);
    console.log('%c═══════════════════════════════════════════════════════════════════', 'color: #10B981; font-weight: bold;');

    return {
      success: true,
      selectedProducts: selectedProducts,
      funnelText: result.recommendation
    };

  } catch (error) {
    const totalDuration = performance.now() - startTime;
    
    console.log('%c═══════════════════════════════════════════════════════════════════', 'color: #EF4444; font-weight: bold;');
    console.log('%c❌ PRODUCT FUNNEL - CHYBA', 'color: #EF4444; font-weight: bold; font-size: 14px;');
    console.log('%c═══════════════════════════════════════════════════════════════════', 'color: #EF4444; font-weight: bold;');
    console.log(`🚫 Error: ${error instanceof Error ? error.message : String(error)}`);
    console.log(`⏱️ Čas do chyby: ${totalDuration.toFixed(0)}ms`);
    console.log('%c═══════════════════════════════════════════════════════════════════', 'color: #EF4444; font-weight: bold;');

    return {
      success: false,
      selectedProducts: [],
      funnelText: 'Omlouváme se, došlo k chybě při zpracování doporučení.',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// ============================================================================
// POMOCNÉ FUNKCE
// ============================================================================

/**
 * Obohacení produktů z databáze product_feed_2
 */
export async function enrichProductsFromDatabase(
  productNames: string[]
): Promise<FunnelProduct[]> {
  console.log('%c🔍 Obohacuji produkty z databáze...', 'color: #8B5CF6;');
  console.log(`   Hledám: ${productNames.join(', ')}`);

  const enrichedProducts: FunnelProduct[] = [];

  for (const name of productNames) {
    try {
      // Hledáme podle názvu (částečná shoda)
      const { data, error } = await supabase
        .from('product_feed_2')
        .select('*')
        .ilike('product_name', `%${name}%`)
        .limit(1)
        .single();

      if (error) {
        console.log(`   ⚠️ Produkt "${name}" nenalezen`);
        continue;
      }

      if (data) {
        console.log(`   ✅ Nalezen: ${data.product_name}`);
        enrichedProducts.push({
          product_code: data.product_code,
          product_name: data.product_name,
          description: data.description_short || data.description_long,
          description_short: data.description_short,
          description_long: data.description_long,
          price: data.price,
          currency: data.currency || 'CZK',
          url: data.url,
          thumbnail: data.thumbnail,
          category: data.category
        });
      }
    } catch (err) {
      console.log(`   ❌ Chyba při hledání "${name}":`, err);
    }
  }

  console.log(`%c📦 Obohaceno ${enrichedProducts.length} produktů`, 'color: #8B5CF6;');
  return enrichedProducts;
}

/**
 * Extrahuje produkty z textu odpovědi chatbota
 */
export function extractProductsFromText(text: string): string[] {
  const products: string[] = [];
  
  // Pattern pro wany: "009 - Čistý dech"
  const wanPattern = /(\d{3})\s*-\s*([^,.\n<]+)/g;
  let match;
  while ((match = wanPattern.exec(text)) !== null) {
    const fullName = match[0].trim();
    if (!products.includes(fullName)) {
      products.push(fullName);
    }
  }

  // Pattern pro Bewit produkty
  const bewitPattern = /Bewit\s+([A-Za-zÁ-ž\s]+?)(?=[\.,\n]|$)/gi;
  while ((match = bewitPattern.exec(text)) !== null) {
    const fullName = match[0].trim();
    if (!products.includes(fullName)) {
      products.push(fullName);
    }
  }

  // Pattern pro <<<PRODUCT:xxx>>> markery
  const markerPattern = /<<<PRODUCT:([^>]+)>>>/g;
  while ((match = markerPattern.exec(text)) !== null) {
    const productName = match[1].trim();
    if (!products.includes(productName)) {
      products.push(productName);
    }
  }

  console.log(`📦 Extrahováno ${products.length} produktů z textu:`, products);
  return products;
}
