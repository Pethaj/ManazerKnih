/**
 * Služba pro kombinované vyhledávání v databázi knih a produktovém feedu
 * Koordinuje spuštění 2 webhooků s prioritizací knih
 */

import { ProductRecommendation } from './productSearchService';

// Typy pro webhook odpovědi
interface BookWebhookResponse {
    text: string;
    sources?: any[];
    productRecommendations?: ProductRecommendation[];
}

interface ProductWebhookResponse {
    products: ProductRecommendation[];
}

interface CombinedSearchResult {
    text: string;
    sources: any[];
    productRecommendations: ProductRecommendation[];
}

// Konfigurace webhooků
const BOOK_WEBHOOK_URL = 'https://n8n.srv980546.hstgr.cloud/webhook/97dc857e-352b-47b4-91cb-bc134afc764c/chat';
const PRODUCT_WEBHOOK_URL = 'https://n8n.srv980546.hstgr.cloud/webhook/cd6b668b-1e35-4018-9bf4-28d0926b023b';

// Timeout pro čekání na pomalší webhook (v ms)
const WEBHOOK_TIMEOUT = 15000; // 15 sekund

/**
 * Volá webhook pro databázi knih
 */
async function callBookWebhook(
    message: string,
    sessionId: string,
    history: any[],
    metadata?: any
): Promise<BookWebhookResponse> {
    console.log('📚 Volám webhook pro databázi knih...');
    
    const payload = {
        sessionId,
        action: "sendMessage",
        chatInput: message,
        chatHistory: history,
        ...(metadata && Object.keys(metadata).length > 0 ? { metadata } : {})
    };

    const response = await fetch(BOOK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        
        // Kontrola, jestli je webhook neaktivní
        if (response.status === 404 || errorText.includes('Cannot POST')) {
            console.warn('⚠️ Knihy webhook není aktivní nebo neexistuje');
            throw new Error(`Webhook pro knihy není momentálně dostupný. Zkontrolujte n8n workflow nebo kontaktujte administrátora.\n\nStatus: ${response.status}\nURL: ${BOOK_WEBHOOK_URL}`);
        }
        
        throw new Error(`Knihy webhook chyba: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    let responsePayload = Array.isArray(data) ? data[0] : data;
    
    // N8N může vracet data v různých formátech
    if (responsePayload?.json) {
        responsePayload = responsePayload.json;
    } else if (responsePayload?.body) {
        responsePayload = responsePayload.body;
    } else if (responsePayload?.data) {
        responsePayload = responsePayload.data;
    }

    const botText = responsePayload?.html || 
                   responsePayload?.text || 
                   responsePayload?.output || 
                   responsePayload?.content ||
                   responsePayload?.response ||
                   responsePayload?.message ||
                   responsePayload?.result || '';

    // Vyčisti HTML styly pokud jsou přítomny
    let cleanText = botText;
    if (typeof botText === 'string' && botText.includes('<style>')) {
        cleanText = botText
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<div class="chatgpt-text">/gi, '')
            .replace(/<\/div>\s*$/gi, '')
            .trim();
    }

    return {
        text: cleanText,
        sources: responsePayload?.sources || [],
        productRecommendations: responsePayload?.productRecommendations || []
    };
}

/**
 * Volá webhook pro produktový feed
 */
async function callProductWebhook(
    message: string,
    sessionId: string
): Promise<ProductWebhookResponse> {
    console.log('🛍️ Volám webhook pro produktový feed...');
    
    const requestData = {
        chatInput: message.trim(),
        session_id: sessionId,
        timestamp: new Date().toISOString()
    };

    const response = await fetch(PRODUCT_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
    });

    if (!response.ok) {
        const errorText = await response.text();
        
        // Kontrola, jestli je webhook neaktivní
        if (response.status === 404 || errorText.includes('Cannot POST')) {
            console.warn('⚠️ Produkty webhook není aktivní nebo neexistuje');
            throw new Error(`Webhook pro produkty není momentálně dostupný. Zkontrolujte n8n workflow nebo kontaktujte administrátora.\n\nStatus: ${response.status}\nURL: ${PRODUCT_WEBHOOK_URL}`);
        }
        
        throw new Error(`Produkty webhook chyba: ${response.status} - ${errorText}`);
    }

    const rawText = await response.text();
    let webhookRawResponse;

    try {
        webhookRawResponse = JSON.parse(rawText);
    } catch {
        webhookRawResponse = rawText;
    }

    // Parsuj různé možné struktury webhook odpovědi
    let productsData = null;
    
    if (Array.isArray(webhookRawResponse) && webhookRawResponse[0]?.data) {
        productsData = webhookRawResponse[0].data;
    } else if (Array.isArray(webhookRawResponse)) {
        productsData = webhookRawResponse;
    } else if (webhookRawResponse?.data && Array.isArray(webhookRawResponse.data)) {
        productsData = webhookRawResponse.data;
    }

    const products: ProductRecommendation[] = [];

    if (productsData && Array.isArray(productsData) && productsData.length > 0) {
        productsData.forEach((product: any, index: number) => {
            products.push({
                id: index + 1,
                product_code: `webhook_${index + 1}`,
                product_name: product["Název produktu"] || "Neznámý produkt",
                description: product["Doporuceni"] || "",
                category: "Tradiční čínská medicína",
                price: parseInt(product["Cena"]?.replace(/\D/g, '') || '0'),
                currency: "CZK",
                product_url: product["URL produktu"] || "",
                image_url: product["URL Obrázku"] || "",
                similarity_score: 0.9
            });
        });
    }

    return { products };
}

/**
 * Kombinované vyhledávání s koordinací webhooků
 * 
 * Logika:
 * 1. Spustí oba webhooky současně
 * 2. Priorita: knihy vždy první
 * 3. Pokud produkty dorazí dříve → čeká na knihy, pak zobrazí oboje najednou
 * 4. Pokud knihy dorazí první → zobrazí je ihned, produkty přidá později
 */
export async function performCombinedSearch(
    message: string,
    sessionId: string,
    history: any[],
    metadata?: any,
    onBooksReceived?: (result: Partial<CombinedSearchResult>) => void,
    onProductsReceived?: (products: ProductRecommendation[]) => void
): Promise<CombinedSearchResult> {
    
    console.log('🚀 Spouštím kombinované vyhledávání...', {
        message: message.substring(0, 50) + '...',
        sessionId,
        hasMetadata: !!metadata,
        hasBooksCallback: !!onBooksReceived,
        hasProductsCallback: !!onProductsReceived
    });
    
    // Sledování stavu webhooků
    let booksResult: BookWebhookResponse | null = null;
    let productsResult: ProductWebhookResponse | null = null;
    let booksReceived = false;
    let productsReceived = false;
    
    // Časové razítko spuštění
    const startTime = Date.now();
    
    // Spustíme oba webhooky současně
    const bookPromise = callBookWebhook(message, sessionId, history, metadata)
        .then(result => {
            console.log(`📚 Knihy webhook dokončen za ${Date.now() - startTime}ms`);
            booksResult = result;
            booksReceived = true;
            
            // Pokud knihy dorazily první, ihned je zobrazíme
            if (!productsReceived) {
                console.log('📚 Knihy dorazily první - zobrazuji ihned', {
                    textLength: result.text.length,
                    sourcesCount: result.sources.length,
                    hasCallback: !!onBooksReceived
                });
                if (onBooksReceived) {
                    onBooksReceived({
                        text: result.text,
                        sources: result.sources,
                        productRecommendations: result.productRecommendations || []
                    });
                    console.log('✅ onBooksReceived callback zavolán');
                } else {
                    console.error('❌ onBooksReceived callback není dostupný!');
                }
            }
            
            return result;
        })
        .catch(error => {
            console.error('❌ Chyba v knihy webhook:', error);
            booksReceived = true;
            booksResult = {
                text: `❌ Chyba při vyhledávání v databázi knih: ${error.message}`,
                sources: [],
                productRecommendations: []
            };
            
            // I při chybě zobrazíme výsledek
            if (!productsReceived) {
                console.log('❌ Knihy webhook selhal - zobrazuji chybovou zprávu');
                if (onBooksReceived) {
                    onBooksReceived({
                        text: booksResult.text,
                        sources: booksResult.sources,
                        productRecommendations: booksResult.productRecommendations
                    });
                    console.log('✅ onBooksReceived callback zavolán (s chybou)');
                } else {
                    console.error('❌ onBooksReceived callback není dostupný pro chybu!');
                }
            }
            
            return booksResult;
        });

    const productPromise = callProductWebhook(message, sessionId)
        .then(result => {
            console.log(`🛍️ Produkty webhook dokončen za ${Date.now() - startTime}ms`);
            productsResult = result;
            productsReceived = true;
            
            // Pokud knihy už dorazily, můžeme přidat produkty
            if (booksReceived) {
                console.log('🛍️ Produkty dorazily - knihy už byly zobrazeny, přidávám produkty', {
                    productsCount: result.products.length,
                    hasCallback: !!onProductsReceived
                });
                if (onProductsReceived) {
                    onProductsReceived(result.products);
                    console.log('✅ onProductsReceived callback zavolán');
                } else {
                    console.error('❌ onProductsReceived callback není dostupný!');
                }
            } else {
                console.log('🛍️ Produkty dorazily první - čekám na knihy', {
                    productsCount: result.products.length
                });
                // Produkty dorazily první - čekáme na knihy
                // Callback se zavolá až po dokončení knihy webhook
            }
            
            return result;
        })
        .catch(error => {
            console.error('❌ Chyba v produkty webhook:', error);
            productsReceived = true;
            productsResult = { products: [] };
            
            // I při chybě informujeme o dokončení
            if (booksReceived) {
                onProductsReceived?.([]);
            }
            
            return productsResult;
        });

    // Čekáme na oba webhooky
    const [booksFinalResult, productsFinalResult] = await Promise.all([bookPromise, productPromise]);
    
    // Pokud produkty dorazily první a čekaly na knihy, teď zobrazíme vše najednou
    // Toto se volá pouze pokud se callbacky ještě nezavolaly v Promise.then()
    console.log('🎯 Finální kontrola callbacků:', {
        booksReceived,
        productsReceived,
        booksText: booksFinalResult?.text?.length || 0,
        productsCount: productsFinalResult?.products?.length || 0
    });
    
    // Pokud produkty dorazily první, callbacky se možná ještě nezavolaly kvůli timing
    // Zavoláme je nyní po Promise.all()
    if (booksReceived && productsReceived) {
        console.log('🎯 Oba webhooky dokončeny - zajišťuji že se zavolaly všechny callbacky');
        
        // Pokud je možné, že callbacky se nezavolaly kvůli race condition
        if (onProductsReceived && productsFinalResult.products.length > 0) {
            console.log('🛍️ Dodatečně volám onProductsReceived pro jistotu');
            onProductsReceived(productsFinalResult.products);
        }
    }

    // Finální výsledek obsahuje vše
    const finalResult: CombinedSearchResult = {
        text: booksFinalResult.text,
        sources: booksFinalResult.sources,
        productRecommendations: [
            ...(booksFinalResult.productRecommendations || []),
            ...productsFinalResult.products
        ]
    };

    console.log(`🎯 Kombinované vyhledávání dokončeno za ${Date.now() - startTime}ms:`, {
        textLength: finalResult.text.length,
        sourcesCount: finalResult.sources.length,
        productsCount: finalResult.productRecommendations.length
    });

    return finalResult;
}
