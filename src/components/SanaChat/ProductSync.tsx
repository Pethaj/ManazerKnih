import React, { useState, useEffect } from 'react';
import { supabase as supabaseClient } from '../../lib/supabase';

// URL produktových feedů BEWIT
const BEWIT_FEED_URL = 'https://bewit.love/feeds/zbozi.xml';
const BEWIT_FEED_2_URL = 'https://bewit.love/feed/bewit?auth=xr32PRbrs554K';

// Supabase Edge Function URL pro Feed 2
const getSupabaseUrl = () => {
    const url = supabaseClient.supabaseUrl;
    return url;
};

const SYNC_FEED_2_FUNCTION_URL = `${getSupabaseUrl()}/functions/v1/sync-feed-2`;

// Interface pro produkt
interface Product {
    id?: number;
    product_code: string;
    name: string;
    description?: string;
    category?: string;
    price?: number;
    currency?: string;
    availability?: number;
    product_url?: string;
    image_url?: string;
    brand?: string;
    variant_id?: string;
    xml_content?: string;
    sync_status?: 'pending' | 'success' | 'error';
}

// Interface pro sync log
interface SyncLog {
    id?: number;
    sync_type: string;
    status: 'running' | 'success' | 'error';
    started_at: string;
    finished_at?: string;
    records_processed: number;
    records_inserted: number;
    records_updated: number;
    records_failed: number;
    error_message?: string;
    feed_url: string;
}

// Funkce pro parsování XML feedu
const parseXMLFeed = async (xmlText: string): Promise<Product[]> => {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        
        // Zkontrolujeme chyby parsingu
        const parseError = xmlDoc.querySelector('parsererror');
        if (parseError) {
            throw new Error(`XML parsing error: ${parseError.textContent}`);
        }

        const products: Product[] = [];
        
        // Najdeme všechny produkty (předpokládáme, že jsou v <item> nebo podobných elementech)
        const items = xmlDoc.querySelectorAll('item');
        
        items.forEach((item, index) => {
            try {
                // Extrakce základních dat - upravíme podle skutečné struktury XML
                const title = item.querySelector('title')?.textContent || '';
                const description = item.querySelector('description')?.textContent || '';
                const link = item.querySelector('link')?.textContent || '';
                const guid = item.querySelector('guid')?.textContent || '';
                
                // Pokusíme se extrahovat kód produktu z title nebo guid
                let productCode = '';
                let name = title;
                
                // Pokud title začína kódem (např. "1002324245001 - Název produktu")
                const titleMatch = title.match(/^(\d+)\s*-\s*(.+)$/);
                if (titleMatch) {
                    productCode = titleMatch[1];
                    name = titleMatch[2].trim();
                } else {
                    // Použijeme index jako fallback
                    productCode = `auto_${Date.now()}_${index}`;
                }

                // Extrakce ceny (pokud je v description nebo samostatném elementu)
                let price: number | undefined;
                const priceMatch = description.match(/(\d+(?:[,.]?\d+)?)\s*(?:CZK|Kč|,-)/i);
                if (priceMatch) {
                    price = parseFloat(priceMatch[1].replace(',', '.'));
                }

                // Extrakce kategorie z description
                let category: string | undefined;
                if (description.includes('Tradiční čínská medicína')) {
                    category = 'Tradiční čínská medicína';
                } else if (description.includes('esenciální olej')) {
                    category = 'Esenciální oleje';
                } else if (description.includes('Obelisky')) {
                    category = 'Krystaly a minerály';
                } else if (description.includes('Kosmetické suroviny')) {
                    category = 'Kosmetické suroviny';
                }

                // Extrakce obrázku (pokud je v description jako URL)
                let imageUrl: string | undefined;
                const imageMatch = description.match(/(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp))/i);
                if (imageMatch) {
                    imageUrl = imageMatch[1];
                }

                const product: Product = {
                    product_code: productCode,
                    name: name,
                    description: description,
                    category: category,
                    price: price,
                    currency: 'CZK',
                    availability: 0, // default
                    product_url: link,
                    image_url: imageUrl,
                    brand: 'BEWIT',
                    xml_content: item.outerHTML,
                    sync_status: 'pending'
                };

                products.push(product);
            } catch (error) {
            }
        });

        return products;
    } catch (error) {
        throw error;
    }
};

