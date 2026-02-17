/**
 * Product Mapping Service
 * 
 * Mapuje produkty ze screeningového seznamu na konkrétní produkty v databázi
 * pomocí vektorového vyhledávání v product_documents (ne product_embeddings!)
 * 
 * 🆕 OPRAVA: Hledá v product_documents pomocí RPC funkce match_product_documents
 */

import { supabase } from '../lib/supabase';

// ============================================================================
// KONFIGURACE
// ============================================================================

const EDGE_FUNCTION_URL = 'generate-embedding'; // Edge Function pro generování embeddings

// ============================================================================
// INTERFACES
// ============================================================================

export interface ProductMatch {
  screenedName: string;  // Původní název ze screeningu (např. "CHUAN XIONG CHA TIAO WAN")
  matchedProduct: {
    product_code: string;
    product_name: string;  // Název z databáze (např. "Nositel větru 099")
    url: string;
    thumbnail?: string;
    similarity: number;
  } | null;  // null pokud není nalezena shoda
}

export interface MappingResult {
  success: boolean;
  matches: ProductMatch[];
  error?: string;
}

// ============================================================================
// EMBEDDING GENERATION VIA EDGE FUNCTION
// ============================================================================

/**
 * Vygeneruje embedding pomocí Edge Function (která používá OpenRouter/OpenAI)
 * Model: text-embedding-3-large (GPT large)
 */
async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    
    const { data, error } = await supabase.functions.invoke(EDGE_FUNCTION_URL, {
      body: { text }
    });
    
      hasData: !!data,
      hasEmbedding: !!(data?.embedding),
      embeddingLength: data?.embedding?.length,
      hasError: !!error
    });
    
    if (error) {
      return null;
    }
    
    if (!data || !data.embedding) {
      return null;
    }
    
    return data.embedding;
    
  } catch (error) {
    return null;
  }
}

// ============================================================================
// HELPER FUNKCE PRO NORMALIZACI TEXTU
// ============================================================================

/**
 * Normalizuje text pro porovnávání:
 * - Lowercase
 * - Odstraní interpunkci, Markdown formátování
 * - Odstraní extra mezery
 * - Normalizuje Unicode znaky
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD') // Rozloží Unicode znaky (é → e + ´)
    .replace(/[\u0300-\u036f]/g, '') // Odstraní diakritiku
    .replace(/[*_~`[\](){}]/g, '') // Odstraní Markdown formátování
    .replace(/[–—−]/g, '-') // Normalizuje různé druhy pomlček na obyčejnou pomlčku
    .replace(/[^\w\s-]/g, ' ') // Všechnu ostatní interpunkci nahradí mezerou
    .replace(/\s+/g, ' ') // Sjednotí více mezer na jednu
    .trim();
}

// ============================================================================
// VECTOR SEARCH V DATABÁZI
// ============================================================================

/**
 * Vyhledá nejvhodnější produkt v databázi pomocí vektorového vyhledávání
 * 🆕 VALIDACE: Screenovaný text MUSÍ být obsažen v content chunku (contains check)
 */
async function findMatchingProduct(
  productName: string,
  embedding: number[]
): Promise<ProductMatch['matchedProduct']> {
  try {
    
    // Voláme match_product_documents pro hledání v product_documents
    // Bereme TOP 3 chunky, protože produkt může mít více chunků a potřebujeme najít ten správný
    const { data, error } = await supabase.rpc('match_product_documents', {
      query_embedding: embedding,
      match_count: 3,  // Bereme TOP 3 chunky
      filter: {}  // Žádné filtry pro metadata
    });
    
      hasData: !!data, 
      dataLength: data?.length, 
      hasError: !!error,
      errorMessage: error?.message 
    });
    
    if (error) {
      return null;
    }
    
    if (!data || data.length === 0) {
      return null;
    }
    
    // 🆕 PROCHÁZÍME TOP 3 CHUNKY a hledáme první, který obsahuje hledaný text
    
    const searchTextNormalized = normalizeText(productName);
    
    let matchedChunk = null;
    
    for (let i = 0; i < data.length; i++) {
      const chunk = data[i];
      const contentNormalized = normalizeText(chunk.content);
      
      
      if (contentNormalized.includes(searchTextNormalized)) {
        matchedChunk = chunk;
        break;
      } else {
      }
    }
    
    if (!matchedChunk) {
      return null;
    }
    
    
    // Získáme product_code z metadata (pole "Produkt ID")
    const productId = matchedChunk.metadata?.['Produkt ID'];
    
    if (!productId) {
      return null;
    }
    
    
    // Načteme produkt z product_feed_2
    const { data: feed2Data, error: feed2Error } = await supabase
      .from('product_feed_2')
      .select('product_code, product_name, url, thumbnail')
      .eq('product_code', productId)
      .single();
    
    if (feed2Error || !feed2Data) {
      return null;
    }
    
    
    return {
      product_code: feed2Data.product_code,
      product_name: feed2Data.product_name,
      url: feed2Data.url || '',
      thumbnail: feed2Data.thumbnail,
      similarity: matchedChunk.similarity
    };
    
  } catch (error) {
    return null;
  }
}

// ============================================================================
// HLAVNÍ FUNKCE - MAPOVÁNÍ PRODUKTŮ
// ============================================================================

/**
 * Mapuje seznam produktů ze screeningu na konkrétní produkty v databázi
 * 
 * @param screenedProducts - Pole názvů produktů ze screeningu (např. ["CHUAN XIONG CHA TIAO WAN", "XIN YI WAN"])
 * @returns MappingResult s párovánímproduktů
 */
export async function mapProductsToDatabase(
  screenedProducts: string[]
): Promise<MappingResult> {
  
  const matches: ProductMatch[] = [];
  
  try {
    for (const productName of screenedProducts) {
      
      // 1. Vygenerujeme embedding pro název produktu
      const embedding = await generateEmbedding(productName);
      
      if (!embedding) {
        matches.push({
          screenedName: productName,
          matchedProduct: null
        });
        continue;
      }
      
      // 2. Najdeme nejvhodnější produkt v databázi
      const matchedProduct = await findMatchingProduct(productName, embedding);
      
      matches.push({
        screenedName: productName,
        matchedProduct
      });
      
      // Malá pauza mezi requesty
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    
    return {
      success: true,
      matches
    };
    
  } catch (error) {
    return {
      success: false,
      matches: [],
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// ============================================================================
// HELPER - KONZOLOVÝ VÝPIS
// ============================================================================

/**
 * Vypíše výsledky mapování do console v čitelném formátu
 */
export function printMappingResults(matches: ProductMatch[]): void {
  
  matches.forEach((match, index) => {
    if (match.matchedProduct) {
    } else {
    }
  });
  
}

