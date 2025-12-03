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
    console.log(`🔢 Generuji embedding pro: "${text.substring(0, 50)}..."`);
    console.log(`   🔧 Edge Function: ${EDGE_FUNCTION_URL}`);
    
    const { data, error } = await supabase.functions.invoke(EDGE_FUNCTION_URL, {
      body: { text }
    });
    
    console.log(`   📥 Edge Function response:`, {
      hasData: !!data,
      hasEmbedding: !!(data?.embedding),
      embeddingLength: data?.embedding?.length,
      hasError: !!error
    });
    
    if (error) {
      console.error('❌ Edge Function error:', error);
      return null;
    }
    
    if (!data || !data.embedding) {
      console.error('❌ Edge Function nevrátila embedding');
      console.error('   Data:', data);
      return null;
    }
    
    console.log(`✅ Embedding vygenerován (${data.embedding.length} rozměrů)`);
    console.log(`   📊 První 3 hodnoty: [${data.embedding.slice(0, 3).map((v: number) => v.toFixed(6)).join(', ')}]`);
    return data.embedding;
    
  } catch (error) {
    console.error('❌ Chyba při generování embeddingu:', error);
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
    console.log(`🔎 Hledám v databázi: "${productName}"`);
    console.log(`   📊 Embedding dimenze: ${embedding.length}`);
    console.log(`   📊 První 5 hodnot: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}]`);
    
    // Voláme match_product_documents pro hledání v product_documents
    // Bereme TOP 3 chunky, protože produkt může mít více chunků a potřebujeme najít ten správný
    console.log(`   🔧 Volám RPC: match_product_documents (top 3)`);
    const { data, error } = await supabase.rpc('match_product_documents', {
      query_embedding: embedding,
      match_count: 3,  // Bereme TOP 3 chunky
      filter: {}  // Žádné filtry pro metadata
    });
    
    console.log(`   📥 RPC response:`, { 
      hasData: !!data, 
      dataLength: data?.length, 
      hasError: !!error,
      errorMessage: error?.message 
    });
    
    if (error) {
      console.error('❌ RPC error details:', error);
      console.error('   Error message:', error.message);
      console.error('   Error details:', error.details);
      console.error('   Error hint:', error.hint);
      return null;
    }
    
    if (!data || data.length === 0) {
      console.log(`⚠️ Žádná shoda nenalezena pro: ${productName}`);
      return null;
    }
    
    // 🆕 PROCHÁZÍME TOP 3 CHUNKY a hledáme první, který obsahuje hledaný text
    console.log(`   🔍 Validace "contains" napříč ${data.length} chunky...`);
    console.log(`   📝 Hledaný text: "${productName}"`);
    
    const searchTextNormalized = normalizeText(productName);
    console.log(`   📝 Normalizovaný: "${searchTextNormalized}"`);
    
    let matchedChunk = null;
    
    for (let i = 0; i < data.length; i++) {
      const chunk = data[i];
      const contentNormalized = normalizeText(chunk.content);
      
      console.log(`   \n   📄 Chunk ${i + 1}/${data.length} (similarity: ${chunk.similarity.toFixed(3)}):`);
      console.log(`      Content preview: "${chunk.content.substring(0, 100)}..."`);
      
      if (contentNormalized.includes(searchTextNormalized)) {
        console.log(`      ✅ MATCH! Text "${productName}" JE obsažen v tomto chunku!`);
        matchedChunk = chunk;
        break;
      } else {
        console.log(`      ❌ Text není v tomto chunku, zkouším další...`);
      }
    }
    
    if (!matchedChunk) {
      console.log(`\n   ❌ Text "${productName}" nebyl nalezen v žádném z ${data.length} chunků`);
      return null;
    }
    
    console.log(`   \n   🎯 Použiji chunk se similarity: ${matchedChunk.similarity.toFixed(3)}`);
    
    // Získáme product_code z metadata (pole "Produkt ID")
    const productId = matchedChunk.metadata?.['Produkt ID'];
    
    if (!productId) {
      console.log(`⚠️ Match nalezen, ale chybí "Produkt ID" v metadatech`);
      return null;
    }
    
    console.log(`   🆔 Produkt ID: ${productId}`);
    
    // Načteme produkt z product_feed_2
    const { data: feed2Data, error: feed2Error } = await supabase
      .from('product_feed_2')
      .select('product_code, product_name, url, thumbnail')
      .eq('product_code', productId)
      .single();
    
    if (feed2Error || !feed2Data) {
      console.warn(`⚠️ Produkt ID ${productId} nenalezen v product_feed_2:`, feed2Error);
      return null;
    }
    
    console.log(`✅ Nalezen produkt: ${feed2Data.product_name} (kód: ${feed2Data.product_code})`);
    
    return {
      product_code: feed2Data.product_code,
      product_name: feed2Data.product_name,
      url: feed2Data.url || '',
      thumbnail: feed2Data.thumbnail,
      similarity: matchedChunk.similarity
    };
    
  } catch (error) {
    console.error('❌ Chyba při hledání produktu:', error);
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
  console.log('🗺️ Zahajuji mapování produktů na databázi...');
  console.log(`📦 Počet produktů k zmapování: ${screenedProducts.length}`);
  
  const matches: ProductMatch[] = [];
  
  try {
    for (const productName of screenedProducts) {
      console.log(`\n${'━'.repeat(60)}`);
      console.log(`🔍 Zpracovávám: "${productName}"`);
      
      // 1. Vygenerujeme embedding pro název produktu
      const embedding = await generateEmbedding(productName);
      
      if (!embedding) {
        console.error(`❌ Nepodařilo se vygenerovat embedding pro: ${productName}`);
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
    
    console.log(`\n${'━'.repeat(60)}`);
    console.log('✅ Mapování dokončeno!');
    console.log(`📊 Výsledky:`);
    console.log(`   - Celkem produktů: ${matches.length}`);
    console.log(`   - Nalezené shody: ${matches.filter(m => m.matchedProduct !== null).length}`);
    console.log(`   - Nenalezené: ${matches.filter(m => m.matchedProduct === null).length}`);
    
    return {
      success: true,
      matches
    };
    
  } catch (error) {
    console.error('❌ Kritická chyba při mapování:', error);
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
  console.log('\n' + '═'.repeat(70));
  console.log('🎯 PÁROVÁNÍSCRREENOVANÝCH PRODUKTŮ S DATABÁZÍ:');
  console.log('═'.repeat(70));
  
  matches.forEach((match, index) => {
    if (match.matchedProduct) {
      console.log(`\n${index + 1}. ${match.screenedName}`);
      console.log(`   ✅ ${match.matchedProduct.product_name} (kód: ${match.matchedProduct.product_code})`);
      console.log(`   📊 Podobnost: ${(match.matchedProduct.similarity * 100).toFixed(1)}%`);
      console.log(`   🔗 URL: ${match.matchedProduct.url}`);
    } else {
      console.log(`\n${index + 1}. ${match.screenedName}`);
      console.log(`   ❌ Produkt nenalezen v databázi`);
    }
  });
  
  console.log('\n' + '═'.repeat(70));
}

