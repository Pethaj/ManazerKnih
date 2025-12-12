/**
 * Intent Routing Service
 * ============================================================================
 * 🔀 ROUTING AGENT PRO WANY CHAT
 * ============================================================================
 * 
 * Služba pro routing uživatelských dotazů.
 * Rozhoduje mezi běžným chatem a produktovým funnelem.
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

export interface ConversationMessage {
  role: 'user' | 'bot';
  text: string;
  hasCallout?: boolean;  // 🆕 Flag pro žlutý callout (více než 2 produkty)
}

export interface RecommendedProduct {
  product_code: string;
  product_name: string;
  description?: string;
  url?: string;          // URL produktu (z Product Pills nebo product_feed_2)
  thumbnail?: string;    // URL obrázku produktu (z product_feed_2)
  price?: number;        // Cena produktu (z product_feed_2)
  currency?: string;     // Měna (z product_feed_2)
}

export interface IntentRouterRequest {
  userMessage: string;
  conversationHistory: ConversationMessage[];
  lastBotMessage?: string;
  recommendedProducts?: RecommendedProduct[];
}

export interface IntentRouterResponse {
  success: boolean;
  intent: 'chat' | 'funnel' | 'update_funnel';
  confidence: number;
  reasoning: string;
  symptomList: string[];
  extractedProducts: string[];
  error?: string;
}

// ============================================================================
// KONFIGURACE
// ============================================================================

const EDGE_FUNCTION_URL = 'openrouter-proxy';  // Nová dedikovaná Edge Function
const MODEL = 'anthropic/claude-3-haiku';  // ✅ OPRAVENO: Správný model ID pro OpenRouter
const TEMPERATURE = 0.1;
const MAX_TOKENS = 500;

// ============================================================================
// SYSTEM PROMPT PRO INTENT ROUTING
// ============================================================================

const INTENT_ROUTING_SYSTEM_PROMPT = `Jsi routing agent pro BEWIT chatbot. Rozhoduješ POUZE mezi dvěma módy:

## MÓDY

### CHAT (výchozí)
Informační režim - odpovídání na dotazy, konverzace.
Vše jde přes N8N webhook jako běžný chat.

### FUNNEL  
Produktový režim - doporučování wanů na základě symptomů.
Spouští se POUZE když uživatel EXPLICITNĚ REAGUJE na výzvu k doporučení.

### UPDATE_FUNNEL
Aktualizace existujícího funnelu - uživatel chce změnit/rozšířit doporučení.

## KLÍČOVÉ PRAVIDLO

⚠️ FUNNEL se spustí POUZE pokud:
1. V historii je zpráva obsahující "Potřebujete přesnější doporučení?" (žlutý callout)
2. A uživatel na tuto výzvu ODPOVÍDÁ (popisuje symptomy, říká "ano", upřesňuje potíže)

Pokud žlutý callout v historii NENÍ → vždy CHAT (i když uživatel popisuje symptomy!)

## ROZHODOVÁNÍ

1. Je v historii "Potřebujete přesnější doporučení?"?
   - NE → **CHAT** (vždy!)
   - ANO → pokračuj na bod 2

2. Reaguje uživatel na výzvu? (popisuje symptomy, říká ano, upřesňuje)
   - ANO → **FUNNEL** + extrahuj symptomy
   - NE (ptá se na něco jiného) → **CHAT**

3. Jsou již produkty doporučené a uživatel chce změnu?
   - ANO → **UPDATE_FUNNEL**

## VÝSTUP
Vrať POUZE JSON:
{
  "intent": "chat" | "funnel" | "update_funnel",
  "confidence": 0.0-1.0,
  "reasoning": "Krátké vysvětlení",
  "symptomList": ["symptom1", "symptom2"]
}

## PŘÍKLADY

Historie: (bez callout)
Zpráva: "bolí mě hlava"
→ {"intent": "chat", "confidence": 0.99, "reasoning": "Žádná výzva k doporučení v historii.", "symptomList": []}

Historie: "...Potřebujete přesnější doporučení?..."
Zpráva: "ano, bolí mě hlava a mám závratě"
→ {"intent": "funnel", "confidence": 0.99, "reasoning": "Uživatel reaguje na výzvu a popisuje symptomy.", "symptomList": ["bolest hlavy", "závratě"]}

Historie: "...Potřebujete přesnější doporučení?..."
Zpráva: "kolik to stojí?"
→ {"intent": "chat", "confidence": 0.95, "reasoning": "Uživatel se ptá na informace, ne na doporučení.", "symptomList": []}

Historie: (produkty již doporučeny)
Zpráva: "dej mi jiné produkty"
→ {"intent": "update_funnel", "confidence": 0.95, "reasoning": "Uživatel chce změnit doporučení.", "symptomList": []}`;

// ============================================================================
// HLAVNÍ FUNKCE
// ============================================================================

/**
 * Určí záměr uživatele - zda pokračovat v chatu nebo spustit produktový funnel
 */
