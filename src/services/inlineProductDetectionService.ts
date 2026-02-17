/**
 * Inline Product Detection Service
 * 
 * Služba pro automatickou detekci produktů v textu odpovědi chatbota.
 * Používá vektorové vyhledávání v product_embeddings (GPT large embeddings)
 * a obohacení URL z product_feed_2.
 * 
 * Případy použití:
 * - Chatbot zmíní "houh chux inho" → najde produkt "Nositel větru" podle popisu
 * - Chatbot zmíní "009 - Čistý dech" → najde podle názvu
 * - Chatbot zmíní "bolest hlavy" → najde relevantní produkty
 */

import { supabase } from '../lib/supabase';
import { generateEmbedding } from './embeddingService';

// ============================================================================
// INTERFACES
// ============================================================================

export interface DetectedProduct {
  product_code: string;
  product_name: string;
  url: string;
  thumbnail?: string;
  position: number;        // Index v textu (konec věty)
  sentence: string;        // Věta kde byl nalezen
  similarity: number;      // Skóre podobnosti (0-1)
}

interface ProductMatch {
  product_code: string;
  product_name: string;
  similarity: number;
  sentence: string;
  position: number;
}

interface EnrichedProduct {
  product_code: string;
  product_name: string;
  url: string;
  thumbnail?: string;
}

// ============================================================================
// KONSTANTY
// ============================================================================

const SIMILARITY_THRESHOLD = 0.7;  // Minimální podobnost pro match
const MAX_RESULTS_PER_SENTENCE = 1; // Max 1 produkt na větu
const SENTENCE_MIN_LENGTH = 10;     // Minimální délka věty pro zpracování

// ============================================================================
// 1. EXTRAKCE POTENCIÁLNÍCH ZMÍNEK PRODUKTŮ
// ============================================================================

/**
 * Rozdělí text na věty a extrahuje potenciální zmínky produktů
 * @param text - Text odpovědi z chatbota
 * @returns Pole objektů { sentence, position }
 */
function extractProductMentions(text: string): Array<{ sentence: string; position: number }> {
  
  // Rozdělení na věty (tečka, vykřičník, otazník)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > SENTENCE_MIN_LENGTH);
  
  const mentions: Array<{ sentence: string; position: number }> = [];
  let currentPosition = 0;
  
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (trimmedSentence.length > 0) {
      // Najdeme pozici konce věty v původním textu
      const sentenceEndIndex = text.indexOf(trimmedSentence, currentPosition) + trimmedSentence.length;
      
      mentions.push({
        sentence: trimmedSentence,
        position: sentenceEndIndex
      });
      
      currentPosition = sentenceEndIndex;
    }
  }
  
  return mentions;
}

// ============================================================================
// 2. VEKTOROVÉ VYHLEDÁVÁNÍ PRODUKTŮ
// ============================================================================

/**
 * Vyhledá produkty pomocí vektorového vyhledávání v product_embeddings
 * Tabulka product_embeddings obsahuje embeddingy celého obsahu produktu:
 * - product_name (např. "Nositel větru")
 * - description_short
 * - description_long (kde může být "houh chux inho")
 * 
 * @param mentions - Pole zmínek z textu
 * @returns Pole matchnutých produktů
 */
async function searchProductsByVector(
  mentions: Array<{ sentence: string; position: number }>
): Promise<ProductMatch[]> {
  
  const matches: ProductMatch[] = [];
  
  for (const mention of mentions) {
    try {
      // Generujeme embedding pro větu
      // POZNÁMKA: generateEmbedding zatím vrací mock data
      // Pro produkci by mělo volat stejný OpenAI model jako N8N (text-embedding-3-large)
      const embedding = await generateEmbedding(mention.sentence);
      
      
      // Voláme RPC funkci pro vektorové vyhledávání
      // Tato funkce hledá v product_embeddings, které obsahují:
      // - embeddingy z kombinace product_name + description_short + description_long
      const { data, error } = await supabase.rpc('search_products_by_vector', {
        query_embedding: embedding,
        similarity_threshold: SIMILARITY_THRESHOLD,
        max_results: MAX_RESULTS_PER_SENTENCE,
        filter_feed_source: 'feed_2'  // Pouze Feed 2 produkty
      });
      
      if (error) {
        continue;
      }
      
      if (data && data.length > 0) {
        // Přidáme nejlepší match
        const topMatch = data[0];
        
        matches.push({
          product_code: topMatch.product_code,
          product_name: topMatch.product_name,
          similarity: topMatch.similarity_score,
          sentence: mention.sentence,
          position: mention.position
        });
      }
    } catch (error) {
      continue;
    }
  }
  
  return matches;
}

