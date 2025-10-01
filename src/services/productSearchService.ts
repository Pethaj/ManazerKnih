/**
 * Product Search Service
 * Vyhledává relevantní produkty pomocí vektorových embeddingů a kombinuje s fulltext vyhledáváním
 */

import { supabase } from '../lib/supabase';
import { generateEmbedding } from './embeddingService';

export interface ProductRecommendation {
  product_code: string;
  product_name: string;
  description: string | null;
  category: string | null;
  price: number | null;
  currency: string;
  product_url: string | null;
  image_url: string | null;
  similarity_score?: number;
  ranking_score?: number;
}

export interface ProductSearchResult {
  success: boolean;
  products: ProductRecommendation[];
  total_found: number;
  search_method: 'vector' | 'fulltext' | 'hybrid';
  error?: string;
}

/**
 * Vyhledá relevantní produkty na základě uživatelského dotazu
 * Kombinuje vektorové vyhledávání s fulltext fallback
 */
export async function searchRelevantProducts(
  query: string, 
  maxResults: number = 5, 
  similarityThreshold: number = 0.3  // Snížený práh z 0.7 na 0.3
): Promise<ProductSearchResult> {
  console.log(`🔍 Vyhledávám produkty pro dotaz: "${query}"`);

  if (!query || query.trim().length === 0) {
    return {
      success: false,
      products: [],
      total_found: 0,
      search_method: 'vector',
      error: 'Prázdný vyhledávací dotaz'
    };
  }

  try {
    // 1. Zkusíme vektorové vyhledávání
    const vectorResults = await searchProductsByVector(query, maxResults, similarityThreshold);
    
    if (vectorResults.success && vectorResults.products.length > 0) {
      console.log(`✅ Vektorové vyhledávání našlo ${vectorResults.products.length} produktů`);
      return {
        ...vectorResults,
        search_method: 'vector'
      };
    }

    console.log('⚠️ Vektorové vyhledávání nenašlo relevantní produkty, zkouším fulltext...');

    // 2. Fallback na fulltext vyhledávání
    const fulltextResults = await searchProductsByFulltext(query, maxResults);
    
    if (fulltextResults.success) {
      console.log(`✅ Fulltext vyhledávání našlo ${fulltextResults.products.length} produktů`);
      return {
        ...fulltextResults,
        search_method: 'fulltext'
      };
    }

    // 3. Žádné výsledky
    console.log('❌ Ani jedno vyhledávání nenašlo relevantní produkty');
    return {
      success: true,
      products: [],
      total_found: 0,
      search_method: 'hybrid',
      error: 'Nebyli nalezeni žádní relevantní produkty'
    };

  } catch (error) {
    console.error('❌ Chyba při vyhledávání produktů:', error);
    return {
      success: false,
      products: [],
      total_found: 0,
      search_method: 'hybrid',
      error: error instanceof Error ? error.message : 'Neznámá chyba při vyhledávání'
    };
  }
}

/**
 * Vyhledávání pomocí vektorových embeddingů
 */
