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
}

export interface RecommendedProduct {
  product_code: string;
  product_name: string;
  description?: string;
  url?: string;          // URL produktu (z Product Pills)
  thumbnail?: string;    // URL obrázku produktu
}

export interface IntentRouterRequest {
  userMessage: string;
  conversationHistory: ConversationMessage[];
  lastBotMessage?: string;
  recommendedProducts?: RecommendedProduct[];
}

export interface IntentRouterResponse {
  success: boolean;
  intent: 'chat' | 'funnel';
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

const INTENT_ROUTING_SYSTEM_PROMPT = `Jsi expertní routing agent pro chatbot zaměřený na čínskou medicínu a přírodní produkty BEWIT (wany).

## TVŮJ ÚKOL
Analyzuj uživatelovu zprávu a rozhodni mezi CHAT a FUNNEL.

## KLÍČOVÉ PRAVIDLO - PRIORITA FUNNELU
⚠️ DŮLEŽITÉ: Pokud uživatel POPISUJE SYMPTOMY nebo ZDRAVOTNÍ PROBLÉMY → VŽDY zvol FUNNEL!

### FUNNEL (produktový funnel) - PREFEROVANÁ VOLBA při symptomech
Použij FUNNEL když uživatel:
- Popisuje JAKÉKOLIV zdravotní symptomy (bolest, únava, nevolnost, sucho, horečka...)
- Uvádí více problémů najednou (např. "bolest hlavy, sucho v ústech")
- Žádá o personalizované doporučení na základě svých potíží
- Popisuje své zdravotní obtíže vlastními slovy

Příklady pro FUNNEL:
- "Bolí mě hlava" → FUNNEL
- "bolest hlavy, sucho v ustech" → FUNNEL  
- "Mám problém se spaním a úzkostí" → FUNNEL
- "Cítím se unavený a mám rýmu" → FUNNEL
- "Trápí mě klouby a záda" → FUNNEL

### CHAT (běžný chat)
Použij CHAT POUZE když uživatel:
- Se ptá na INFORMACE o produktech (cena, dostupnost, použití)
- Děkuje nebo zdraví
- Žádá o vysvětlení něčeho
- Klade obecnou otázku bez popisu symptomů

Příklady pro CHAT:
- "Jak to mám použít?" → CHAT
- "Kolik to stojí?" → CHAT
- "Děkuji za informace" → CHAT
- "Co je to wan?" → CHAT

## VÝSTUP
Vrať POUZE validní JSON objekt (bez markdown, bez \`\`\`):
{
  "intent": "chat" | "funnel",
  "confidence": 0.0 - 1.0,
  "reasoning": "Stručné vysvětlení rozhodnutí",
  "symptomList": ["symptom1", "symptom2"]
}

## PŘÍKLADY

User: "jak to mám použít?"
→ {"intent": "chat", "confidence": 0.95, "reasoning": "Dotaz na použití produktu, žádné symptomy.", "symptomList": []}

User: "bolest hlavy, sucho v ustech"
→ {"intent": "funnel", "confidence": 0.98, "reasoning": "Uživatel popisuje zdravotní symptomy - bolest hlavy a sucho v ústech.", "symptomList": ["bolest hlavy", "sucho v ústech"]}

User: "Bolí mě hlava a mám horečku"
→ {"intent": "funnel", "confidence": 0.99, "reasoning": "Jasný popis zdravotních symptomů.", "symptomList": ["bolest hlavy", "horečka"]}

User: "jake wany jsou nejlepsi na bolest"
→ {"intent": "chat", "confidence": 0.85, "reasoning": "Obecný dotaz na produkty, bez konkrétních osobních symptomů.", "symptomList": []}`;

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
  const startTime = performance.now();
  
  console.log('%c═══════════════════════════════════════════════════════════════════', 'color: #8B5CF6; font-weight: bold;');
  console.log('%c🔀 INTENT ROUTING SERVICE - START', 'color: #8B5CF6; font-weight: bold; font-size: 14px;');
  console.log('%c═══════════════════════════════════════════════════════════════════', 'color: #8B5CF6; font-weight: bold;');
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  
  console.log('%c───────────────────────────────────────────────────────────────────', 'color: #8B5CF6;');
  console.log('%c📥 VSTUPNÍ DATA:', 'color: #8B5CF6; font-weight: bold;');
  console.log('%c───────────────────────────────────────────────────────────────────', 'color: #8B5CF6;');
  console.log(`📝 User Message: "${userMessage}"`);
  console.log(`📜 Historie konverzace: ${conversationHistory?.length || 0} zpráv`);
  console.log(`📦 Doporučené produkty: ${recommendedProducts?.length || 0}`);
  console.log(`💬 Poslední bot zpráva: ${lastBotMessage ? `ANO (${lastBotMessage.length} znaků)` : 'NE'}`);
  
