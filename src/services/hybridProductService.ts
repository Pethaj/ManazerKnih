/**
 * Hybrid Product Service
 * Služba kombinující vektorové vyhledávání z product_embeddings
 * s aktuálními metadaty z product_feed_2 a products tabulek
 */

import { supabase } from '../lib/supabase';
import { generateEmbedding } from './embeddingService';

export interface HybridProductRecommendation {
  id: number;
  product_code: string;
  product_name: string;
  description?: string;
  category?: string;
  price?: number;
  currency?: string;
  product_url?: string;
  image_url?: string;
  similarity_score: number;
  feed_source?: string;
}

/**
 * Hlavní funkce pro získání produktových doporučení
 * Kombinuje vektorové vyhledávání s aktuálními metadata z tabulek
 * 
 * @param query - Vyhledávací dotaz uživatele
 * @param sessionId - ID session (zatím nepoužito)
 * @param limit - Maximální počet výsledků
 * @param useFeed1 - Zda použít Feed 1 (zbozi.xml)
 * @param useFeed2 - Zda použít Feed 2 (Product Feed 2)
 */
export async function getHybridProductRecommendations(
  query: string,
  sessionId?: string,
  limit: number = 10,
  useFeed1: boolean = true,
  useFeed2: boolean = true
): Promise<HybridProductRecommendation[]> {
  try {

    // Pokud nejsou povoleny žádné feedy, vrátíme prázdný výsledek
    if (!useFeed1 && !useFeed2) {
      console.warn('⚠️ Žádný feed není povolen pro vyhledávání');
      return [];
    }

    // 1. Vygenerujeme embedding z dotazu uživatele
    // Poznámka: generateEmbedding zatím vrací mock data, embeddingy se generují přes n8n
    // Pro nyní použijeme jen textové vyhledávání nebo mock embedding
    const queryEmbedding = await generateEmbedding(query);
    

    let allResults: HybridProductRecommendation[] = [];

    // 2. Vyhledávání podle povolených feedů
    if (useFeed1 && useFeed2) {
      // Vyhledávání v obou feedech najednou
      const { data: searchResults, error: searchError } = await supabase.rpc(
        'hybrid_product_search',
        {
          query_text: query,
          query_embedding: queryEmbedding,
          match_count: limit,
          full_text_weight: 1.0,
          semantic_weight: 1.0,
          rrf_k: 50,
          filter_feed_source: null // null = vyhledávat ve všech feedech
        }
      );

      if (searchError) {
        console.error('❌ Chyba při hybridním vyhledávání:', searchError);
        return await getPureSemanticRecommendations(query, queryEmbedding, limit, null);
      }

      if (searchResults && searchResults.length > 0) {
        allResults = await enrichProductsWithMetadata(searchResults);
      }
    } else if (useFeed1) {
      // Pouze Feed 1
      const { data: searchResults, error: searchError } = await supabase.rpc(
        'hybrid_product_search',
        {
          query_text: query,
          query_embedding: queryEmbedding,
          match_count: limit,
          full_text_weight: 1.0,
          semantic_weight: 1.0,
          rrf_k: 50,
          filter_feed_source: 'feed_1'
        }
      );

      if (searchError) {
        console.error('❌ Chyba při vyhledávání Feed 1:', searchError);
        return await getPureSemanticRecommendations(query, queryEmbedding, limit, 'feed_1');
      }

      if (searchResults && searchResults.length > 0) {
        allResults = await enrichProductsWithMetadata(searchResults);
      }
    } else if (useFeed2) {
      // Pouze Feed 2
      const { data: searchResults, error: searchError } = await supabase.rpc(
        'hybrid_product_search',
        {
          query_text: query,
          query_embedding: queryEmbedding,
          match_count: limit,
          full_text_weight: 1.0,
          semantic_weight: 1.0,
          rrf_k: 50,
          filter_feed_source: 'feed_2'
        }
      );

      if (searchError) {
        console.error('❌ Chyba při vyhledávání Feed 2:', searchError);
        return await getPureSemanticRecommendations(query, queryEmbedding, limit, 'feed_2');
      }

      if (searchResults && searchResults.length > 0) {
        allResults = await enrichProductsWithMetadata(searchResults);
      }
    }

    if (allResults.length === 0) {
      return [];
    }

    return allResults;

  } catch (error) {
    console.error('❌ Chyba v hybridním produktovém vyhledávání:', error);
    return [];
  }
}