// ============================================================================
// 3. OBOHACENÍ O METADATA Z FEED 2
// ============================================================================

/**
 * Obohacení produktů o URL a thumbnail z product_feed_2
 * @param productCodes - Pole product_code k obohacení
 * @returns Obohacené produkty s URL
 */
async function enrichWithFeed2Metadata(productCodes: string[]): Promise<EnrichedProduct[]> {
  
  if (productCodes.length === 0) {
    return [];
  }
  
  try {
    const { data, error } = await supabase
      .from('product_feed_2')
      .select('product_code, product_name, url, thumbnail')
      .in('product_code', productCodes);
    
    if (error) {
      return [];
    }
    
    if (!data || data.length === 0) {
      return [];
    }
    
    return data.map(product => ({
      product_code: product.product_code,
      product_name: product.product_name,
      url: product.url || '',
      thumbnail: product.thumbnail || undefined
    }));
  } catch (error) {
    return [];
  }
}

// ============================================================================
// 4. HLAVNÍ FUNKCE - DETEKCE INLINE PRODUKTŮ
// ============================================================================

/**
 * Hlavní funkce pro detekci produktů v textu
 * 
 * Proces:
 * 1. Extrakce vět z textu
 * 2. Pro každou větu: vektorové vyhledávání v product_embeddings
 * 3. Obohacení nalezených produktů o URL z product_feed_2
 * 4. Vrácení výsledků s pozicemi pro inline rendering
 * 
 * @param text - Text odpovědi z chatbota
 * @returns Pole detekovaných produktů s pozicemi
 */
export async function detectInlineProducts(text: string): Promise<DetectedProduct[]> {
  
  try {
    // Krok 1: Extrakce zmínek
    const mentions = extractProductMentions(text);
    
    if (mentions.length === 0) {
      return [];
    }
    
    // Krok 2: Vektorové vyhledávání
    const matches = await searchProductsByVector(mentions);
    
    if (matches.length === 0) {
      return [];
    }
    
    // Krok 3: Obohacení z Feed 2
    const productCodes = matches.map(m => m.product_code);
    const enrichedProducts = await enrichWithFeed2Metadata(productCodes);
    
    if (enrichedProducts.length === 0) {
      return [];
    }
    
    // Krok 4: Kombinace dat
    const detectedProducts: DetectedProduct[] = [];
    
    for (const match of matches) {
      const enriched = enrichedProducts.find(p => p.product_code === match.product_code);
      
      if (enriched && enriched.url) {
        detectedProducts.push({
          product_code: match.product_code,
          product_name: enriched.product_name,
          url: enriched.url,
          thumbnail: enriched.thumbnail,
          position: match.position,
          sentence: match.sentence,
          similarity: match.similarity
        });
      }
    }
    
    return detectedProducts;
    
  } catch (error) {
    return [];
  }
}

// ============================================================================
// POMOCNÉ FUNKCE
// ============================================================================

/**
 * Test funkce pro ověření funkčnosti
 */
export async function testProductDetection(): Promise<void> {
  
  const testText = `
    Pro bolest hlavy doporučuji 009 - Čistý dech. 
    Je to skvělý produkt z tradiční čínské medicíny. 
    Můžete ho kombinovat s dalšími produkty.
  `;
  
  const results = await detectInlineProducts(testText);
  
}




