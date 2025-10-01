/**
 * 🧪 JEDNODUCHÉ TESTOVÁNÍ VEKTOROVÉHO VYHLEDÁVÁNÍ
 * 
 * Tento soubor obsahuje funkce pro základní testování zda:
 * 1. Fungují RPC funkce v Supabase
 * 2. Jsou vygenerované embeddingy
 * 3. Vektorové vyhledávání vrací relevantní výsledky
 */

import { supabase } from '../lib/supabase';
import { generateEmbedding } from './embeddingService';

// Test 1: Zkontroluj dostupné RPC funkce
export async function testAvailableRPCFunctions() {
    console.log('🔍 TEST 1: Kontrola dostupných RPC funkcí...');
    
    const functions = [
        'search_products_by_vector',
        'hybrid_product_search', 
        'get_product_chunks_for_rag'
    ];
    
    const results: Record<string, boolean> = {};
    
    for (const func of functions) {
        try {
            // Pokusíme se zavolat funkci s neplatnými parametry - chyba nám řekne zda funkce existuje
            const { error } = await supabase.rpc(func as any);
            
            if (error && error.message.includes('function') && error.message.includes('does not exist')) {
                console.log(`❌ ${func}: NEEXISTUJE`);
                results[func] = false;
            } else {
                console.log(`✅ ${func}: EXISTUJE`);
                results[func] = true;
            }
        } catch (e) {
            console.log(`✅ ${func}: EXISTUJE (chyba parametrů, ale funkce je tam)`);
            results[func] = true;
        }
    }
    
    return results;
}

// Test 2: Spočítej embeddingy v databázi
export async function testEmbeddingCount() {
    console.log('🔍 TEST 2: Počet embeddingů v databázi...');
    
    try {
        const { count, error } = await supabase
            .from('product_embeddings')
            .select('*', { count: 'exact', head: true })
            .not('embedding', 'is', null)
            .eq('embedding_status', 'completed');
            
        if (error) {
            console.log('❌ Chyba při počítání embeddingů:', error);
            return 0;
        }
        
        console.log(`📊 Počet dokončených embeddingů: ${count || 0}`);
        return count || 0;
    } catch (e) {
        console.log('❌ Neočekávaná chyba:', e);
        return 0;
    }
}

// Test 3: Vzorek embeddingů 
export async function testSampleEmbeddings(limit = 3) {
    console.log('🔍 TEST 3: Vzorek embeddingů...');
    
    try {
        const { data, error } = await supabase
            .from('product_embeddings')
            .select('product_code, product_name, embedding_status, created_at')
            .not('embedding', 'is', null)
            .eq('embedding_status', 'completed')
            .limit(limit);
            
        if (error) {
            console.log('❌ Chyba při získávání vzorku:', error);
            return [];
        }
        
        console.log(`📋 Vzorek ${data?.length || 0} embeddingů:`);
        data?.forEach((item, i) => {
            console.log(`  ${i+1}. ${item.product_code} - ${item.product_name}`);
        });
        
        return data || [];
    } catch (e) {
        console.log('❌ Neočekávaná chyba:', e);
        return [];
    }
}

// Test 4: Základní vektorové vyhledávání
export async function testBasicVectorSearch(query = "bolesti hlavy") {
    console.log(`🔍 TEST 4: Základní vektorové vyhledávání pro "${query}"...`);
    
    try {
        // 1. Vygeneruj embedding pro dotaz
        console.log('  📝 Generuji embedding pro dotaz...');
        const embeddingResult = await generateEmbedding(query);
        
        if (!embeddingResult.success || !embeddingResult.embedding) {
            console.log('❌ Nepodařilo se vygenerovat embedding:', embeddingResult.error);
            return null;
        }
        
        console.log(`  ✅ Embedding vygenerován (${embeddingResult.embedding.length} dimenzí)`);
        
        // 2. Zkus search_products_by_vector
        console.log('  🔍 Zkouším search_products_by_vector...');
        
        const { data, error } = await supabase.rpc('search_products_by_vector', {
            query_embedding: embeddingResult.embedding,
            similarity_threshold: 0.3, // Snížený práh pro testování
            max_results: 5
        });
        
        if (error) {
            console.log('❌ Chyba při vektorovém vyhledávání:', error);
            return null;
        }
        
        console.log(`  📊 Nalezeno ${data?.length || 0} produktů:`);
        data?.forEach((product: any, i: number) => {
            console.log(`    ${i+1}. ${product.product_name} (score: ${product.similarity_score?.toFixed(3)})`);
        });
        
        return data;
    } catch (e) {
        console.log('❌ Neočekávaná chyba při vektorovém vyhledávání:', e);
        return null;
    }
}

// Test 5: Hybridní vyhledávání
export async function testHybridSearch(query = "bolesti hlavy") {
    console.log(`🔍 TEST 5: Hybridní vyhledávání pro "${query}"...`);
    
    try {
        // 1. Vygeneruj embedding pro dotaz
        const embeddingResult = await generateEmbedding(query);
        
        if (!embeddingResult.success || !embeddingResult.embedding) {
            console.log('❌ Nepodařilo se vygenerovat embedding');
            return null;
        }
        
        // 2. Zkus hybrid_product_search
        console.log('  🔍 Zkouším hybrid_product_search...');
        
        const { data, error } = await supabase.rpc('hybrid_product_search', {
            query_text: query,
            query_embedding: embeddingResult.embedding,
            match_count: 5,
            full_text_weight: 1.0,
            semantic_weight: 1.0,
            rrf_k: 50
        });
        
        if (error) {
            console.log('❌ Chyba při hybridním vyhledávání:', error);
            return null;
        }
        
        console.log(`  📊 Nalezeno ${data?.length || 0} produktů:`);
        data?.forEach((product: any, i: number) => {
            console.log(`    ${i+1}. ${product.product_name} (combined: ${product.combined_score?.toFixed(3)})`);
        });
        
        return data;
    } catch (e) {
        console.log('❌ Neočekávaná chyba při hybridním vyhledávání:', e);
        return null;
    }
}

// Komplexní test všech funkcí
export async function runCompleteVectorTest() {
    console.log('🚀 SPUŠTĚNÍ KOMPLETNÍHO TESTU VEKTOROVÉHO VYHLEDÁVÁNÍ');
    console.log('='.repeat(60));
    
    const results = {
        rpcFunctions: await testAvailableRPCFunctions(),
        embeddingCount: await testEmbeddingCount(),
        sampleEmbeddings: await testSampleEmbeddings(),
        basicSearch: await testBasicVectorSearch(),
        hybridSearch: await testHybridSearch()
    };
    
    console.log('='.repeat(60));
    console.log('📋 SHRNUTÍ TESTŮ:');
    console.log(`  RPC funkce: ${Object.values(results.rpcFunctions).filter(x => x).length}/3 dostupných`);
    console.log(`  Embeddingy: ${results.embeddingCount} dokončených`);
    console.log(`  Základní search: ${results.basicSearch ? '✅ funguje' : '❌ nefunguje'}`);
    console.log(`  Hybridní search: ${results.hybridSearch ? '✅ funguje' : '❌ nefunguje'}`);
    
    return results;
}