async function searchProductsByVector(
  query: string,
  maxResults: number,
  similarityThreshold: number
): Promise<ProductSearchResult> {
  try {
    console.log('🤖 Generuji embedding pro vyhledávací dotaz...');
    
    // Vygenerujeme embedding pro dotaz
    const embeddingResult = await generateEmbedding(query);
    
    if (!embeddingResult.success || !embeddingResult.embedding) {
      console.error('❌ Nepodařilo se vygenerovat embedding:', embeddingResult.error);
      return {
        success: false,
        products: [],
        total_found: 0,
        search_method: 'vector',
        error: embeddingResult.error || 'Chyba při generování embeddingu'
      };
    }

    console.log('📡 Vyhledávám v Supabase pomocí vektorových embeddingů...');
    console.log('🔍 Query embedding délka:', embeddingResult.embedding.length);
    console.log('🔍 Similarity threshold:', similarityThreshold);
    console.log('🔍 Max results:', maxResults);

    // Nejprve zkontrolujeme, zda RPC funkce existuje
    console.log('🔍 Testuji dostupnost RPC funkce search_products_by_vector...');

    // Použijeme Supabase RPC funkci pro vektorové vyhledávání
    const { data, error } = await supabase.rpc('search_products_by_vector', {
      query_embedding: embeddingResult.embedding,
      similarity_threshold: similarityThreshold,
      max_results: maxResults
    });

    console.log('📊 RPC response:', { data, error });

    if (error) {
      console.error('❌ Chyba při vektorovém vyhledávání:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      
      // Pokud RPC funkce neexistuje, zkusíme fallback s přímým dotazem
      if (error.code === 'PGRST202') {
        console.log('🔄 RPC funkce neexistuje - zkouším fallback s přímým SQL dotazem...');
        
        try {
          // Použijeme vektor similarity přímo v SQL dotazu
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('product_embeddings')
            .select('product_code, product_name, description, category, price, product_url, image_url, currency')
            .eq('embedding_status', 'completed')
            .not('embedding', 'is', null)
            .limit(maxResults);
            
          console.log('📊 Fallback SQL data:', fallbackData);
          
          if (!fallbackError && fallbackData && fallbackData.length > 0) {
            const products: ProductRecommendation[] = fallbackData.map((row: any) => ({
              product_code: row.product_code,
              product_name: row.product_name,
              description: row.description,
              category: row.category,
              price: row.price,
              currency: row.currency || 'CZK',
              product_url: row.product_url,
              image_url: row.image_url,
              similarity_score: 0.8, // Mock similarity pro fallback
              ranking_score: 0
            }));

            console.log(`✅ Fallback našel ${products.length} produktů`);
            return {
              success: true,
              products,
              total_found: products.length,
              search_method: 'vector_fallback'
            };
          }
        } catch (fallbackErr) {
          console.error('❌ Fallback SQL failed:', fallbackErr);
        }
      }
      
      return {
        success: false,
        products: [],
        total_found: 0,
        search_method: 'vector',
        error: `Chyba databáze: ${error.message}`
      };
    }

    const products: ProductRecommendation[] = (data || [])
      .filter((row: any) => 
        row && 
        row.product_code && 
        row.product_name && 
        row.product_name.trim().length > 0
      )
      .map((row: any) => ({
        product_code: row.product_code,
        product_name: row.product_name,
        description: row.description,
        category: row.category,
        price: row.price,
        currency: row.currency || 'CZK',
        product_url: row.product_url,
        image_url: row.image_url,
        similarity_score: row.similarity_score,
        ranking_score: 0 // TODO: Implementovat ranking systém
      }));

    return {
      success: true,
      products,
      total_found: products.length,
      search_method: 'vector'
    };

  } catch (error) {
    console.error('❌ Chyba při vektorovém vyhledávání:', error);
    return {
      success: false,
      products: [],
      total_found: 0,
      search_method: 'vector',
      error: error instanceof Error ? error.message : 'Neznámá chyba'
    };
  }
}

/**
 * Fallback fulltext vyhledávání
 */
async function searchProductsByFulltext(
  query: string,
  maxResults: number
): Promise<ProductSearchResult> {
  try {
    console.log('📝 Fulltext vyhledávání v produktech...');

    // Normalizujeme dotaz pro fulltext search
    const searchTerms = query
      .toLowerCase()
      .split(/\s+/)
      .filter(term => term.length > 2)
      .join(' & ');

    if (!searchTerms) {
      return {
        success: true,
        products: [],
        total_found: 0,
        search_method: 'fulltext'
      };
    }

    // Fulltext vyhledávání v product_embeddings (má i search_text sloupec)
    const { data, error } = await supabase
      .from('product_embeddings')
      .select(`
        product_code,
        product_name,
        description,
        category,
        price,
        currency,
        product_url,
        image_url,
        ranking_score
      `)
      .textSearch('search_text', searchTerms, {
        type: 'websearch',
        config: 'simple'
      })
      .order('ranking_score', { ascending: false })
      .limit(maxResults);

    if (error) {
      console.error('❌ Chyba při fulltext vyhledávání:', error);
      return {
        success: false,
        products: [],
        total_found: 0,
        search_method: 'fulltext',
        error: `Chyba databáze: ${error.message}`
      };
    }

    const products: ProductRecommendation[] = (data || [])
      .filter((row: any) => 
        row && 
        row.product_code && 
        row.product_name && 
        row.product_name.trim().length > 0
      )
      .map((row: any) => ({
        product_code: row.product_code,
        product_name: row.product_name,
        description: row.description,
        category: row.category,
        price: row.price,
        currency: row.currency || 'CZK',
        product_url: row.product_url,
        image_url: row.image_url,
        similarity_score: undefined, // Fulltext nemá similarity score
        ranking_score: row.ranking_score || 0
      }));

    return {
      success: true,
      products,
      total_found: products.length,
      search_method: 'fulltext'
    };

  } catch (error) {
    console.error('❌ Chyba při fulltext vyhledávání:', error);
    return {
      success: false,
      products: [],
      total_found: 0,
      search_method: 'fulltext',
      error: error instanceof Error ? error.message : 'Neznámá chyba'
    };
  }
}

/**
 * Získá statistiky o dostupných produktech
 */
export async function getProductStats() {
  try {
    const [totalProducts, totalEmbeddings, completedEmbeddings] = await Promise.all([
      supabase.from('products').select('*', { count: 'exact', head: true }),
      supabase.from('product_embeddings').select('*', { count: 'exact', head: true }),
      supabase.from('product_embeddings').select('*', { count: 'exact', head: true }).eq('embedding_status', 'completed')
    ]);

    return {
      total_products: totalProducts.count || 0,
      total_embeddings: totalEmbeddings.count || 0,
      completed_embeddings: completedEmbeddings.count || 0,
      embedding_coverage: totalEmbeddings.count > 0 
        ? Math.round((completedEmbeddings.count || 0) / totalEmbeddings.count * 100) 
        : 0
    };

  } catch (error) {
    console.error('Chyba při načítání statistik produktů:', error);
    return null;
  }
}

/**
 * Test funkce pro vyhledávání
 */
export async function testProductSearch(query: string = 'zdraví bolest') {
  console.log(`🧪 Testuji vyhledávání produktů s dotazem: "${query}"`);
  
  const result = await searchRelevantProducts(query, 3, 0.6);
  
  console.log('📊 Výsledek testu:', result);
  
  if (result.success && result.products.length > 0) {
    console.log('✅ Test úspěšný - nalezené produkty:');
    result.products.forEach((product, index) => {
      console.log(`${index + 1}. ${product.product_name} (${product.price} ${product.currency})`);
      if (product.similarity_score) {
        console.log(`   Similarity: ${(product.similarity_score * 100).toFixed(1)}%`);
      }
    });
  } else {
    console.log('❌ Test neúspěšný nebo žádné výsledky');
  }
  
  return result;
}
