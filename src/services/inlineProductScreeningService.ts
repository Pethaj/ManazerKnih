/**
 * Inline Product Screening Service
 * 
 * Agent pro identifikaci produktů/témat v textu odpovědi chatbota
 * Volá Supabase Edge Function, která používá OpenRouter GPT-4o-mini
 * související s čínskou medicínou a přírodní/alternativní medicínou
 */

import { supabase } from '../lib/supabase';

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

// ============================================================================
// SYSTEM PROMPT PRO PRODUCT SCREENING
// ============================================================================

const SYSTEM_PROMPT = `Jsi expert na tradiční čínskou medicínu a přírodní léčbu BEWIT.

Tvým úkolem je identifikovat v textu:
1. **Názvy produktů/wanů** (čínské bylinné směsi)
2. **Pinyin názvy** (romanizovaná čínština)
3. **Zdravotní témata** relevantní pro BEWIT produkty

**PRAVIDLA:**
- Hledej POUZE produkty/témata zmíněné V TEXTU
- Nevymýšlej si názvy, které v textu nejsou
- Zahrň jak pinyin názvy (např. "Shi Xiao Wan") tak české názvy
- Pro témata použij široké pojmy (např. "bolest hlavy", "trávení")

**VÝSTUP:**
Vrať POUZE validní JSON pole stringů bez markdown, bez vysvětlení:
["produkt1", "produkt2", "téma1"]

**PŘÍKLAD:**
Text: "Pro bolest hlavy doporučuji Chuan Xiong Cha Tiao Wan..."
Výstup: ["Chuan Xiong Cha Tiao Wan", "bolest hlavy"]`;

// ============================================================================
// HLAVNÍ FUNKCE
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
        userPrompt: `Analyzuj následující text a extrahuj názvy produktů/wanů a zdravotní témata:\n\n${text}`,
        model: 'anthropic/claude-3-haiku',
        temperature: 0.1,
        maxTokens: 500
      }
    });
    
    if (error) {
      console.error('❌ Edge Function error:', error);
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
        console.error('⚠️ Response není pole, používám prázdné pole');
        products = [];
      }
    } catch (parseError) {
      console.error('❌ Chyba při parsování JSON:', parseError);
      console.error('📄 Response text:', data.response);
      products = [];
    }
    
    
    return {
      success: true,
      products: products,
      rawResponse: data.response
    };
    
  } catch (error) {
    console.error('❌ Kritická chyba při screeningu produktů:', error);
    return {
      success: false,
      products: [],
      error: error instanceof Error ? error.message : String(error)
    };
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

