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

const EDGE_FUNCTION_URL = 'screen-products'; // Supabase Edge Function

// ============================================================================
// INTERFACES
// ============================================================================

export interface ScreeningResult {
  success: boolean;
  products: string[]; // Seznam názvů produktů/témat
  rawResponse?: string; // Pro debug
  error?: string;
}

// Prompt je nyní v Edge Function - není potřeba zde

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
  console.log('🔍 Spouštím screening produktů v textu...');
  console.log(`📝 Délka textu: ${text.length} znaků`);
  console.log(`📄 Text preview: "${text.substring(0, 150)}..."`);
  
  try {
    // Validace vstupu
    if (!text || text.trim().length === 0) {
      console.log('⚠️ Prázdný text, vracím prázdný seznam');
      return {
        success: true,
        products: []
      };
    }
    
    // Pokud je text příliš krátký, není co screenovat
    if (text.trim().length < 20) {
      console.log('⚠️ Text je příliš krátký pro screening');
      return {
        success: true,
        products: []
      };
    }
    
    console.log('📡 Volám Supabase Edge Function...');
    
    // Zavoláme Supabase Edge Function
    const { data, error } = await supabase.functions.invoke(EDGE_FUNCTION_URL, {
      body: { text: text }
    });
    
    if (error) {
      console.error('❌ Edge Function error:', error);
      throw new Error(`Edge Function chyba: ${error.message}`);
    }
    
    if (!data) {
      throw new Error('Edge Function nevrátila žádná data');
    }
    
    console.log('✅ Edge Function response received');
    
    if (!data.success) {
      throw new Error(data.error || 'Edge Function vrátila chybu');
    }
    
    const products = data.products || [];
    
    console.log(`✅ Screening dokončen: ${products.length} produktů/témat nalezeno`);
    if (products.length > 0) {
      console.log('📦 Nalezené produkty/témata:', products);
    }
    
    return {
      success: true,
      products: products
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
  console.log('🧪 Spouštím test product screeningu...');
  console.log('='.repeat(60));
  
  const testTexts = [
    {
      name: 'Test 1: Produkt wan 009',
      text: 'Pro bolest hlavy doporučuji wan 009 - Čistý dech, který pomáhá s průchodností nosních dírek a uvolňuje dutiny.'
    },
    {
      name: 'Test 2: Obecná konverzace',
      text: 'Dobrý den, jak se dnes máte? Doufám, že je vše v pořádku.'
    },
    {
      name: 'Test 3: Bewit produkt',
      text: 'Bewit Levandule 15ml je skvělý éterický olej na uklidnění mysli, podporu spánku a relaxaci.'
    },
    {
      name: 'Test 4: TČM téma',
      text: 'V tradiční čínské medicíně se používají bylinné směsi pro harmonizaci Qi a posílení imunitního systému.'
    }
  ];
  
  for (const test of testTexts) {
    console.log(`\n🔬 ${test.name}`);
    console.log(`📝 Text: "${test.text}"`);
    
    const result = await screenTextForProducts(test.text);
    
    if (result.success) {
      console.log(`✅ Úspěch: ${result.products.length} položek`);
      if (result.products.length > 0) {
        result.products.forEach((product, idx) => {
          console.log(`   ${idx + 1}. ${product}`);
        });
      }
    } else {
      console.log(`❌ Chyba: ${result.error}`);
    }
  }
  
  console.log('='.repeat(60));
  console.log('🎉 Test dokončen!');
}

