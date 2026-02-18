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
 * Prioritní kategorie pro řazení produktů BEWIT
 * Pokud jsou nalezeny produkty ze všech těchto kategorií, zobrazí se v tomto pořadí:
 * 1. Směsi esenciálních olejů (nejvyšší priorita)
 * 2. PRAWTEIN - superpotravinové směsi
 * 3. TČM - Tradiční čínská medicína
 */
const PRIORITY_CATEGORIES = [
  'Směsi esenciálních olejů',
  'PRAWTEIN® – superpotravinové směsi',
  'TČM - Tradiční čínská medicína'
];

/**
 * Vrací prioritu kategorie (nižší číslo = vyšší priorita)
 * @param category - Kategorie produktu
 * @returns Číslo priority (0 = nejvyšší, 999 = žádná priorita)
 */
function getCategoryPriority(category: string | undefined): number {
  if (!category) return 999;
  
  const index = PRIORITY_CATEGORIES.findIndex(priorityCategory => {
    const categoryLower = category.toLowerCase();
    const priorityLower = priorityCategory.toLowerCase();
    
    return categoryLower.includes(priorityLower) || priorityLower.includes(categoryLower);
  });
  
  return index === -1 ? 999 : index;
}

/**
 * Seřadí produkty podle prioritních kategorií a similarity score
 * @param products - Pole produktů k seřazení
 * @returns Seřazené produkty
 */
function sortProductsByPriorityCategories(
  products: HybridProductRecommendation[]
): HybridProductRecommendation[] {
  return products.sort((a, b) => {
    const priorityA = getCategoryPriority(a.category);
    const priorityB = getCategoryPriority(b.category);
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    return (b.similarity_score || 0) - (a.similarity_score || 0);
  });
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
 * @param allowedCategories - Povolené kategorie pro filtrování (prázdné pole = všechny povoleny)
 */
export async function getHybridProductRecommendations(
  query: string,
  sessionId?: string,
  limit: number = 10,
  useFeed1: boolean = true,
  useFeed2: boolean = true,
  allowedCategories: string[] = []
): Promise<HybridProductRecommendation[]> {
  try {

    // Pokud nejsou povoleny žádné feedy, vrátíme prázdný výsledek
    if (!useFeed1 && !useFeed2) {
      return [];
    }

    // 1. Vygenerujeme embedding z dotazu uživatele
    // Poznámka: generateEmbedding zatím vrací mock data, embeddingy se generují přes n8n
    // Pro nyní použijeme jen textové vyhledávání nebo mock embedding
    const queryEmbedding = await generateEmbedding(query);
    

    let allResults: HybridProductRecommendation[] = [];

    // Připravíme kategorie pro SQL funkci (null pokud je pole prázdné)
    const filterCategories = allowedCategories.length > 0 ? allowedCategories : null;


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
          filter_feed_source: null, // null = vyhledávat ve všech feedech
          filter_categories: filterCategories // 🆕 Filtrování podle kategorií
        }
      );

      if (searchError) {
        return await getPureSemanticRecommendations(query, queryEmbedding, limit, null, filterCategories);
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
          filter_feed_source: 'feed_1',
          filter_categories: filterCategories // 🆕 Filtrování podle kategorií
        }
      );

      if (searchError) {
        return await getPureSemanticRecommendations(query, queryEmbedding, limit, 'feed_1', filterCategories);
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
          filter_feed_source: 'feed_2',
          filter_categories: filterCategories // 🆕 Filtrování podle kategorií
        }
      );

      if (searchError) {
        return await getPureSemanticRecommendations(query, queryEmbedding, limit, 'feed_2', filterCategories);
      }

      if (searchResults && searchResults.length > 0) {
        allResults = await enrichProductsWithMetadata(searchResults);
      }
    }

    if (allResults.length === 0) {
      return [];
    }

    // 3. Seřadíme produkty podle prioritních kategorií
    const sortedResults = sortProductsByPriorityCategories(allResults);

    return sortedResults;

  } catch (error) {
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
  feedSource: string | null = null,
  filterCategories: string[] | null = null
): Promise<HybridProductRecommendation[]> {
  try {
    const { data: searchResults, error } = await supabase.rpc(
      'search_products_by_vector',
      {
        query_embedding: queryEmbedding,
        similarity_threshold: 0.5,
        max_results: limit,
        filter_feed_source: feedSource,
        filter_categories: filterCategories // 🆕 Filtrování podle kategorií
      }
    );

    if (error) {
      return [];
    }

    if (!searchResults || searchResults.length === 0) {
      return [];
    }

    const products = searchResults.map((result: any) => ({
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

    return sortProductsByPriorityCategories(products);
  } catch (error) {
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
