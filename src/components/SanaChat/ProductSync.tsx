import React, { useState, useEffect } from 'react';
import { supabase as supabaseClient } from '../../lib/supabase';

// URL produktového feedu BEWIT
const BEWIT_FEED_URL = 'https://bewit.love/feeds/zbozi.xml';

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
                console.error(`Chyba při parsování produktu ${index}:`, error);
            }
        });

        return products;
    } catch (error) {
        console.error('Chyba při parsování XML feedu:', error);
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
        console.error('Chyba při načítání XML feedu:', error);
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
                console.error('Chyba při hledání existujícího produktu:', selectError);
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
                    console.error('Chyba při aktualizaci produktu:', updateError);
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
                    console.error('Chyba při vkládání produktu:', insertError);
                    failed++;
                } else {
                    inserted++;
                }
            }
        } catch (error) {
            console.error('Neočekávaná chyba při zpracování produktu:', error);
            failed++;
        }
    }

    return { inserted, updated, failed };
};

// Hlavní funkce pro synchronizaci
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
        console.error('Chyba při vytváření sync logu:', logError);
        return false;
    }

    const logId = logData.id;

    try {
        console.log('🔄 Začínám synchronizaci produktového feedu z BEWIT...');
        
        // 1. Načteme XML feed
        const xmlText = await fetchXMLFeed(BEWIT_FEED_URL);
        console.log('✅ XML feed načten úspěšně');

        // 2. Parsujeme XML
        const products = await parseXMLFeed(xmlText);
        console.log(`✅ Naparsováno ${products.length} produktů`);

        // 3. Synchronizujeme do Supabase
        const result = await syncProductsToSupabase(products);
        console.log(`✅ Synchronizace dokončena: ${result.inserted} vloženo, ${result.updated} aktualizováno, ${result.failed} chyb`);

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
        console.error('❌ Chyba při synchronizaci produktového feedu:', error);
        
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

// React komponenta pro administraci produktové synchronizace
const ProductSyncAdmin: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [lastSyncStatus, setLastSyncStatus] = useState<SyncLog | null>(null);
    const [productCount, setProductCount] = useState<number>(0);

    // Načteme data při startu
    useEffect(() => {
        loadSyncStatus();
        loadProductCount();
    }, []);

    const loadSyncStatus = async () => {
        try {
            const { data, error } = await supabaseClient
                .from('sync_logs')
                .select('*')
                .eq('sync_type', 'products_feed')
                .order('started_at', { ascending: false })
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Chyba při načítání sync statusu:', error);
                return;
            }

            setLastSyncStatus(data);
        } catch (error) {
            console.error('Chyba při načítání sync statusu:', error);
        }
    };

    const loadProductCount = async () => {
        try {
            const { count, error } = await supabaseClient
                .from('products')
                .select('*', { count: 'exact', head: true });

            if (error) {
                console.error('Chyba při načítání počtu produktů:', error);
                return;
            }

            setProductCount(count || 0);
        } catch (error) {
            console.error('Chyba při načítání počtu produktů:', error);
        }
    };

    // Nová funkce pro HTTP synchronizaci
    const handleHttpSync = async () => {
        setIsLoading(true);
        try {
            console.log('🚀 Spouštím HTTP synchronizaci přes Edge Function...');
            
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
            console.log('✅ Odpověď z Edge Function:', result);

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
            console.error('❌ Chyba při HTTP synchronizaci:', error);
            alert('❌ Chyba při synchronizaci: ' + (error instanceof Error ? error.message : 'Neznámá chyba'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleManualSync = async () => {
        // Použijeme novou HTTP metodu místo staré
        await handleHttpSync();
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('cs-CZ');
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-bewit-dark mb-6">
                🛒 Synchronizace produktů BEWIT
            </h2>
            
            {/* Statistiky */}
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

            {/* Tlačítka */}
            <div className="flex gap-4">
                <button
                    onClick={handleManualSync}
                    disabled={isLoading}
                    className="flex-1 bg-bewit-blue text-white px-6 py-3 rounded-lg font-semibold hover:bg-bewit-blue/90 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                    {isLoading ? '⏳ Synchronizuji...' : '🔄 Spustit synchronizaci'}
                </button>
                
                <button
                    onClick={() => window.open(BEWIT_FEED_URL, '_blank')}
                    className="bg-gray-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
                >
                    📋 Zobrazit feed
                </button>
            </div>

            {/* Informace o automatické synchronizaci */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-700 mb-2">ℹ️ Automatická synchronizace</h3>
                <p className="text-sm text-gray-600">
                    Pro nastavení automatické denní synchronizace můžete použít cron job nebo Supabase Edge Functions.
                    Produkty se budou synchronizovat z feedu: <code className="bg-gray-200 px-2 py-1 rounded">{BEWIT_FEED_URL}</code>
                </p>
            </div>
        </div>
    );
};

export default ProductSyncAdmin;
export { ProductSyncAdmin, parseXMLFeed, fetchXMLFeed, syncProductsToSupabase };
