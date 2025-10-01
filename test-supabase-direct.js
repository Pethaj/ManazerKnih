// Přímý test Supabase připojení a mapování
import { createClient } from '@supabase/supabase-js';

// Supabase konfigurace
const SUPABASE_URL = 'https://umxkjdllhlkclrplxdxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVteGtqZGxsaGxrY2xycGx4ZHh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjEyMzM0MTMsImV4cCI6MjAzNjgwOTQxM30.MKSjLqO1YMGwGOdZIttWOwrCaQTSHkf6Fc-9XQbQ8t0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ID z webhook testu
const WEBHOOK_IDS = ['1002318245', '1002737245', '1002324245'];

async function testSupabaseConnection() {
    console.log('🔍 TESTOVÁNÍ SUPABASE PŘIPOJENÍ A MAPOVÁNÍ');
    console.log('='.repeat(60));
    
    try {
        // Test 1: Základní připojení
        console.log('\n📡 TEST 1: Základní připojení...');
        const { data: { session } } = await supabase.auth.getSession();
        console.log('✅ Supabase klient funguje');
        console.log(`🔐 Auth session: ${session?.session ? 'Ano' : 'Ne'}`);
        
        // Test 2: Existence tabulky
        console.log('\n📋 TEST 2: Existence tabulky products...');
        const { data: tableTest, error: tableError } = await supabase
            .from('products')
            .select('count')
            .limit(1);
            
        if (tableError) {
            if (tableError.code === 'PGRST116') {
                console.log('❌ Tabulka "products" NEEXISTUJE!');
                return;
            } else {
                console.log(`❌ Chyba při přístupu k tabulce: ${tableError.message}`);
                return;
            }
        }
        console.log('✅ Tabulka "products" existuje');
        
        // Test 3: Počet záznamů
        console.log('\n📊 TEST 3: Počet záznamů...');
        const { count, error: countError } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true });
            
        if (countError) {
            console.log(`❌ Chyba při počítání: ${countError.message}`);
            return;
        }
        console.log(`📈 Celkem záznamů v tabulce: ${count}`);
        
        if (count === 0) {
            console.log('⚠️ Tabulka je prázdná!');
            return;
        }
        
        // Test 4: Webhooks ID test - KLÍČOVÝ TEST
        console.log('\n🎯 TEST 4: Webhook ID v Supabase...');
        console.log(`Hledám ID: ${WEBHOOK_IDS.join(', ')}`);
        
        const { data: webhookProducts, error: webhookError } = await supabase
            .from('products')
            .select('*')
            .in('product_code', WEBHOOK_IDS);
            
        if (webhookError) {
            console.log(`❌ Chyba při hledání webhook ID: ${webhookError.message}`);
            return;
        }
        
        console.log(`📦 Nalezeno: ${webhookProducts?.length || 0}/${WEBHOOK_IDS.length} produktů`);
        
        if (!webhookProducts || webhookProducts.length === 0) {
            console.log('\n❌ ŽÁDNÉ WEBHOOK ID NENALEZENY!');
            console.log('\n🔍 Hledám podobná ID v tabulce...');
            
            // Najdi prvních 10 product_code pro porovnání
            const { data: sampleProducts } = await supabase
                .from('products')
                .select('product_code, name')
                .limit(10);
                
            if (sampleProducts && sampleProducts.length > 0) {
                console.log('📋 Ukázka existujících product_code:');
                sampleProducts.forEach((p, i) => {
                    console.log(`   ${i+1}. ${p.product_code} - ${p.name}`);
                });
                
                // Analýza formátu
                console.log('\n🔬 Analýza formátu ID:');
                console.log(`Webhook očekává: ${WEBHOOK_IDS[0]} (délka: ${WEBHOOK_IDS[0].length})`);
                console.log(`Supabase má: ${sampleProducts[0].product_code} (délka: ${sampleProducts[0].product_code.length})`);
                
                // Zkus najít částečnou shodu
                console.log('\n🔍 Hledám částečné shody...');
                for (const webhookId of WEBHOOK_IDS) {
                    const partialMatches = sampleProducts.filter(p => 
                        p.product_code.includes(webhookId) || webhookId.includes(p.product_code)
                    );
                    
                    if (partialMatches.length > 0) {
                        console.log(`   ${webhookId} → možné shody:`, partialMatches.map(p => p.product_code));
                    } else {
                        console.log(`   ${webhookId} → žádné částečné shody`);
                    }
                }
            }
            
            console.log('\n💡 ŘEŠENÍ:');
            console.log('1. Zkontrolujte formát product_code v tabulce vs webhook');
            console.log('2. Přidejte chybějící produkty do tabulky');
            console.log('3. Upravte webhook aby vracel správná ID');
            
            return;
        }
        
        // Test 5: Analýza nalezených produktů
        console.log('\n📋 TEST 5: Analýza nalezených produktů...');
        console.log('-'.repeat(50));
        
        let completeProducts = 0;
        webhookProducts.forEach((product, index) => {
            console.log(`\n${index + 1}. PRODUKT: ${product.product_code}`);
            console.log(`   📝 Název: ${product.name || 'CHYBÍ'}`);
            console.log(`   💰 Cena: ${product.price || 'CHYBÍ'} ${product.currency || 'N/A'}`);
            console.log(`   🔗 URL: ${product.product_url ? 'Má' : 'CHYBÍ'}`);
            console.log(`   🖼️ Obrázek: ${product.image_url ? 'Má' : 'CHYBÍ'}`);
            console.log(`   🏷️ Kategorie: ${product.category || 'CHYBÍ'}`);
            
            // Kontrola datových typů
            console.log(`   🔬 Typy dat:`);
            console.log(`      - price: ${typeof product.price} (${product.price})`);
            console.log(`      - name: ${typeof product.name} (délka: ${product.name?.length || 0})`);
            console.log(`      - product_url: ${typeof product.product_url} (délka: ${product.product_url?.length || 0})`);
            
            // Kontrola kompletnosti pro carousel
            const hasName = product.name && product.name.trim() !== '';
            const hasPrice = product.price !== null && product.price !== undefined;
            const hasUrl = product.product_url && product.product_url.trim() !== '';
            const hasImage = product.image_url && product.image_url.trim() !== '';
            
            if (hasName && hasPrice && hasUrl && hasImage) {
                console.log(`   ✅ KOMPLETNÍ pro carousel`);
                completeProducts++;
            } else {
                console.log(`   ⚠️ NEKOMPLETNÍ pro carousel`);
                const missing = [];
                if (!hasName) missing.push('název');
                if (!hasPrice) missing.push('cena');
                if (!hasUrl) missing.push('URL');
                if (!hasImage) missing.push('obrázek');
                console.log(`      Chybí: ${missing.join(', ')}`);
            }
        });
        
        // Test 6: Simulace hybridního mapování
        console.log('\n🔗 TEST 6: Simulace hybridního mapování...');
        console.log('-'.repeat(50));
        
        const mockWebhookData = WEBHOOK_IDS.map((id, index) => ({
            id: id,
            recommendation: `AI doporučení pro produkt ${id} - výborný pro vaše potřeby.`
        }));
        
        const mappedProducts = mockWebhookData.map((webhookProduct, index) => {
            const supabaseProduct = webhookProducts.find(sp => sp.product_code === webhookProduct.id);
            
            if (supabaseProduct) {
                // Přesná simulace mapování z hybridProductService.ts
                const cleanedProductName = supabaseProduct.name && supabaseProduct.name.trim() !== '' 
                    ? supabaseProduct.name.trim()
                    : `BEWIT Produkt ${supabaseProduct.product_code}`;
                
                const cleanedPrice = supabaseProduct.price !== null && supabaseProduct.price !== undefined
                    ? Number(supabaseProduct.price)
                    : null;
                
                const cleanedCurrency = supabaseProduct.currency && supabaseProduct.currency.trim() !== ''
                    ? supabaseProduct.currency.trim()
                    : 'CZK';
                
                const cleanedProductUrl = supabaseProduct.product_url && supabaseProduct.product_url.trim() !== ''
                    ? supabaseProduct.product_url.trim()
                    : null;
                
                const cleanedImageUrl = supabaseProduct.image_url && supabaseProduct.image_url.trim() !== ''
                    ? supabaseProduct.image_url.trim()
                    : null;
                
                return {
                    id: index + 1,
                    product_code: supabaseProduct.product_code,
                    product_name: cleanedProductName,
                    description: webhookProduct.recommendation,
                    category: supabaseProduct.category?.trim() || 'Nezařazeno',
                    price: cleanedPrice,
                    currency: cleanedCurrency,
                    product_url: cleanedProductUrl,
                    image_url: cleanedImageUrl,
                    similarity_score: 0.9,
                    webhook_recommendation: webhookProduct.recommendation
                };
            } else {
                return null; // Fallback
            }
        }).filter(Boolean);
        
        console.log(`Mapováno ${mappedProducts.length} produktů:`);
        mappedProducts.forEach((product, index) => {
            console.log(`\n${index + 1}. ${product.product_name}`);
            console.log(`   Code: ${product.product_code}`);
            console.log(`   Cena: ${product.price} ${product.currency}`);
            console.log(`   URL: ${product.product_url ? 'OK' : 'CHYBÍ'}`);
            console.log(`   Obrázek: ${product.image_url ? 'OK' : 'CHYBÍ'}`);
        });
        
        // Finální hodnocení
        console.log('\n🎯 FINÁLNÍ HODNOCENÍ:');
        console.log('='.repeat(30));
        console.log(`Webhook ID: ${WEBHOOK_IDS.length}`);
        console.log(`Nalezeno v Supabase: ${webhookProducts.length}`);
        console.log(`Kompletní produkty: ${completeProducts}`);
        console.log(`Mapované produkty: ${mappedProducts.length}`);
        
        if (mappedProducts.length === WEBHOOK_IDS.length && completeProducts === WEBHOOK_IDS.length) {
            console.log('\n✅ PERFEKTNÍ - vše funguje jak má!');
            console.log('💡 Pokud carousel stále nefunguje, problém je v aplikační logice.');
        } else if (mappedProducts.length === 0) {
            console.log('\n❌ KRITICKÝ PROBLÉM - žádné webhook ID nejsou v Supabase!');
            console.log('💡 Přidejte produkty s těmito ID do tabulky nebo upravte webhook.');
        } else {
            console.log('\n⚠️ ČÁSTEČNÝ PROBLÉM - některé produkty mají neúplná data');
            console.log('💡 Doplňte chybějící informace v Supabase tabulce.');
        }
        
        // JSON export pro debugging
        if (mappedProducts.length > 0) {
            console.log('\n📄 JSON EXPORT PRO DEBUGGING:');
            console.log(JSON.stringify(mappedProducts, null, 2));
        }
        
    } catch (error) {
        console.error('\n❌ KRITICKÁ CHYBA:');
        console.error(`Message: ${error.message}`);
        console.error(`Code: ${error.code}`);
        console.error(`Stack: ${error.stack}`);
    }
}

// Spusť test
testSupabaseConnection();