// Funkce pro načtení XML feedu
const fetchXMLFeed = async (url: string): Promise<string> => {
    try {
        // Použijeme CORS proxy pro cross-origin requesty
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        
        const response = await fetch(proxyUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/xml, text/xml, */*',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const xmlText = await response.text();
        return xmlText;
    } catch (error) {
        throw error;
    }
};

// Funkce pro synchronizaci produktů do Supabase
const syncProductsToSupabase = async (products: Product[]): Promise<{ inserted: number; updated: number; failed: number }> => {
    let inserted = 0;
    let updated = 0;
    let failed = 0;

    for (const product of products) {
        try {
            // Zkusíme najít existující produkt podle product_code
            const { data: existing, error: selectError } = await supabaseClient
                .from('products')
                .select('id, product_code')
                .eq('product_code', product.product_code)
                .single();

            if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = no rows found
                failed++;
                continue;
            }

            if (existing) {
                // Aktualizujeme existující produkt
                const { error: updateError } = await supabaseClient
                    .from('products')
                    .update({
                        name: product.name,
                        description: product.description,
                        category: product.category,
                        price: product.price,
                        currency: product.currency,
                        availability: product.availability,
                        product_url: product.product_url,
                        image_url: product.image_url,
                        brand: product.brand,
                        variant_id: product.variant_id,
                        xml_content: product.xml_content,
                        sync_status: 'success',
                        last_sync_at: new Date().toISOString()
                    })
                    .eq('id', existing.id);

                if (updateError) {
                    failed++;
                } else {
                    updated++;
                }
            } else {
                // Vložíme nový produkt
                const { error: insertError } = await supabaseClient
                    .from('products')
                    .insert({
                        product_code: product.product_code,
                        name: product.name,
                        description: product.description,
                        category: product.category,
                        price: product.price,
                        currency: product.currency,
                        availability: product.availability,
                        product_url: product.product_url,
                        image_url: product.image_url,
                        brand: product.brand,
                        variant_id: product.variant_id,
                        xml_content: product.xml_content,
                        sync_status: 'success',
                        last_sync_at: new Date().toISOString()
                    });

                if (insertError) {
                    failed++;
                } else {
                    inserted++;
                }
            }
        } catch (error) {
            failed++;
        }
    }

    return { inserted, updated, failed };
};

// Hlavní funkce pro synchronizaci Feed 1 (původní)
export const syncProductsFeed = async (): Promise<boolean> => {
    const startTime = new Date().toISOString();
    
    // Zalogujeme start synchronizace
    const { data: logData, error: logError } = await supabaseClient
        .from('sync_logs')
        .insert({
            sync_type: 'products_feed',
            status: 'running',
            started_at: startTime,
            records_processed: 0,
            records_inserted: 0,
            records_updated: 0,
            records_failed: 0,
            feed_url: BEWIT_FEED_URL
        })
        .select()
        .single();

    if (logError) {
        return false;
    }

    const logId = logData.id;

    try {
        
        // 1. Načteme XML feed
        const xmlText = await fetchXMLFeed(BEWIT_FEED_URL);

        // 2. Parsujeme XML
        const products = await parseXMLFeed(xmlText);

        // 3. Synchronizujeme do Supabase
        const result = await syncProductsToSupabase(products);

        // 4. Aktualizujeme log
        const finishTime = new Date().toISOString();
        await supabaseClient
            .from('sync_logs')
            .update({
                status: 'success',
                finished_at: finishTime,
                records_processed: products.length,
                records_inserted: result.inserted,
                records_updated: result.updated,
                records_failed: result.failed
            })
            .eq('id', logId);

        return true;

    } catch (error) {
        
        // Aktualizujeme log s chybou
        const finishTime = new Date().toISOString();
        await supabaseClient
            .from('sync_logs')
            .update({
                status: 'error',
                finished_at: finishTime,
                error_message: error instanceof Error ? error.message : 'Neznámá chyba'
            })
            .eq('id', logId);

        return false;
    }
};

// Nová funkce pro synchronizaci Feed 2 (přes Edge Function)
export const syncProductsFeed2 = async (): Promise<boolean> => {
    try {
        
        // Získáme anon key z Supabase klienta
        const { data: { session } } = await supabaseClient.auth.getSession();
        const token = session?.access_token;

        // Zavoláme Edge Function
        const { data, error } = await supabaseClient.functions.invoke('sync-feed-2', {
            body: {}
        });

        if (error) {
            throw error;
        }

        return data?.ok === true;

    } catch (error) {
        return false;
    }
};

// Funkce pro získání posledního sync logu pro daný feed
export const getLastSyncLog = async (syncType: string): Promise<SyncLog | null> => {
    try {
        const { data, error } = await supabaseClient
            .from('sync_logs')
            .select('*')
            .eq('sync_type', syncType)
            .order('started_at', { ascending: false })
            .limit(1)
            .single();

        if (error) {
            return null;
        }

        return data;
    } catch (error) {
        return null;
    }
};

// Funkce pro získání počtu produktů v tabulkách
export const getProductCounts = async (): Promise<{feed1: number, feed2: number}> => {
    try {
        const { count: count1 } = await supabaseClient
            .from('products')
            .select('*', { count: 'exact', head: true });

        const { count: count2 } = await supabaseClient
            .from('product_feed_2')
            .select('*', { count: 'exact', head: true });

        return {
            feed1: count1 || 0,
            feed2: count2 || 0
        };
    } catch (error) {
        return { feed1: 0, feed2: 0 };
    }
};

// React komponenta pro administraci produktové synchronizace
const ProductSyncAdmin: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingFeed2, setIsLoadingFeed2] = useState(false);
    const [selectedFeed, setSelectedFeed] = useState<'feed_1' | 'feed_2'>('feed_1');
    
    // State pro Feed 1
    const [lastSyncStatus, setLastSyncStatus] = useState<SyncLog | null>(null);
    const [productCount, setProductCount] = useState<number>(0);
    
    // State pro Feed 2
    const [lastSyncStatusFeed2, setLastSyncStatusFeed2] = useState<SyncLog | null>(null);
    const [productCountFeed2, setProductCountFeed2] = useState<number>(0);

    // Načteme data při startu
    useEffect(() => {
        loadSyncStatus();
        loadProductCount();
        loadSyncStatusFeed2();
        loadProductCountFeed2();
    }, []);

    const loadSyncStatus = async () => {
        try {
            const log = await getLastSyncLog('products_feed');
            setLastSyncStatus(log);
        } catch (error) {
        }
    };

    const loadSyncStatusFeed2 = async () => {
        try {
            const log = await getLastSyncLog('product_feed_2');
            setLastSyncStatusFeed2(log);
        } catch (error) {
        }
    };

    const loadProductCount = async () => {
        try {
            const { count, error } = await supabaseClient
                .from('products')
                .select('*', { count: 'exact', head: true });

            if (error) {
                return;
            }

            setProductCount(count || 0);
        } catch (error) {
        }
    };

    const loadProductCountFeed2 = async () => {
        try {
            const { count, error } = await supabaseClient
                .from('product_feed_2')
                .select('*', { count: 'exact', head: true });

            if (error) {
                return;
            }

            setProductCountFeed2(count || 0);
        } catch (error) {
        }
    };

    // Nová funkce pro HTTP synchronizaci
    const handleHttpSync = async () => {
        setIsLoading(true);
        try {
            
            const response = await fetch('https://modopafybeslbcqjxsve.supabase.co/functions/v1/sync-products', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZG9wYWZ5YmVzbGJjcWp4c3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNTM0MjEsImV4cCI6MjA3MDgyOTQyMX0.8gxL0b9flTUyoltiEIJx8Djuiyx16rySlffHkd_nm1U`,
                    'Content-Type': 'application/json',
                    'X-Triggered-By': 'manual-button'
                },
                body: JSON.stringify({
                    source: 'manual_button',
                    trigger_time: new Date().toISOString()
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            if (result.ok) {
                await loadSyncStatus();
                await loadProductCount();
                
                const message = `✅ Synchronizace úspěšná!\n\n` +
                    `📊 Zpracováno: ${result.processed || 0}\n` +
                    `➕ Nových: ${result.inserted || 0}\n` +
                    `🔄 Aktualizováno: ${result.updated || 0}\n` +
                    `❌ Chyb: ${result.failed || 0}`;
                
                alert(message);
            } else {
                throw new Error(result.error || 'Neznámá chyba z Edge Function');
            }
        } catch (error) {
            alert('❌ Chyba při synchronizaci: ' + (error instanceof Error ? error.message : 'Neznámá chyba'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleManualSync = async () => {
        // Použijeme novou HTTP metodu místo staré
        await handleHttpSync();
    };

    const handleManualSyncFeed2 = async () => {
        setIsLoadingFeed2(true);
        try {
            
            const success = await syncProductsFeed2();
            
            if (success) {
                await loadSyncStatusFeed2();
                await loadProductCountFeed2();
                alert('✅ Synchronizace Feed 2 úspěšně dokončena!');
            } else {
                throw new Error('Synchronizace Feed 2 selhala');
            }
        } catch (error) {
            alert('❌ Chyba při synchronizaci Feed 2: ' + (error instanceof Error ? error.message : 'Neznámá chyba'));
        } finally {
            setIsLoadingFeed2(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('cs-CZ');
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-bewit-dark mb-6">
                🛒 Synchronizace produktů BEWIT
            </h2>

            {/* Výběr feedu */}
            <div className="mb-6 flex gap-4 border-b border-gray-200">
                <button
                    onClick={() => setSelectedFeed('feed_1')}
                    className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
                        selectedFeed === 'feed_1'
                            ? 'border-bewit-blue text-bewit-blue'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Feed 1 - zbozi.xml
                </button>
                <button
                    onClick={() => setSelectedFeed('feed_2')}
                    className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
                        selectedFeed === 'feed_2'
                            ? 'border-bewit-blue text-bewit-blue'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Feed 2 - Product Feed 2
                </button>
            </div>
            
            {/* Obsah pro Feed 1 */}
            {selectedFeed === 'feed_1' && (
                <>
                    {/* Statistiky Feed 1 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="bg-bewit-lightBlue rounded-lg p-4">
                            <h3 className="text-lg font-semibold text-bewit-blue mb-2">Produkty v databázi</h3>
                            <p className="text-3xl font-bold text-bewit-blue">{productCount}</p>
                        </div>
                
                {lastSyncStatus && (
                    <div className={`rounded-lg p-4 ${lastSyncStatus.status === 'success' ? 'bg-green-100' : lastSyncStatus.status === 'error' ? 'bg-red-100' : 'bg-yellow-100'}`}>
                        <h3 className="text-lg font-semibold mb-2">Poslední synchronizace</h3>
                        <p className="text-sm">
                            <strong>Status:</strong> {lastSyncStatus.status === 'success' ? '✅ Úspěch' : lastSyncStatus.status === 'error' ? '❌ Chyba' : '⏳ Běží'}
                        </p>
                        <p className="text-sm">
                            <strong>Čas:</strong> {formatDate(lastSyncStatus.started_at)}
                        </p>
                        {lastSyncStatus.status === 'success' && (
                            <>
                                <p className="text-sm">
                                    <strong>Zpracováno:</strong> {lastSyncStatus.records_processed}
                                </p>
                                <p className="text-sm">
                                    <strong>Nových:</strong> {lastSyncStatus.records_inserted}, 
                                    <strong> Aktualizováno:</strong> {lastSyncStatus.records_updated}
                                </p>
                            </>
                        )}
                        {lastSyncStatus.error_message && (
                            <p className="text-sm text-red-600 mt-2">
                                <strong>Chyba:</strong> {lastSyncStatus.error_message}
                            </p>
                        )}
                    </div>
                )}
            </div>

                    {/* Tlačítka Feed 1 */}
                    <div className="flex gap-4">
                        <button
                            onClick={handleManualSync}
                            disabled={isLoading}
                            className="flex-1 bg-bewit-blue text-white px-6 py-3 rounded-lg font-semibold hover:bg-bewit-blue/90 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                            {isLoading ? '⏳ Synchronizuji...' : '🔄 Synchronizovat Feed 1 nyní'}
                        </button>
                        
                        <button
                            onClick={() => window.open(BEWIT_FEED_URL, '_blank')}
                            className="bg-gray-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
                        >
                            📋 Zobrazit feed
                        </button>
                    </div>
                </>
            )}

            {/* Obsah pro Feed 2 */}
            {selectedFeed === 'feed_2' && (
                <>
                    {/* Statistiky Feed 2 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="bg-purple-100 rounded-lg p-4">
                            <h3 className="text-lg font-semibold text-purple-700 mb-2">Produkty v databázi (Feed 2)</h3>
                            <p className="text-3xl font-bold text-purple-700">{productCountFeed2}</p>
                            <p className="text-xs text-gray-600 mt-2">Tabulka: product_feed_2</p>
                        </div>
                        
                        {lastSyncStatusFeed2 && (
                            <div className={`rounded-lg p-4 ${lastSyncStatusFeed2.status === 'success' ? 'bg-green-100' : lastSyncStatusFeed2.status === 'error' ? 'bg-red-100' : 'bg-yellow-100'}`}>
                                <h3 className="text-lg font-semibold mb-2">Poslední synchronizace</h3>
                                <p className="text-sm">
                                    <strong>Status:</strong> {lastSyncStatusFeed2.status === 'success' ? '✅ Úspěch' : lastSyncStatusFeed2.status === 'error' ? '❌ Chyba' : '⏳ Běží'}
                                </p>
                                <p className="text-sm">
                                    <strong>Čas:</strong> {formatDate(lastSyncStatusFeed2.started_at)}
                                </p>
                                {lastSyncStatusFeed2.status === 'success' && (
                                    <>
                                        <p className="text-sm">
                                            <strong>Zpracováno:</strong> {lastSyncStatusFeed2.records_processed}
                                        </p>
                                        <p className="text-sm">
                                            <strong>Nových:</strong> {lastSyncStatusFeed2.records_inserted}, 
                                            <strong> Aktualizováno:</strong> {lastSyncStatusFeed2.records_updated}
                                        </p>
                                    </>
                                )}
                                {lastSyncStatusFeed2.error_message && (
                                    <p className="text-sm text-red-600 mt-2">
                                        <strong>Chyba:</strong> {lastSyncStatusFeed2.error_message}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Tlačítka Feed 2 */}
                    <div className="flex gap-4">
                        <button
                            onClick={handleManualSyncFeed2}
                            disabled={isLoadingFeed2}
                            className="flex-1 bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                            {isLoadingFeed2 ? '⏳ Synchronizuji Feed 2...' : '🔄 Synchronizovat Feed 2 nyní'}
                        </button>
                        
                        <button
                            onClick={() => window.open(BEWIT_FEED_2_URL, '_blank')}
                            className="bg-gray-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
                        >
                            📋 Zobrazit feed
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default ProductSyncAdmin;
export { ProductSyncAdmin, parseXMLFeed, fetchXMLFeed, syncProductsToSupabase };