  try {
    // Validace vstupu
    if (!userMessage || userMessage.trim().length === 0) {
      console.log('%c⚠️ Prázdná zpráva - vracím default: CHAT', 'color: orange;');
      return {
        success: true,
        intent: 'chat',
        confidence: 1,
        reasoning: 'Prázdná zpráva',
        symptomList: [],
        extractedProducts: []
      };
    }

    // Kontrola, zda předchozí zpráva obsahuje výzvu k přesnějšímu doporučení
    const hasPrompt = hasRecommendationPrompt(lastBotMessage);
    console.log(`💡 Obsahuje výzvu "Potřebujete přesnější doporučení?": ${hasPrompt ? 'ANO ✓' : 'NE'}`);

    // Sestavíme user prompt s kontextem
    let userPrompt = `UŽIVATELOVA ZPRÁVA:\n"${userMessage}"\n`;
    
    if (lastBotMessage) {
      userPrompt += `\n\nPOSLEDNÍ ODPOVĚĎ BOTA:\n${lastBotMessage.substring(0, 500)}`;
    }
    
    if (recommendedProducts && recommendedProducts.length > 0) {
      userPrompt += `\n\nDOPORUČENÉ PRODUKTY:\n`;
      recommendedProducts.slice(0, 5).forEach((p, i) => {
        userPrompt += `${i + 1}. ${p.product_name}\n`;
      });
    }

    if (conversationHistory && conversationHistory.length > 0) {
      userPrompt += `\n\nPOSLEDNÍ ZPRÁVY:\n`;
      conversationHistory.slice(-3).forEach((msg) => {
        userPrompt += `${msg.role.toUpperCase()}: ${msg.text.substring(0, 150)}\n`;
      });
    }

    userPrompt += `\n\nAnalyzuj záměr a vrať JSON odpověď.`;

    console.log('%c───────────────────────────────────────────────────────────────────', 'color: #8B5CF6;');
    console.log('%c📡 VOLÁM OPENROUTER API (přes Edge Function)...', 'color: #8B5CF6; font-weight: bold;');
    console.log('%c───────────────────────────────────────────────────────────────────', 'color: #8B5CF6;');
    console.log(`🤖 Model: ${MODEL}`);
    console.log(`🌡️ Temperature: ${TEMPERATURE}`);

    const apiStartTime = performance.now();

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
    console.log('📄 AI Response:', responseText);

    // PARSOVÁNÍ ODPOVĚDI (to je naše logika, ne Edge Function)
    let result: { intent: 'chat' | 'funnel'; confidence: number; reasoning: string; symptomList?: string[] };
    try {
      let jsonText = responseText;
      
      // Odstranit markdown code blocks pokud jsou
      const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) || responseText.match(/(\{[\s\S]*\})/);
      if (jsonMatch) jsonText = jsonMatch[1];
      
      result = JSON.parse(jsonText);
      
      // Validace
      if (!['chat', 'funnel'].includes(result.intent)) {
        console.log('%c⚠️ Neplatný intent, nastavuji na CHAT', 'color: orange;');
        result.intent = 'chat';
      }

      // Zajistit confidence v rozsahu 0-1
      if (typeof result.confidence !== 'number' || result.confidence < 0 || result.confidence > 1) {
        result.confidence = 0.5;
      }

    } catch (parseError) {
      console.error('%c❌ Chyba při parsování JSON, fallback na CHAT', 'color: #EF4444;', parseError);
      result = { 
        intent: 'chat', 
        confidence: 0.5, 
        reasoning: 'Fallback - chyba parsování', 
        symptomList: [] 
      };
    }

    const totalDuration = performance.now() - startTime;

    console.log('%c═══════════════════════════════════════════════════════════════════', 'color: #10B981; font-weight: bold;');
    console.log('%c✅ INTENT ROUTING - VÝSLEDEK', 'color: #10B981; font-weight: bold; font-size: 14px;');
    console.log('%c═══════════════════════════════════════════════════════════════════', 'color: #10B981; font-weight: bold;');
    console.log(`%c🎯 INTENT: ${result.intent.toUpperCase()}`, `color: ${result.intent === 'funnel' ? '#F59E0B' : '#10B981'}; font-weight: bold; font-size: 16px;`);
    console.log(`📊 Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`📝 Reasoning: ${result.reasoning}`);
    
    if (result.intent === 'funnel' && result.symptomList && result.symptomList.length > 0) {
      console.log(`%c🩺 Extrahované symptomy: ${result.symptomList.join(', ')}`, 'color: #F59E0B;');
    }
    
    console.log(`⏱️ Celkový čas: ${totalDuration.toFixed(0)}ms`);
    console.log('%c═══════════════════════════════════════════════════════════════════', 'color: #10B981; font-weight: bold;');

    return {
      success: true,
      intent: result.intent,
      confidence: result.confidence,
      reasoning: result.reasoning,
      symptomList: result.symptomList || [],
      extractedProducts: []
    };

  } catch (error) {
    const totalDuration = performance.now() - startTime;
    
    console.log('%c═══════════════════════════════════════════════════════════════════', 'color: #EF4444; font-weight: bold;');
    console.log('%c❌ INTENT ROUTING - CHYBA', 'color: #EF4444; font-weight: bold; font-size: 14px;');
    console.log('%c═══════════════════════════════════════════════════════════════════', 'color: #EF4444; font-weight: bold;');
    console.log(`🚫 Error: ${error instanceof Error ? error.message : String(error)}`);
    console.log(`⏱️ Čas do chyby: ${totalDuration.toFixed(0)}ms`);
    console.log('%c🔄 Fallback: CHAT', 'color: #F59E0B; font-weight: bold;');
    console.log('%c═══════════════════════════════════════════════════════════════════', 'color: #EF4444; font-weight: bold;');
    
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
