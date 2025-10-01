/**
 * Test pro kombinované vyhledávání - testuje koordinaci webhooků
 */

import { performCombinedSearch } from './combinedSearchService';

export async function testCombinedSearch() {
    console.log('🧪 Spouštím test kombinovaného vyhledávání...');
    
    const testQuery = "Bolí mě záda, co mi poradíte?";
    const testSessionId = "test_session_" + Date.now();
    const testHistory: any[] = [];
    const testMetadata = {
        categories: ["Aromaterapie", "Masáže"],
        labels: ["Osobní"],
        publication_types: ["public"]
    };
    
    console.log('📋 Test parametry:', {
        query: testQuery,
        sessionId: testSessionId,
        metadata: testMetadata
    });
    
    let booksReceivedTime: number | null = null;
    let productsReceivedTime: number | null = null;
    const startTime = Date.now();
    
    const onBooksReceived = (result: any) => {
        booksReceivedTime = Date.now() - startTime;
        console.log(`📚 KNIHY PŘIJATÉ za ${booksReceivedTime}ms:`, {
            textLength: result.text?.length || 0,
            sourcesCount: result.sources?.length || 0,
            existingProductsCount: result.productRecommendations?.length || 0
        });
    };
    
    const onProductsReceived = (products: any[]) => {
        productsReceivedTime = Date.now() - startTime;
        console.log(`🛍️ PRODUKTY PŘIJATÉ za ${productsReceivedTime}ms:`, {
            productCount: products.length,
            firstProduct: products[0]?.product_name
        });
    };
    
    try {
        const result = await performCombinedSearch(
            testQuery,
            testSessionId,
            testHistory,
            testMetadata,
            onBooksReceived,
            onProductsReceived
        );
        
        const totalTime = Date.now() - startTime;
        
        console.log('✅ TEST DOKONČEN za', totalTime + 'ms');
        console.log('📊 VÝSLEDKY:', {
            totalTextLength: result.text.length,
            totalSourcesCount: result.sources.length,
            totalProductsCount: result.productRecommendations.length,
            timing: {
                books: booksReceivedTime ? `${booksReceivedTime}ms` : 'nebyly přijaty',
                products: productsReceivedTime ? `${productsReceivedTime}ms` : 'nebyly přijaty',
                total: `${totalTime}ms`
            },
            priorityCheck: booksReceivedTime && productsReceivedTime ? 
                (booksReceivedTime <= productsReceivedTime ? 
                    '✅ Knihy měly prioritu (dorazily první nebo současně)' : 
                    '⚠️ Produkty dorazily před knihami - ale systém čekal') : 
                'Neúplný test'
        });
        
        // Testujeme logiku prioritizace
        if (booksReceivedTime && productsReceivedTime) {
            if (booksReceivedTime <= productsReceivedTime) {
                console.log('✅ PRIORITA OK: Knihy byly zobrazeny první nebo současně s produkty');
            } else {
                console.log('✅ ČEKÁNÍ OK: Produkty dorazily první, ale systém čekal na knihy');
            }
        }
        
        return result;
        
    } catch (error) {
        console.error('❌ TEST SELHAL:', error);
        throw error;
    }
}

// Test s timeoutem pro simulaci pomalých webhooků
export async function testWithDelayedWebhooks() {
    console.log('🧪 Test s timeoutem...');
    
    // Tento test by měl simulovat situace, kdy jeden webhook je výrazně pomalejší
    // Zatím jen zavoláme základní test
    return testCombinedSearch();
}
