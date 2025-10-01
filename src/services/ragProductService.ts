/**
 * RAG Product Service
 * Implementuje plný RAG systém pro produktové vyhledávání podle Supabase dokumentace
 * https://supabase.com/docs/guides/ai/hybrid-search
 */

import { createClient } from '@supabase/supabase-js';
import { generateEmbedding } from './embeddingService';
import { generateProductResponse } from './gptService';

// Supabase konfigurace
const supabaseUrl = 'https://modopafybeslbcqjxsve.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZG9wYWZ5YmVzbGJjcWp4c3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNTM0MjEsImV4cCI6MjA3MDgyOTQyMX0.8gxL0b9flTUyoltiEIJx8Djuiyx16rySlffHkd_nm1U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface ProductChunk {
  chunk_text: string;
  product_info: {
    product_code: string;
    product_name: string;
    category: string | null;
    price: number | null;
    currency: string | null;
    product_url: string | null;
    image_url: string | null;
  };
  similarity_score: number;
}

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
}

export interface HybridSearchResult {
  product_code: string;
  product_name: string;
  description: string | null;
  category: string | null;
  price: number | null;
  currency: string;
  product_url: string | null;
  image_url: string | null;
  similarity_score: number;
  keyword_rank: number;
  semantic_rank: number;
  combined_score: number;
}

export interface RAGResponse {
  success: boolean;
  response_text: string;
  relevant_products: ProductRecommendation[];
  chunks_used: ProductChunk[];
  search_method: 'vector' | 'hybrid' | 'fallback';
  error?: string;
}

/**
 * Získá produktové chunky pro RAG zpracování
 */
export async function getProductChunksForRAG(
  query: string,
  similarityThreshold: number = 0.6,
  maxChunks: number = 5
): Promise<{ success: boolean; chunks: ProductChunk[]; error?: string }> {
  
  console.log('🔍 RAG: Vyhledávám chunky pro dotaz:', query);
  
  try {
    // 1. Vygenerujeme embedding pro dotaz
    const embeddingResult = await generateEmbedding(query);
    
    if (!embeddingResult.success || !embeddingResult.embedding) {
      console.error('❌ RAG: Nepodařilo se vygenerovat embedding:', embeddingResult.error);
      return {
        success: false,
        chunks: [],
        error: embeddingResult.error || 'Chyba při generování embeddingu'
      };
    }

    console.log('📡 RAG: Volám get_product_chunks_for_rag...');
    
    // 2. Zavoláme RPC funkci pro získání chunků
    const { data, error } = await supabase.rpc('get_product_chunks_for_rag', {
      query_embedding: embeddingResult.embedding,
      similarity_threshold: similarityThreshold,
      max_chunks: maxChunks
    });

    if (error) {
      console.error('❌ RAG: Chyba při volání RPC funkce:', error);
      return {
        success: false,
        chunks: [],
        error: `Chyba při vyhledávání chunků: ${error.message}`
      };
    }

    if (!data || data.length === 0) {
      console.log('⚠️ RAG: Žádné chunky nenalezeny');
      return {
        success: true,
        chunks: [],
        error: 'Žádné relevantní produkty nenalezeny'
      };
    }

    console.log(`✅ RAG: Nalezeno ${data.length} chunků`);
    
    return {
      success: true,
      chunks: data.map((chunk: any) => ({
        chunk_text: chunk.chunk_text,
        product_info: chunk.product_info,
        similarity_score: chunk.similarity_score
      }))
    };

  } catch (error) {
    console.error('❌ RAG: Unexpected error:', error);
    return {
      success: false,
      chunks: [],
      error: `Neočekávaná chyba: ${error}`
    };
  }
}

/**
 * Hybridní vyhledávání (keyword + semantic) podle Supabase dokumentace
 */