/**
 * Fallback - čistě sémantické vyhledávání
 */
async function getPureSemanticRecommendations(
  query: string,
  queryEmbedding: number[],
  limit: number,
  feedSource: string | null = null
): Promise<HybridProductRecommendation[]> {
  try {
    const { data: searchResults, error } = await supabase.rpc(
      'search_products_by_vector',
      {
        query_embedding: queryEmbedding,
        similarity_threshold: 0.5,
        max_results: limit,
        filter_feed_source: feedSource
      }
    );

    if (error) {
      console.error('❌ Chyba při čistě sémantickém vyhledávání:', error);
      return [];
    }

    if (!searchResults || searchResults.length === 0) {
      return [];
    }


    return searchResults.map((result: any) => ({
      id: result.id || 0,
      product_code: result.product_code,
      product_name: result.product_name,
      description: result.description,
      category: result.category,
      price: result.price,
      currency: result.currency,
      product_url: result.product_url,
      image_url: result.image_url,
      similarity_score: result.similarity_score,
    }));
  } catch (error) {
    console.error('❌ Kritická chyba při fallback vyhledávání:', error);
    return [];
  }
}

/**
 * Obohacení produktů o aktuální metadata z tabulek products a product_feed_2
 */
async function enrichProductsWithMetadata(
  searchResults: any[]
): Promise<HybridProductRecommendation[]> {
  const enrichedProducts: HybridProductRecommendation[] = [];

  for (const result of searchResults) {
    try {
      const productCode = result.product_code;
      let metadata: any = null;

      // Zjistíme feed_source z product_embeddings
      const { data: embeddingData } = await supabase
        .from('product_embeddings')
        .select('feed_source')
        .eq('product_code', productCode)
        .single();

      const feedSource = embeddingData?.feed_source || 'feed_1';

      // Načteme aktuální metadata podle feed_source
      if (feedSource === 'feed_2') {
        const { data: feed2Data } = await supabase
          .from('product_feed_2')
          .select('*')
          .eq('product_code', productCode)
          .single();
        
        metadata = feed2Data;
      } else {
        const { data: feed1Data } = await supabase
          .from('products')
          .select('*')
          .eq('product_code', productCode)
          .single();
        
        metadata = feed1Data;
      }

      // Sestavíme finální produkt
      enrichedProducts.push({
        id: metadata?.id || result.id || 0,
        product_code: productCode,
        product_name: metadata?.product_name || metadata?.name || result.product_name,
        description: metadata?.description_short || metadata?.description || result.description,
        category: metadata?.category || result.category,
        price: metadata?.price || result.price,
        currency: metadata?.currency || result.currency || 'CZK',
        product_url: metadata?.url || metadata?.product_url || result.product_url,
        image_url: metadata?.thumbnail || metadata?.image_url || result.image_url,
        similarity_score: result.similarity_score || result.combined_score || 0,
        feed_source: feedSource
      });

    } catch (error) {
      console.error(`⚠️ Chyba při obohacení produktu ${result.product_code}:`, error);
      
      // Pokud selže obohacení, použijeme základní data ze search results
      enrichedProducts.push({
        id: result.id || 0,
        product_code: result.product_code,
        product_name: result.product_name,
        description: result.description,
        category: result.category,
        price: result.price,
        currency: result.currency || 'CZK',
        product_url: result.product_url,
        image_url: result.image_url,
        similarity_score: result.similarity_score || result.combined_score || 0
      });
    }
  }

  return enrichedProducts;
}

/**
 * Vyhledání produktů z více zdrojů (feed_1 a feed_2)
 */
export async function getRecommendationsFromMultipleSources(
  query: string,
  sources: string[]
): Promise<HybridProductRecommendation[]> {
  // Tato funkce nyní používá hlavní getHybridProductRecommendations
  // která automaticky vyhledává ve všech zdrojích
  return getHybridProductRecommendations(query, undefined, 10);
}
