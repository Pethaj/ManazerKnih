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

const SYSTEM_PROMPT = `Jsi expert na tradiční čínskou medicínu a esenciální oleje BEWIT.

Tvým úkolem je identifikovat v textu POUZE **KONKRÉTNÍ NÁZVY PRODUKTŮ**.

**CO IDENTIFIKOVAT:**
1. **Názvy esenciálních olejů** - např. "DENT", "PEPPERMINT", "EUKALYPTUS"
2. **Názvy směsí** - např. "Imm", "Pure", "Relax"
3. **Wany (čínské směsi)** - např. "009 - Čistý dech", "Shi Xiao Wan"
4. **Pinyin názvy** - např. "Te Xiao Bi Min Gan Wan", "Chuan Xiong Cha Tiao Wan"
5. **Produktové kódy** - např. "009", "033", "BEWIT KOKOSOVÝ OLEJ"

**CO NEIDENTIFIKOVAT (IGNORUJ):**
❌ Obecné fráze typu: "svěží dech", "zdraví zubů", "bolest hlavy"
❌ Účinky produktů: "antibakteriální", "protizánětlivé", "povzbuzující"
❌ Tělesné části: "ústní dutina", "dásně", "zuby"
❌ Symptomy: "záněty", "citlivost", "paradontóza"
❌ Popisné fráze v kontextu "něco PRO X": "výplach PRO svěží dech", "pasta NA zuby"

**KLÍČOVÁ PRAVIDLA:**
- Identifikuj POUZE pokud je text **přímo název produktu**, ne jeho účinek nebo použití
- Pokud vidíš frázi v kontextu "pro/na + X", IGNORUJ "X" (např. "voda pro svěží dech" → NEIDENTIFIKUJ "svěží dech")
- Preferuj názvy v UPPERCASE nebo s číselnými kódy (např. "DENT", "009")
- Pinyin názvy obvykle obsahují slova jako "Wan", "Tang", "Pian"

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

Input: "Wan 009 - Čistý dech nebo Te Xiao Bi Min Gan Wan."
Output: ["009", "Te Xiao Bi Min Gan Wan"]

Input: "Ústní voda pro svěží dech a zdraví zubů."
Output: []

Input: "Pomáhá při zánětech dásní a posiluje obranyschopnost."
Output: []`;

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