export async function hybridProductSearch(
  query: string,
  matchCount: number = 10,
  fullTextWeight: number = 1,
  semanticWeight: number = 1,
  rrfK: number = 50
): Promise<{ success: boolean; results: HybridSearchResult[]; error?: string }> {
  
  console.log('🔍 HYBRID: Spouštím hybridní vyhledávání pro:', query);
  
  try {
    // 1. Vygenerujeme embedding pro dotaz
    const embeddingResult = await generateEmbedding(query);
    
    if (!embeddingResult.success || !embeddingResult.embedding) {
      console.error('❌ HYBRID: Nepodařilo se vygenerovat embedding:', embeddingResult.error);
      return {
        success: false,
        results: [],
        error: embeddingResult.error || 'Chyba při generování embeddingu'
      };
    }

    console.log('📡 HYBRID: Volám hybrid_product_search...');
    
    // 2. Zavoláme hybridní RPC funkci
    const { data, error } = await supabase.rpc('hybrid_product_search', {
      query_text: query,
      query_embedding: embeddingResult.embedding,
      match_count: matchCount,
      full_text_weight: fullTextWeight,
      semantic_weight: semanticWeight,
      rrf_k: rrfK
    });

    if (error) {
      console.error('❌ HYBRID: Chyba při volání RPC funkce:', error);
      return {
        success: false,
        results: [],
        error: `Chyba při hybridním vyhledávání: ${error.message}`
      };
    }

    if (!data || data.length === 0) {
      console.log('⚠️ HYBRID: Žádné výsledky nenalezeny');
      return {
        success: true,
        results: [],
        error: 'Žádné relevantní produkty nenalezeny'
      };
    }

    console.log(`✅ HYBRID: Nalezeno ${data.length} výsledků`);
    
    return {
      success: true,
      results: data
    };

  } catch (error) {
    console.error('❌ HYBRID: Unexpected error:', error);
    return {
      success: false,
      results: [],
      error: `Neočekávaná chyba: ${error}`
    };
  }
}

/**
 * Kompletní RAG pipeline: Vyhledá chunky + zpracuje LLM + vrátí odpověď s produkty
 */
