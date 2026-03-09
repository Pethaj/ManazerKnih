import React, { useState, useEffect } from 'react';
import { supabase as supabaseClient } from '../../lib/supabase';

// URL produktových feedů BEWIT
const BEWIT_FEED_URL = 'https://bewit.love/feeds/zbozi.xml';
const BEWIT_FEED_2_URL = 'https://bewit.love/feed/bewit?auth=xr32PRbrs554K';
const BEWIT_FEED_ABC_URL = 'https://bewit.love/feed/bewit2?auth=xr32PRbrs554K';

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

// Funkce pro synchronizaci Feed ABC (přes Edge Function)
export const syncProductsFeedAbc = async (): Promise<boolean> => {
    try {
        const { data, error } = await supabaseClient.functions.invoke('sync-feed-abc', {
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
export const getProductCounts = async (): Promise<{feed1: number, feed2: number, feedAbc: number}> => {
    try {
        const { count: count1 } = await supabaseClient
            .from('products')
            .select('*', { count: 'exact', head: true });

        const { count: count2 } = await supabaseClient
            .from('product_feed_2')
            .select('*', { count: 'exact', head: true });

        const { count: countAbc } = await supabaseClient
            .from('product_feed_abc')
            .select('*', { count: 'exact', head: true });

        return {
            feed1: count1 || 0,
            feed2: count2 || 0,
            feedAbc: countAbc || 0
        };
    } catch (error) {
        return { feed1: 0, feed2: 0, feedAbc: 0 };
    }
};

// React komponenta pro administraci produktové synchronizace
const ProductSyncAdmin: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingFeed2, setIsLoadingFeed2] = useState(false);
    const [isLoadingFeedAbc, setIsLoadingFeedAbc] = useState(false);
    const [selectedFeed, setSelectedFeed] = useState<'feed_1' | 'feed_2' | 'feed_abc'>('feed_1');
    
    // State pro Feed 1
    const [lastSyncStatus, setLastSyncStatus] = useState<SyncLog | null>(null);
    const [productCount, setProductCount] = useState<number>(0);
    
    // State pro Feed 2
    const [lastSyncStatusFeed2, setLastSyncStatusFeed2] = useState<SyncLog | null>(null);
    const [productCountFeed2, setProductCountFeed2] = useState<number>(0);

    // State pro Feed ABC
    const [lastSyncStatusFeedAbc, setLastSyncStatusFeedAbc] = useState<SyncLog | null>(null);
    const [productCountFeedAbc, setProductCountFeedAbc] = useState<number>(0);
    const [productsFeedAbc, setProductsFeedAbc] = useState<any[]>([]);
    const [feedAbcPage, setFeedAbcPage] = useState<number>(0);
    const FEED_ABC_PAGE_SIZE = 20;

    // Načteme data při startu
    useEffect(() => {
        loadSyncStatus();
        loadProductCount();
        loadSyncStatusFeed2();
        loadProductCountFeed2();
        loadSyncStatusFeedAbc();
        loadProductCountFeedAbc();
        loadProductsFeedAbc(0);
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

    const loadSyncStatusFeedAbc = async () => {
        try {
            const log = await getLastSyncLog('product_feed_abc');
            setLastSyncStatusFeedAbc(log);
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

    const loadProductCountFeedAbc = async () => {
        try {
            const { count, error } = await supabaseClient
                .from('product_feed_abc')
                .select('*', { count: 'exact', head: true });

            if (error) {
                return;
            }

            setProductCountFeedAbc(count || 0);
        } catch (error) {
        }
    };

    const loadProductsFeedAbc = async (page = 0) => {
        try {
            const from = page * 20;
            const to = from + 19;
            const { data, error } = await supabaseClient
                .from('product_feed_abc')
                .select('product_code, product_name, category, price_a, price_b, price_b_percents, price_c, price_c_percents, in_action, availability, accessibility, add_to_cart_id, variants_json, sales_last_30_days, url, thumbnail, sync_status, last_sync_at')
                .order('sales_last_30_days', { ascending: false })
                .range(from, to);

            if (error) return;
            setProductsFeedAbc(data || []);
            setFeedAbcPage(page);
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
                    'Content-Type': 'application/json'
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
                // Zobrazíme zprávu, že synchronizace byla spuštěna
                alert('✅ Synchronizace Feed 2 byla spuštěna na pozadí. Sledujte stav na této stránce.');
                
                // Začneme polling stavu synchronizace každých 5 sekund
                const pollInterval = setInterval(async () => {
                    await loadSyncStatusFeed2();
                    await loadProductCountFeed2();
                    
                    // Pokud synchronizace už není running, zastavíme polling
                    const { data: latestLog } = await supabaseClient
                        .from('sync_logs')
                        .select('*')
                        .eq('sync_type', 'product_feed_2')
                        .order('started_at', { ascending: false })
                        .limit(1)
                        .single();
                    
                    if (latestLog && latestLog.status !== 'running') {
                        clearInterval(pollInterval);
                        setIsLoadingFeed2(false);
                        
                        if (latestLog.status === 'success') {
                            alert(`✅ Synchronizace Feed 2 dokončena!\n\n📊 Zpracováno: ${latestLog.records_processed}\n➕ Vloženo: ${latestLog.records_inserted}\n🔄 Aktualizováno: ${latestLog.records_updated}\n❌ Selhalo: ${latestLog.records_failed}`);
                        } else {
                            alert(`❌ Synchronizace Feed 2 selhala: ${latestLog.error_message || 'Neznámá chyba'}`);
                        }
                    }
                }, 5000); // Kontrolujeme každých 5 sekund
                
                // Zároveň refresh data hned
                await loadSyncStatusFeed2();
                await loadProductCountFeed2();
            } else {
                throw new Error('Nepodařilo se spustit synchronizaci Feed 2');
            }
        } catch (error) {
            alert('❌ Chyba při spouštění synchronizace Feed 2: ' + (error instanceof Error ? error.message : 'Neznámá chyba'));
            setIsLoadingFeed2(false);
        }
    };

    const handleManualSyncFeedAbc = async () => {
        setIsLoadingFeedAbc(true);
        try {
            const success = await syncProductsFeedAbc();

            if (success) {
                alert('✅ Synchronizace Feed ABC byla spuštěna na pozadí. Sledujte stav na této stránce.');

                const pollInterval = setInterval(async () => {
                    await loadSyncStatusFeedAbc();
                    await loadProductCountFeedAbc();

                    const { data: latestLog } = await supabaseClient
                        .from('sync_logs')
                        .select('*')
                        .eq('sync_type', 'product_feed_abc')
                        .order('started_at', { ascending: false })
                        .limit(1)
                        .single();

                    if (latestLog && latestLog.status !== 'running') {
                        clearInterval(pollInterval);
                        setIsLoadingFeedAbc(false);

                        if (latestLog.status === 'success') {
                            alert(`✅ Synchronizace Feed ABC dokončena!\n\n📊 Zpracováno: ${latestLog.records_processed}\n➕ Vloženo: ${latestLog.records_inserted}\n🔄 Aktualizováno: ${latestLog.records_updated}\n❌ Selhalo: ${latestLog.records_failed}`);
                        } else {
                            alert(`❌ Synchronizace Feed ABC selhala: ${latestLog.error_message || 'Neznámá chyba'}`);
                        }
                    }
                }, 5000);

                await loadSyncStatusFeedAbc();
                await loadProductCountFeedAbc();
                await loadProductsFeedAbc(0);
            } else {
                throw new Error('Nepodařilo se spustit synchronizaci Feed ABC');
            }
        } catch (error) {
            alert('❌ Chyba při spouštění synchronizace Feed ABC: ' + (error instanceof Error ? error.message : 'Neznámá chyba'));
            setIsLoadingFeedAbc(false);
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
                <button
                    onClick={() => setSelectedFeed('feed_abc')}
                    className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
                        selectedFeed === 'feed_abc'
                            ? 'border-bewit-blue text-bewit-blue'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Feed ABC - Product Feed ABC

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

            {/* Obsah pro Feed ABC */}
            {selectedFeed === 'feed_abc' && (
                <>
                    {/* Statistiky Feed ABC */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="bg-emerald-100 rounded-lg p-4">
                            <h3 className="text-lg font-semibold text-emerald-700 mb-2">Produkty v databázi (Feed ABC)</h3>
                            <p className="text-3xl font-bold text-emerald-700">{productCountFeedAbc}</p>
                            <p className="text-xs text-gray-600 mt-2">Tabulka: product_feed_abc</p>
                        </div>

                        {lastSyncStatusFeedAbc && (
                            <div className={`rounded-lg p-4 ${lastSyncStatusFeedAbc.status === 'success' ? 'bg-green-100' : lastSyncStatusFeedAbc.status === 'error' ? 'bg-red-100' : 'bg-yellow-100'}`}>
                                <h3 className="text-lg font-semibold mb-2">Poslední synchronizace</h3>
                                <p className="text-sm">
                                    <strong>Status:</strong> {lastSyncStatusFeedAbc.status === 'success' ? '✅ Úspěch' : lastSyncStatusFeedAbc.status === 'error' ? '❌ Chyba' : '⏳ Běží'}
                                </p>
                                <p className="text-sm">
                                    <strong>Čas:</strong> {formatDate(lastSyncStatusFeedAbc.started_at)}
                                </p>
                                {lastSyncStatusFeedAbc.status === 'success' && (
                                    <>
                                        <p className="text-sm">
                                            <strong>Zpracováno:</strong> {lastSyncStatusFeedAbc.records_processed}
                                        </p>
                                        <p className="text-sm">
                                            <strong>Nových:</strong> {lastSyncStatusFeedAbc.records_inserted},{' '}
                                            <strong>Aktualizováno:</strong> {lastSyncStatusFeedAbc.records_updated}
                                        </p>
                                    </>
                                )}
                                {lastSyncStatusFeedAbc.error_message && (
                                    <p className="text-sm text-red-600 mt-2">
                                        <strong>Chyba:</strong> {lastSyncStatusFeedAbc.error_message}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Tlačítka Feed ABC */}
                    <div className="flex gap-4 mb-6">
                        <button
                            onClick={handleManualSyncFeedAbc}
                            disabled={isLoadingFeedAbc}
                            className="flex-1 bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                            {isLoadingFeedAbc ? '⏳ Synchronizuji Feed ABC...' : '🔄 Synchronizovat Feed ABC nyní'}
                        </button>
                        <button
                            onClick={() => window.open(BEWIT_FEED_ABC_URL, '_blank')}
                            className="bg-gray-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
                        >
                            📋 Zobrazit feed
                        </button>
                    </div>

                    {/* Tabulka produktů */}
                    {productsFeedAbc.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-base font-semibold text-gray-700">
                                    Produkty (řazeno dle prodejů za 30 dní)
                                </h3>
                                <button
                                    onClick={() => loadProductsFeedAbc(0)}
                                    className="text-xs text-emerald-600 hover:underline"
                                >
                                    ↻ Obnovit
                                </button>
                            </div>
                            <div className="overflow-x-auto rounded-lg border border-gray-200">
                                <table className="w-full text-xs">
                                    <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                                        <tr>
                                            <th className="px-3 py-2 text-left">Produkt</th>
                                            <th className="px-3 py-2 text-left">Kategorie</th>
                                            <th className="px-3 py-2 text-right">Cena A</th>
                                            <th className="px-3 py-2 text-right">Cena B</th>
                                            <th className="px-3 py-2 text-right">Cena C</th>
                                            <th className="px-3 py-2 text-center">Akce</th>
                                            <th className="px-3 py-2 text-center">Sklad</th>
                                            <th className="px-3 py-2 text-center">Prodeje/30d</th>
                                            <th className="px-3 py-2 text-left">Přístupnost</th>
                                            <th className="px-3 py-2 text-left">ADD_TO_CART_ID</th>
                                            <th className="px-3 py-2 text-center">Variant</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {productsFeedAbc.map((p, idx) => (
                                            <tr key={p.product_code} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                <td className="px-3 py-2 max-w-xs">
                                                    <a
                                                        href={p.url || '#'}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-emerald-700 font-medium hover:underline"
                                                    >
                                                        {p.product_name}
                                                    </a>
                                                    <div className="text-gray-400 text-xs mt-0.5 font-mono">{p.product_code}</div>
                                                </td>
                                                <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{p.category || '–'}</td>
                                                <td className="px-3 py-2 text-right font-semibold text-gray-800 whitespace-nowrap">
                                                    {p.price_a != null ? `${p.price_a} Kč` : '–'}
                                                </td>
                                                <td className="px-3 py-2 text-right text-blue-600 whitespace-nowrap">
                                                    {p.price_b != null ? (
                                                        <span>
                                                            {p.price_b} Kč
                                                            {p.price_b_percents != null && (
                                                                <span className="ml-1 text-gray-400">(-{p.price_b_percents}%)</span>
                                                            )}
                                                        </span>
                                                    ) : '–'}
                                                </td>
                                                <td className="px-3 py-2 text-right text-purple-600 whitespace-nowrap">
                                                    {p.price_c != null ? (
                                                        <span>
                                                            {p.price_c} Kč
                                                            {p.price_c_percents != null && (
                                                                <span className="ml-1 text-gray-400">(-{p.price_c_percents}%)</span>
                                                            )}
                                                        </span>
                                                    ) : '–'}
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    {p.in_action ? (
                                                        <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-xs font-semibold">AKCE</span>
                                                    ) : (
                                                        <span className="text-gray-300">–</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    {p.availability === 1 ? (
                                                        <span className="text-green-600 font-semibold">✓</span>
                                                    ) : (
                                                        <span className="text-red-400">✗</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-center font-semibold text-emerald-700">
                                                    {p.sales_last_30_days}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <div className="flex flex-wrap gap-1">
                                                        {(p.accessibility || []).map((a: string) => (
                                                            <span key={a} className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                                                a === 'public' ? 'bg-green-100 text-green-700' :
                                                                a === 'birthday' ? 'bg-pink-100 text-pink-700' :
                                                                'bg-orange-100 text-orange-700'
                                                            }`}>
                                                                {a}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 font-mono text-gray-500 whitespace-nowrap">
                                                    {p.add_to_cart_id || '–'}
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    {p.variants_json && Array.isArray(p.variants_json) ? (
                                                        <span
                                                            title={JSON.stringify(p.variants_json, null, 2)}
                                                            className="cursor-help bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded text-xs font-semibold"
                                                        >
                                                            {p.variants_json.length}×
                                                        </span>
                                                    ) : '–'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Stránkování */}
                            <div className="flex items-center justify-between mt-3">
                                <button
                                    onClick={() => loadProductsFeedAbc(feedAbcPage - 1)}
                                    disabled={feedAbcPage === 0}
                                    className="px-3 py-1.5 text-xs bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    ← Předchozí
                                </button>
                                <span className="text-xs text-gray-500">
                                    Strana {feedAbcPage + 1} · zobrazeno {feedAbcPage * 20 + 1}–{Math.min((feedAbcPage + 1) * 20, productCountFeedAbc)} z {productCountFeedAbc}
                                </span>
                                <button
                                    onClick={() => loadProductsFeedAbc(feedAbcPage + 1)}
                                    disabled={(feedAbcPage + 1) * 20 >= productCountFeedAbc}
                                    className="px-3 py-1.5 text-xs bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    Další →
                                </button>
                            </div>
                        </div>
                    )}

                    {productsFeedAbc.length === 0 && productCountFeedAbc === 0 && (
                        <div className="text-center py-8 text-gray-400 text-sm">
                            Žádné produkty. Spusťte synchronizaci.
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ProductSyncAdmin;
export { ProductSyncAdmin, parseXMLFeed, fetchXMLFeed, syncProductsToSupabase };