export async function routeUserIntent(
  userMessage: string,
  conversationHistory: ConversationMessage[],
  lastBotMessage?: string,
  recommendedProducts?: RecommendedProduct[]
): Promise<IntentRouterResponse> {
  try {
    // Validace vstupu
    if (!userMessage || userMessage.trim().length === 0) {
      return {
        success: true,
        intent: 'chat',
        confidence: 1,
        reasoning: 'Prázdná zpráva',
        symptomList: [],
        extractedProducts: []
      };
    }

    // Detekce klíčových podmínek
    const hasProductsInHistory = (recommendedProducts?.length || 0) > 0;
    
    // 🆕 Detekce žlutého calloutu v historii - kontrolujeme FLAG místo textu!
    const hasRecommendationCallout = conversationHistory?.some(msg => 
      msg.role === 'bot' && msg.hasCallout === true
    ) || false;
    
    // User prompt s kontextem pro LLM
    let userPrompt = `## AKTUÁLNÍ ZPRÁVA UŽIVATELE
"${userMessage}"

## KONTEXT
- Žlutý callout "Potřebujete přesnější doporučení?" v historii: ${hasRecommendationCallout ? 'ANO' : 'NE'}
- Produkty již byly doporučeny: ${hasProductsInHistory ? 'ANO' : 'NE'}

## HISTORIE (poslední zprávy)
${conversationHistory && conversationHistory.length > 0 
  ? conversationHistory.slice(-4).map(m => `${m.role.toUpperCase()}: ${m.text.substring(0, 150)}${m.text.length > 150 ? '...' : ''}`).join('\n')
  : '(prázdná)'}

Rozhodni o intentu podle pravidel.`;

    // Zavoláme Edge Function (ta jen proxuje OpenRouter)
    const { data, error } = await supabase.functions.invoke(EDGE_FUNCTION_URL, {
      body: {
        systemPrompt: INTENT_ROUTING_SYSTEM_PROMPT,
        userPrompt: userPrompt,
        model: MODEL,
        temperature: TEMPERATURE,
        maxTokens: MAX_TOKENS
      }
    });

    if (error) {
      throw new Error(`Edge Function chyba: ${error.message}`);
    }

    if (!data || !data.success) {
      throw new Error(data?.error || 'Edge Function nevrátila data');
    }

    const responseText = data.response;

    // PARSOVÁNÍ ODPOVĚDI
    let result: { 
      intent: 'chat' | 'funnel' | 'update_funnel'; 
      confidence: number; 
      reasoning: string; 
      symptomList?: string[];
    };
    try {
      let jsonText = responseText;
      
      // Odstranit markdown code blocks pokud jsou
      const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) || responseText.match(/(\{[\s\S]*\})/);
      if (jsonMatch) jsonText = jsonMatch[1];
      
      result = JSON.parse(jsonText);
      
      // Validace intentů - pouze 3 možnosti
      const validIntents = ['chat', 'funnel', 'update_funnel'];
      if (!validIntents.includes(result.intent)) {
        result.intent = 'chat';
      }

      // Zajistit confidence v rozsahu 0-1
      if (typeof result.confidence !== 'number' || result.confidence < 0 || result.confidence > 1) {
        result.confidence = 0.5;
      }

    } catch (parseError) {
      result = { 
        intent: 'chat', 
        confidence: 0.5, 
        reasoning: 'Fallback - chyba parsování', 
        symptomList: [] 
      };
    }

    return {
      success: true,
      intent: result.intent,
      confidence: result.confidence,
      reasoning: result.reasoning,
      symptomList: result.symptomList || [],
      extractedProducts: []
    };

  } catch (error) {
    console.error('❌ Intent routing error:', error instanceof Error ? error.message : String(error));
    
    // Fallback na chat při chybě
    return {
      success: false,
      intent: 'chat',
      confidence: 0,
      reasoning: 'Chyba při zpracování - fallback na chat',
      symptomList: [],
      extractedProducts: [],
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// ============================================================================
// POMOCNÉ FUNKCE
// ============================================================================

/**
 * Zkontroluje, zda poslední zpráva bota obsahuje výzvu k přesnějšímu doporučení
 */
export function hasRecommendationPrompt(lastBotMessage?: string): boolean {
  if (!lastBotMessage) return false;
  
  const promptIndicators = [
    'Potřebujete přesnější doporučení',
    'Napište nám více o svých symptomech',
    'abychom mohli produkty lépe zacílit'
  ];

  return promptIndicators.some(indicator => 
    lastBotMessage.includes(indicator)
  );
}

/**
 * Extrahuje produkty z historie konverzace
 * Extrahuje OBĚ varianty:
 * 1. Produkty z markerů <<<PRODUCT:...>>> (Product Pills)
 * 2. Originální názvy produktů z textu chatu
 */
export function extractProductsFromHistory(
  conversationHistory: ConversationMessage[]
): RecommendedProduct[] {
  const products: RecommendedProduct[] = [];
  
  // Hledáme produkty ve zprávách bota
  for (const msg of conversationHistory) {
    if (msg.role === 'bot') {
      // KROK 1: Extrahujeme produkty z markerů <<<PRODUCT:...>>>
      // Formát: <<<PRODUCT:3037|||https://bewit.love/produkt/205-pruzna-stezka|||205 - Pružná stezka|||Jin Gu Die Shang Wan>>>
      const markerPattern = /<<<PRODUCT:([^|]+)\|\|\|([^|]+)\|\|\|([^|]+)\|\|\|([^>]+)>>>/g;
      let markerMatch;
      while ((markerMatch = markerPattern.exec(msg.text)) !== null) {
        const productCode = markerMatch[1].trim();
        const productUrl = markerMatch[2].trim();
        const productName = markerMatch[3].trim();
        const pinyinName = markerMatch[4].trim();
        
        // Přidáme pouze pokud ještě není v seznamu (podle kódu)
        if (!products.find(p => p.product_code === productCode)) {
          products.push({
            product_code: productCode,
            product_name: productName,
            description: pinyinName,  // Pinyin jako popis pro kontext
            url: productUrl,          // URL z Product Pills
            // Thumbnail - zkusíme odvodit z URL nebo použijeme standardní BEWIT pattern
            thumbnail: productUrl ? `${productUrl.replace('/produkt/', '/media/product/')}/thumbnail.jpg` : undefined
          });
        }
      }

      // KROK 2: Extrahujeme TAKÉ originální názvy z textu (bez markerů)
      // Nejprve odstraníme markery z textu, abychom nezachytávali jejich fragmenty
      const cleanText = msg.text.replace(/<<<PRODUCT:[^>]+>>>/g, '');
      
      const productPatterns = [
        /(\d{3})\s*-\s*([^,.\n\[\]()]+)/g,  // "009 - Čistý dech"
        /Bewit\s+([A-Za-zÁ-ž\s]+)/gi         // "Bewit Levandule"
      ];

      for (const pattern of productPatterns) {
        let match;
        while ((match = pattern.exec(cleanText)) !== null) {
          const productName = match[0].trim();
          
          // Přidáme pouze pokud ještě není v seznamu (porovnáme název)
          if (!products.find(p => p.product_name === productName)) {
            products.push({
              product_code: match[1] || '',
              product_name: productName
            });
          }
        }
      }
    }
  }

  return products;
}

/**
 * Obohacení funnel produktů o kompletní metadata z product_feed_2
 * Toto zajistí, že obrázky a další data budou správně načteny z databáze
 * 
 * @param products - Produkty extrahované z historie (mají jen základní info)
 * @returns Obohacené produkty s obrázky, cenami a URL z product_feed_2
 */
export async function enrichFunnelProductsFromDatabase(
  products: RecommendedProduct[]
): Promise<RecommendedProduct[]> {
  if (!products || products.length === 0) {
    return [];
  }

  try {
    // Získáme product_codes a URLs pro dotaz
    const productCodes = products
      .map(p => p.product_code)
      .filter(code => code && code.length > 0);
    
    const productUrls = products
      .map(p => p.url)
      .filter(url => url && url.length > 0);

    // Pokud nemáme ani product_codes ani URLs, použijeme fallback
    if (productCodes.length === 0 && productUrls.length === 0) {
      return await enrichByProductName(products);
    }

    // 🔧 OPRAVA: Dotaz na product_feed_2 podle URL nebo product_code
    // Použijeme .or() pro hledání podle URL nebo product_code
    let query = supabase
      .from('product_feed_2')
      .select('product_code, product_name, description_short, description_long, url, thumbnail, price, currency, availability');
    
    // Sestavíme OR podmínku pro URL nebo product_code
    const orConditions: string[] = [];
    
    if (productUrls.length > 0) {
      orConditions.push(`url.in.(${productUrls.map(url => `"${url}"`).join(',')})`);
    }
    
    if (productCodes.length > 0) {
      orConditions.push(`product_code.in.(${productCodes.map(code => `"${code}"`).join(',')})`);
    }
    
    if (orConditions.length > 0) {
      query = query.or(orConditions.join(','));
    }

    const { data, error } = await query;

    if (error) {
      console.error('Chyba při načítání z product_feed_2:', error);
      return await enrichByProductName(products);
    }

    if (!data || data.length === 0) {
      return await enrichByProductName(products);
    }

    // Spojíme data - obohacení původních produktů o metadata z DB
    // 🔧 OPRAVA: Prioritizujeme URL matching (URL je unikátní identifikátor!)
    const enrichedProducts: RecommendedProduct[] = products.map(product => {
      // 1. Priorita: Matching podle URL (URL je unikátní!)
      let dbData = null;
      if (product.url) {
        dbData = data.find(d => d.url === product.url);
      }
      
      // 2. Fallback: Matching podle product_code
      if (!dbData) {
        dbData = data.find(d => d.product_code === product.product_code);
      }
      
      if (dbData) {
        return {
          product_code: dbData.product_code,
          product_name: dbData.product_name || product.product_name,
          description: product.description || dbData.description_short,
          url: dbData.url || product.url,
          thumbnail: dbData.thumbnail || undefined,
          price: dbData.price,
          currency: dbData.currency || 'CZK'
        };
      } else {
        return product;
      }
    });

    return enrichedProducts;

  } catch (error) {
    console.error('Chyba při obohacování produktů:', error);
    return products; // Vrátíme původní produkty
  }
}

/**
 * Fallback funkce - hledá produkty podle URL nebo názvu (částečná shoda)
 * 🔧 OPRAVA: Prioritizuje URL matching před name matching
 */
async function enrichByProductName(
  products: RecommendedProduct[]
): Promise<RecommendedProduct[]> {
  const enrichedProducts: RecommendedProduct[] = [];

  for (const product of products) {
    try {
      let data = null;
      let error = null;
      
      // 1. PRIORITA: Hledání podle URL (nejpřesnější!)
      if (product.url) {
        const urlResult = await supabase
          .from('product_feed_2')
          .select('product_code, product_name, description_short, url, thumbnail, price, currency')
          .eq('url', product.url)
          .single();
        
        if (!urlResult.error && urlResult.data) {
          data = urlResult.data;
        }
      }
      
      // 2. FALLBACK: Hledání podle názvu (pokud URL selhalo)
      if (!data) {
        // Extrahujeme číslo produktu z názvu (např. "009" z "009 - Čistý dech")
        const numberMatch = product.product_name.match(/^(\d{3})/);
        
        let query = supabase
          .from('product_feed_2')
          .select('product_code, product_name, description_short, url, thumbnail, price, currency');

        if (numberMatch) {
          // Hledáme podle čísla na začátku názvu
          query = query.ilike('product_name', `${numberMatch[1]}%`);
        } else {
          // Hledáme podle celého názvu
          query = query.ilike('product_name', `%${product.product_name}%`);
        }

        const nameResult = await query.limit(1).single();
        data = nameResult.data;
        error = nameResult.error;
      }

      if (data) {
        enrichedProducts.push({
          product_code: data.product_code,
          product_name: data.product_name,
          description: product.description || data.description_short,
          url: data.url || product.url,
          thumbnail: data.thumbnail || undefined,
          price: data.price,
          currency: data.currency || 'CZK'
        });
      } else {
        enrichedProducts.push(product);
      }
    } catch (err) {
      enrichedProducts.push(product);
    }
  }

  return enrichedProducts;
}