export async function processRAGQuery(
  query: string,
  useHybridSearch: boolean = true,
  maxChunks: number = 5,
  maxProducts: number = 6
): Promise<RAGResponse> {
  
  console.log('🚀 RAG PIPELINE: Zpracovávám dotaz:', query);
  console.log('🔧 RAG PIPELINE: Hybrid search:', useHybridSearch);
  
  try {
    let chunks: ProductChunk[] = [];
    let searchMethod: 'vector' | 'hybrid' | 'fallback' = 'vector';
    
    if (useHybridSearch) {
      console.log('🔄 RAG PIPELINE: Používám hybridní vyhledávání...');
      searchMethod = 'hybrid';
      
      // Použijeme hybridní vyhledávání pro získání produktů
      const hybridResult = await hybridProductSearch(query, maxProducts);
      
      if (hybridResult.success && hybridResult.results.length > 0) {
        // Převedeme hybridní výsledky na chunky
        chunks = hybridResult.results.map(result => ({
          chunk_text: `Produkt: ${result.product_name}${result.description ? `. Popis: ${result.description}` : ''}${result.category ? `. Kategorie: ${result.category}` : ''}${result.price ? `. Cena: ${result.price} ${result.currency}` : ''}`,
          product_info: {
            product_code: result.product_code,
            product_name: result.product_name,
            category: result.category,
            price: result.price,
            currency: result.currency,
            product_url: result.product_url,
            image_url: result.image_url
          },
          similarity_score: result.similarity_score
        }));
      } else {
        console.log('⚠️ RAG PIPELINE: Hybridní vyhledávání neúspěšné, fallback na vektorové...');
        searchMethod = 'vector';
      }
    }
    
    // Fallback na čisté vektorové vyhledávání
    if (chunks.length === 0) {
      console.log('🔄 RAG PIPELINE: Používám vektorové vyhledávání chunků...');
      const chunksResult = await getProductChunksForRAG(query, 0.6, maxChunks);
      
      if (chunksResult.success) {
        chunks = chunksResult.chunks;
      } else {
        console.error('❌ RAG PIPELINE: Vektorové vyhledávání selhalo:', chunksResult.error);
        searchMethod = 'fallback';
      }
    }

    if (chunks.length === 0) {
      console.log('❌ RAG PIPELINE: Žádné chunky nenalezeny');
      return {
        success: false,
        response_text: '🔍 Bohužel jsem nenašel žádné produkty odpovídající vašemu dotazu. Zkuste prosím jiné klíčové slovo.',
        relevant_products: [],
        chunks_used: [],
        search_method: searchMethod,
        error: 'Žádné relevantní produkty nenalezeny'
      };
    }

    console.log(`📚 RAG PIPELINE: Zpracovávám ${chunks.length} chunků pomocí LLM...`);
    
    // Připravíme kontext pro LLM
    const context = chunks.map((chunk, index) => 
      `[Produkt ${index + 1}] ${chunk.chunk_text} (Relevance: ${(chunk.similarity_score * 100).toFixed(1)}%)`
    ).join('\n\n');

    console.log('📝 RAG PIPELINE: Context pro LLM:', context.substring(0, 200) + '...');

    // Zpracujeme dotaz pomocí GPT - předáme kontext jako systémovou zprávu
    const contextMessage = {
      role: 'system' as const,
      content: `Dostupné produkty pro odpověď:\n\n${context}`
    };
    const gptResult = await generateProductResponse(query, [contextMessage]);
    
    if (!gptResult.success) {
      console.error('❌ RAG PIPELINE: GPT zpracování selhalo:', gptResult.error);
      return {
        success: false,
        response_text: '❌ Omlouváme se, došlo k chybě při zpracování vašeho dotazu.',
        relevant_products: [],
        chunks_used: chunks,
        search_method: searchMethod,
        error: gptResult.error
      };
    }

    // Připravíme produkty pro carousel
    const products: ProductRecommendation[] = chunks.map(chunk => ({
      product_code: chunk.product_info.product_code,
      product_name: chunk.product_info.product_name,
      description: null, // Popis už je v chunk_text
      category: chunk.product_info.category,
      price: chunk.product_info.price,
      currency: chunk.product_info.currency || 'CZK',
      product_url: chunk.product_info.product_url,
      image_url: chunk.product_info.image_url,
      similarity_score: chunk.similarity_score
    }));

    console.log(`✅ RAG PIPELINE: Úspěšně zpracováno! Response: ${gptResult.response?.substring(0, 100)}...`);

    return {
      success: true,
      response_text: gptResult.response || '🛍️ Zde jsou produkty, které by vás mohly zajímat:',
      relevant_products: products,
      chunks_used: chunks,
      search_method: searchMethod
    };

  } catch (error) {
    console.error('❌ RAG PIPELINE: Neočekávaná chyba:', error);
    return {
      success: false,
      response_text: '❌ Omlouváme se, došlo k neočekávané chybě.',
      relevant_products: [],
      chunks_used: [],
      search_method: 'fallback',
      error: `Neočekávaná chyba: ${error}`
    };
  }
}

/**
 * Testovací funkce pro rychlé ověření RAG systému
 */
export async function testRAGSystem(): Promise<void> {
  console.log('🧪 Testuji RAG systém...');
  
  const testQueries = [
    'aromaterapie',
    'bolí mě hlava',
    'vitamíny',
    'probiotika'
  ];

  for (const query of testQueries) {
    console.log(`\n🔍 Test dotazu: "${query}"`);
    const result = await processRAGQuery(query, true, 3, 4);
    console.log(`📊 Výsledek: ${result.success ? 'ÚSPĚCH' : 'SELHÁNÍ'}`);
    console.log(`📝 Response: ${result.response_text.substring(0, 100)}...`);
    console.log(`🛍️ Produkty: ${result.relevant_products.length}`);
    console.log(`📚 Chunky: ${result.chunks_used.length}`);
    console.log(`🔧 Metoda: ${result.search_method}`);
  }
}
