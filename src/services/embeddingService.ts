/**
 * OpenAI Embedding Service
 * Generuje embeddingy pomocí text-embedding-3-small modelu přes OpenAI API
 */

import { supabase } from '../lib/supabase';

// OpenAI API klíč
const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;

export interface PendingEmbedding {
  id: number;
  product_code: string;
  product_name: string;
  description: string | null;
  category: string | null;
  search_text: string | null;
}

export interface EmbeddingResult {
  success: boolean;
  embedding?: number[];
  error?: string;
}

export interface BatchProcessResult {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  errors: string[];
}

/**
 * Získá produkty čekající na embedding z Supabase
 */
export async function getPendingEmbeddings(batchSize: number = 10): Promise<PendingEmbedding[]> {
  try {
    const { data, error } = await supabase
      .from('product_embeddings')
      .select('id, product_code, product_name, description, category, search_text')
      .eq('embedding_status', 'pending')
      .order('created_at', { ascending: true })
      .limit(batchSize);

    if (error) {
      console.error('Chyba při načítání pending embeddingů:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Chyba při načítání pending embeddingů:', error);
    return [];
  }
}

/**
 * Generuje embedding pro daný text pomocí OpenAI API
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  console.log('🤖 Generuji embedding pro text:', text.substring(0, 100) + '...');
  
  if (!openaiApiKey) {
    console.error('❌ OpenAI API klíč není nastaven');
    return {
      success: false,
      error: 'OpenAI API klíč není nastaven'
    };
  }

  if (!text || text.trim().length === 0) {
    console.error('❌ Prázdný text pro embedding');
    return {
      success: false,
      error: 'Prázdný text pro embedding'
    };
  }

  try {
    console.log('📡 Posílám request na OpenAI...');
    
    const requestBody = {
      model: 'text-embedding-3-small',
      input: text.trim(),
      encoding_format: 'float'
    };
    
    console.log('📦 Request body:', requestBody);

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
    });

    console.log('📡 Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('❌ OpenAI API error:', { status: response.status, errorData });
      return {
        success: false,
        error: `OpenAI API chyba: ${response.status} - ${errorData?.error?.message || response.statusText}`
      };
    }

    const data = await response.json();
    console.log('📊 OpenAI response:', data);
    
    if (!data.data || !data.data[0] || !data.data[0].embedding) {
      console.error('❌ Neplatná struktura odpovědi:', data);
      return {
        success: false,
        error: 'Neplatná odpověď z OpenAI API - chybí embedding data'
      };
    }

    const embedding = data.data[0].embedding;
    console.log(`✅ Embedding vygenerován! Délka: ${embedding.length} dimenzí`);

    return {
      success: true,
      embedding: embedding
    };

  } catch (error) {
    console.error('❌ Chyba při volání OpenAI API:', error);
    return {
      success: false,
      error: `Chyba při volání OpenAI API: ${error instanceof Error ? error.message : 'Neznámá chyba'}`
    };
  }
}

/**
 * Uloží embedding do Supabase
 */
export async function saveEmbedding(
  id: number, 
  embedding: number[], 
  status: 'completed' | 'error' = 'completed'
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('product_embeddings')
      .update({
        embedding: `[${embedding.join(',')}]`, // PostgreSQL vector format
        embedding_status: status,
        embedding_generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('Chyba při ukládání embeddingu:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Chyba při ukládání embeddingu:', error);
    return false;
  }
}

/**
 * Označí embedding jako chybný
 */
export async function markEmbeddingError(id: number, errorMessage: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('product_embeddings')
      .update({
        embedding_status: 'error',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('Chyba při označování embeddingu jako error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Chyba při označování embeddingu jako error:', error);
    return false;
  }
}

/**
 * Zpracuje batch embeddingů
 */
export async function processBatchEmbeddings(
  batchSize: number = 10,
  onProgress?: (current: number, total: number, productName: string) => void
): Promise<BatchProcessResult> {
  const result: BatchProcessResult = {
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0,
    errors: []
  };

  try {
    // Získej pending embeddingy
    const pendingItems = await getPendingEmbeddings(batchSize);
    result.total = pendingItems.length;

    if (pendingItems.length === 0) {
      return result;
    }

    console.log(`🚀 Začínám zpracovávat ${pendingItems.length} embeddingů...`);

    // Zpracuj každý položku
    for (const item of pendingItems) {
      try {
        result.processed++;
        
        // Progress callback
        if (onProgress) {
          onProgress(result.processed, result.total, item.product_name);
        }

        console.log(`📝 Zpracovávám: ${item.product_name} (${result.processed}/${result.total})`);

        // Připrav text pro embedding
        const textForEmbedding = item.search_text || 
          `${item.product_name} ${item.description || ''} ${item.category || ''}`.trim();

        if (!textForEmbedding) {
          result.failed++;
          result.errors.push(`${item.product_name}: Prázdný text pro embedding`);
          await markEmbeddingError(item.id, 'Prázdný text');
          continue;
        }

        // Vygeneruj embedding
        const embeddingResult = await generateEmbedding(textForEmbedding);

        if (!embeddingResult.success || !embeddingResult.embedding) {
          result.failed++;
          const error = embeddingResult.error || 'Neznámá chyba';
          result.errors.push(`${item.product_name}: ${error}`);
          await markEmbeddingError(item.id, error);
          continue;
        }

        // Ulož embedding
        const saveSuccess = await saveEmbedding(item.id, embeddingResult.embedding);

        if (saveSuccess) {
          result.successful++;
          console.log(`✅ Úspěšně uložen embedding pro: ${item.product_name}`);
        } else {
          result.failed++;
          result.errors.push(`${item.product_name}: Chyba při ukládání do databáze`);
          await markEmbeddingError(item.id, 'Chyba při ukládání');
        }

        // Malá pauza mezi requesty (OpenRouter rate limiting)
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        result.failed++;
        const errorMsg = error instanceof Error ? error.message : 'Neznámá chyba';
        result.errors.push(`${item.product_name}: ${errorMsg}`);
        await markEmbeddingError(item.id, errorMsg);
      }
    }

    console.log(`🏁 Batch dokončen: ${result.successful} úspěšných, ${result.failed} chybných`);
    return result;

  } catch (error) {
    console.error('Chyba při zpracování batch embeddingů:', error);
    result.errors.push(error instanceof Error ? error.message : 'Neznámá chyba při zpracování batch');
    return result;
  }
}

/**
 * Získá statistiky embeddingů
 */
export async function getEmbeddingStats() {
  try {
    // Alternativní způsob - jednotlivé dotazy
    const [pending, completed, errorCount, total] = await Promise.all([
      supabase.from('product_embeddings').select('*', { count: 'exact', head: true }).eq('embedding_status', 'pending'),
      supabase.from('product_embeddings').select('*', { count: 'exact', head: true }).eq('embedding_status', 'completed'),
      supabase.from('product_embeddings').select('*', { count: 'exact', head: true }).eq('embedding_status', 'error'),
      supabase.from('product_embeddings').select('*', { count: 'exact', head: true })
    ]);

    return {
      total: total.count || 0,
      pending: pending.count || 0,
      completed: completed.count || 0,
      error: errorCount.count || 0
    };

  } catch (error) {
    console.error('Chyba při načítání statistik:', error);
    return null;
  }
}