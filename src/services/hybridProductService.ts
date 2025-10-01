/**
 * Hybrid Product Service
 * Kombinuje doporučení z webhooku s údaji z Supabase tabulky products
 */

import { supabase } from '../lib/supabase';
import { ProductRecommendation } from './productSearchService';

// Používáme centrální Supabase klienta
const supabaseClient = supabase;

// Webhook URL pro produktová doporučení
const WEBHOOK_URL = 'https://n8n.srv980546.hstgr.cloud/webhook/cd6b668b-1e35-4018-9bf4-28d0926b023b';

/**
 * Struktura produktu z webhooku
 */
export interface WebhookProductData {
  id: string;
  recommendation: string;
}

/**
 * Struktura produktu z Supabase tabulky products
 */
export interface SupabaseProduct {
  id: number;
  product_code: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number | null;
  currency: string;
  availability: number;
  product_url: string | null;
  image_url: string | null;
  brand: string;
  created_at: string;
  updated_at: string;
}

/**
 * Kombinovaný produkt pro carousel
 */
export interface HybridProductRecommendation {
  id: number;
  product_code: string;
  product_name: string;
  description: string | null;
  category: string | null;
  price: number | null;
  currency: string;
  product_url: string | null;
  image_url: string | null;
  similarity_score?: number;
  webhook_recommendation: string; // Text doporučení z webhooku
}

/**
 * Odešle dotaz na webhook a získá ID produktů s doporučeními
 */
export async function getProductRecommendationsFromWebhook(
  userMessage: string,
  sessionId?: string
): Promise<WebhookProductData[]> {
  console.log(`🌐 Zasílám dotaz na webhook: "${userMessage}"`);
  
  try {
    const requestData = {
      chatInput: userMessage.trim(),
      session_id: sessionId || `session_${Date.now()}`,
      timestamp: new Date().toISOString()
    };
    
    console.log('📤 Request payload:', JSON.stringify(requestData, null, 2));
    console.log('🔗 Webhook URL:', WEBHOOK_URL);
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData)
    });
    
    console.log(`📡 Response status: ${response.status} ${response.statusText}`);
    console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ HTTP Error ${response.status}:`, errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const rawText = await response.text();
    console.log('📄 Raw response text (prvních 500 znaků):', rawText.substring(0, 500));
    console.log('📏 Response length:', rawText.length, 'znaků');
    
    let webhookResponse;
    
    try {
      webhookResponse = JSON.parse(rawText);
      console.log('✅ JSON parse úspěšný');
    } catch (parseError) {
      console.warn('⚠️ JSON parse selhalo, používám raw text:', parseError);
      webhookResponse = rawText;
    }
    
    console.log('📥 Parsed webhook response:', JSON.stringify(webhookResponse, null, 2));
    console.log('🔍 Response type:', typeof webhookResponse);
    console.log('🔢 Is array:', Array.isArray(webhookResponse));
    
    if (typeof webhookResponse === 'object' && webhookResponse !== null) {
      console.log('🗝️ Response keys:', Object.keys(webhookResponse));
    }
    
    // Extraktor ID produktů a doporučení z různých formátů odpovědi
    const extractedProducts = extractProductIdsFromWebhookResponse(webhookResponse);
    
    console.log(`🎯 Celkem extrahováno ${extractedProducts.length} produktů z webhook odpovědi`);
    
    return extractedProducts;
    
  } catch (error) {
    console.error('❌ Chyba při komunikaci s webhookem:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    throw new Error(`Webhook error: ${error instanceof Error ? error.message : 'Neznámá chyba'}`);
  }
}

/**
 * Extrahuje ID produktů a doporučení z webhook odpovědi
 * Podporuje různé formáty odpovědí z N8N webhooku
 */
function extractProductIdsFromWebhookResponse(webhookResponse: any): WebhookProductData[] {
  console.log('🔍 ZAČÍNÁM EXTRAKCI PRODUKTOVÝCH ID Z WEBHOOK ODPOVĚDI');
  console.log('📊 Input type:', typeof webhookResponse);
  console.log('🔢 Is array:', Array.isArray(webhookResponse));
  
  const products: WebhookProductData[] = [];
  
  try {
    // Rozpoznání různých formátů odpovědi
    let productsData = null;
    let detectedFormat = 'unknown';
    
    // Formát 1: Array s vnořeným data objektem
    if (Array.isArray(webhookResponse) && webhookResponse[0]?.data) {
      productsData = webhookResponse[0].data;
      detectedFormat = 'array_with_nested_data';
      console.log('✅ Detekován formát: Array s vnořeným data objektem');
      console.log('📦 Data path: [0].data, obsahuje:', Array.isArray(productsData) ? `${productsData.length} items` : typeof productsData);
    } 
    // Formát 2: Přímý array produktů
    else if (Array.isArray(webhookResponse)) {
      productsData = webhookResponse;
      detectedFormat = 'direct_array';
      console.log('✅ Detekován formát: Přímý array produktů');
      console.log('📦 Array length:', productsData.length);
    } 
    // Formát 3: Objekt s data polem
    else if (webhookResponse?.data && Array.isArray(webhookResponse.data)) {
      productsData = webhookResponse.data;
      detectedFormat = 'object_with_data_field';
      console.log('✅ Detekován formát: Objekt s data polem');
      console.log('📦 Data field contains:', productsData.length, 'items');
    }
    // Formát 4: Textový výstup s výčtem produktů
    else if (typeof webhookResponse === 'string' || webhookResponse?.output) {
      detectedFormat = 'text_output';
      console.log('✅ Detekován formát: Textový výstup');
      console.log('📄 Text preview:', (webhookResponse?.output || webhookResponse).substring(0, 200));
      return extractProductIdsFromText(webhookResponse?.output || webhookResponse);
    }
    // Formát 5: Zkusme prohledat všechny možné paths
    else {
      console.log('🔍 Neznámý formát, prohledávám možné cesty...');
      
      const searchPaths = [
        'products', 'recommended_products', 'items', 'results',
        'response.data', 'response.products', 'payload.data'
      ];
      
      for (const path of searchPaths) {
        try {
          let value = webhookResponse;
          const parts = path.split('.');
          
          for (const part of parts) {
            value = value[part];
          }
          
          if (Array.isArray(value) && value.length > 0) {
            productsData = value;
            detectedFormat = `custom_path_${path}`;
            console.log(`✅ Nalezena data na cestě "${path}":`, value.length, 'items');
            break;
          }
        } catch (e) {
          // Ignoruj chyby při prohledávání
        }
      }
      
      if (!productsData) {
        console.log('❌ Žádný známý formát nebyl rozpoznán');
        console.log('🔍 Kompletní struktura odpovědi:', JSON.stringify(webhookResponse, null, 2));
        return products;
      }
    }
    
    console.log(`📋 Detekovaný formát: ${detectedFormat}`);
    
    if (productsData && Array.isArray(productsData)) {
      console.log(`📦 Zpracovávám ${productsData.length} položek z webhooku`);
      
      if (productsData.length === 0) {
        console.warn('⚠️ Array je prázdný, žádná data k zpracování');
        return products;
      }
      
      // Ukázka první položky pro analýzu
      console.log('🔍 První položka v datech:', JSON.stringify(productsData[0], null, 2));
      
      productsData.forEach((product: any, index: number) => {
        console.log(`\n🔍 Zpracovávám položku ${index + 1}/${productsData.length}:`);
        console.log('📊 Typ položky:', typeof product);
        console.log('🗝️ Dostupná pole:', Object.keys(product || {}));
        
        // Extrahuj ID produktu z různých možných polí
        let productId = null;
        
        // Nejdříve zkusíme standardní pole pro ID produktu
        const idFields = [
          'id', 'product_id', 'product_code', 'productId', 'code',
          'ID produktu', 'ID_produktu', 'kod', 'kód', 'čísloProduktu',
          'sku', 'SKU', 'itemId', 'item_id'
        ];
        
        console.log('🔍 Hledám ID produktu v polích:', idFields);
        
        for (const field of idFields) {
          if (product[field] !== undefined && product[field] !== null && product[field] !== '') {
            productId = product[field].toString().trim();
            console.log(`✅ Nalezeno ID v poli "${field}":`, productId);
            break;
          }
        }
        
        // Extrahuj doporučení z různých možných polí
        let recommendation = '';
        const recommendationFields = [
          'doporuceni', 'doporučení', 'recommendation', 'Doporuceni', 'Doporučení',
          'text', 'popis', 'description', 'reason', 'why', 'benefit',
          'doporučení_text', 'recommendation_text'
        ];
        
        console.log('🔍 Hledám doporučení v polích:', recommendationFields);
        
        for (const field of recommendationFields) {
          if (product[field] && typeof product[field] === 'string') {
            recommendation = product[field].trim();
            console.log(`✅ Nalezeno doporučení v poli "${field}":`, recommendation.substring(0, 100));
            
            // SPECIÁLNÍ LOGIKA: Pokud ID nebylo nalezeno v separátním poli,
            // zkus ho extrahovat z textu doporučení
            if (!productId && recommendation) {
              const extractedId = extractProductIdFromText(recommendation);
              if (extractedId) {
                productId = extractedId;
                console.log(`🎯 Extrahováno ID z textu doporučení: ${productId}`);
              }
            }
            
            break;
          }
        }
        
        if (productId) {
          const productData: WebhookProductData = {
            id: productId,
            recommendation: recommendation || 'Doporučený produkt pro vaše potřeby'
          };
          
          products.push(productData);
          console.log(`✅ Přidán produkt:`, productData);
        } else {
          console.warn(`⚠️ Nepodařilo se extrahovat ID produktu z položky ${index + 1}`);
          console.warn('   Kompletní objekt:', JSON.stringify(product, null, 2));
        }
      });
    } else {
      console.warn('⚠️ ProductsData není array nebo je undefined:', typeof productsData);
    }
    
  } catch (error) {
    console.error('❌ Chyba při extrakci ID produktů:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack');
  }
  
  console.log(`\n🎯 EXTRAKCE DOKONČENA: Celkem extrahováno ${products.length} ID produktů`);
  
  if (products.length === 0) {
    console.error('❌ KRITICKÉ: Žádné produkty nebyly extrahovány z webhook odpovědi!');
    console.error('🔍 Původní odpověď pro debug:', JSON.stringify(webhookResponse, null, 2));
  }
  
  return products;
}

/**
 * Extrahuje jedno ID produktu z textu (pro jednotlivé doporučení)
 */
function extractProductIdFromText(text: string): string | null {
  if (!text || typeof text !== 'string') {
    return null;
  }
  
  console.log('🔍 Extrakce ID z textu:', text.substring(0, 200));
  
  // Regex pattern specifické pro formát z našeho webhooku
  // Hledáme "ID produktu: 1002318245" nebo podobné formáty
  const idPatterns = [
    /ID produktu:\s*(\d+)/gi,
    /product[_\s]*id[:\s]*(\d+)/gi,
    /kód[:\s]*(\d+)/gi,
    /\b(\d{10})\b/g, // 10-místná čísla (typická pro produktové kódy)
    /\b(\d{9,12})\b/g // 9-12 místná čísla jako fallback
  ];
  
  for (const pattern of idPatterns) {
    const match = pattern.exec(text);
    if (match && match[1]) {
      const id = match[1].trim();
      console.log(`✅ Nalezeno ID pomocí pattern ${pattern.source}:`, id);
      return id;
    }
  }
  
  console.log('❌ Žádné ID nenalezeno v textu');
  return null;
}

/**
 * Extrahuje ID produktů z textového výstupu (markdown, HTML, plain text)
 * Pro případy kdy webhook vrací textový seznam produktů
 */
function extractProductIdsFromText(textOutput: string): WebhookProductData[] {
  const products: WebhookProductData[] = [];
  
  if (!textOutput || typeof textOutput !== 'string') {
    return products;
  }
  
  console.log('📝 Analyzuji textový výstup pro extrakci ID produktů...');
  
  try {
    // Regex pattern pro hledání ID produktů v textu
    // Hledáme různé formáty: "ID: 123456", "Kód: 123456", "Produkt 123456", apod.
    const idPatterns = [
      /(?:ID|id|kód|kod|product|produkt)[\s:]*(\d+)/gi,
      /(?:SKU|sku)[\s:]*([A-Z0-9]+)/gi,
      /(?:čísloProduktu|cislo)[\s:]*(\d+)/gi,
      /\b(\d{8,})\b/g // Dlouhá čísla (8+ číslic) jako potenciální ID produktů
    ];
    
    const foundIds = new Set<string>(); // Použijeme Set pro eliminaci duplikátů
    
    idPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(textOutput)) !== null) {
        const id = match[1].trim();
        if (id && id.length >= 3) { // Minimálně 3 znaky pro validní ID
          foundIds.add(id);
        }
      }
    });
    
    // Pro každé nalezené ID pokusíme se najít související text jako doporučení
    Array.from(foundIds).forEach((id, index) => {
      let recommendation = '';
      
      // Pokus o extrakci kontextu kolem nalezeného ID
      const idRegex = new RegExp(`(?:ID|id|kód|kod|product|produkt)[\\s:]*${id}([^\\n]{0,200})`, 'i');
      const contextMatch = textOutput.match(idRegex);
      
      if (contextMatch && contextMatch[1]) {
        recommendation = contextMatch[1].trim();
        // Vyčistit od HTML tagů a markdown
        recommendation = recommendation.replace(/<[^>]*>/g, '').replace(/[*_`]/g, '').trim();
      }
      
      products.push({
        id: id,
        recommendation: recommendation || 'Produkt doporučený AI systémem'
      });
      
      console.log(`✅ Z textu extrahováno ID: ${id}, kontext: ${recommendation.substring(0, 50)}...`);
    });
    
  } catch (error) {
    console.error('❌ Chyba při extrakci ID z textového výstupu:', error);
  }
  
  console.log(`🎯 Z textu celkem extrahováno ${products.length} ID produktů`);
  return products;
}

/**
 * Najde produkty v Supabase tabulce podle product_code
 */
export async function getProductsFromSupabase(productIds: string[]): Promise<SupabaseProduct[]> {
  if (productIds.length === 0) {
    console.log('⚠️ Prázdný seznam ID produktů, vracím prázdný array');
    return [];
  }
  
  console.log(`🔍 Hledám produkty v Supabase podle ID:`, productIds);
  console.log(`🔗 Supabase URL: https://modopafybeslbcqjxsve.supabase.co`);
  
  try {
    // Test Supabase připojení
    console.log('🔄 Testuji Supabase připojení...');
    
    // Dotaz na produkty podle product_code
    const { data, error } = await supabaseClient
      .from('products')
      .select('*')
      .in('product_code', productIds);
    
    if (error) {
      console.error('❌ Supabase dotaz selhal:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error details:', error.details);
      
      // Specifické error handling
      if (error.code === 'PGRST116') {
        throw new Error('Tabulka "products" neexistuje v Supabase databázi. Spusťte create_products_table.sql script.');
      } else if (error.message.includes('Failed to fetch')) {
        throw new Error('Síťová chyba při připojení k Supabase. Zkontrolujte internetové připojení a CORS nastavení.');
      } else {
        throw new Error(`Supabase error: ${error.message} (kód: ${error.code})`);
      }
    }
    
    console.log(`✅ Supabase dotaz úspěšný - nalezeno ${data?.length || 0} produktů`);
    
    if (data && data.length > 0) {
      console.log('📋 Nalezené produkty:', data.map(p => `${p.product_code}: ${p.name}`));
    } else {
      console.warn('⚠️ Žádné produkty nebyly nalezeny pro zadaná ID');
      console.warn('💡 Možné příčiny: produkty neexistují v DB, špatné ID, nebo prázdná tabulka');
    }
    
    return data || [];
    
  } catch (error) {
    console.error('❌ Kritická chyba při načítání produktů ze Supabase:', error);
    
    // Pokud je to network error, přidej více detailů
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.error('🌐 Network error details:');
      console.error('   - Možná CORS blokování');
      console.error('   - Neplatná Supabase URL nebo klíče');
      console.error('   - Síťová nedostupnost');
      console.error('   - Firewall blokování');
      
      throw new Error('Síťová chyba při připojení k Supabase databázi. Zkontrolujte připojení a konfiguraci.');
    }
    
    throw error;
  }
}

/**
 * Kombinuje webhook doporučení s Supabase daty
 */
export function combineWebhookWithSupabaseData(
  webhookProducts: WebhookProductData[],
  supabaseProducts: SupabaseProduct[]
): HybridProductRecommendation[] {
  const combinedProducts: HybridProductRecommendation[] = [];
  
  console.log(`🔗 Kombinuji ${webhookProducts.length} webhook doporučení s ${supabaseProducts.length} Supabase produkty`);
  
  if (webhookProducts.length === 0) {
    console.warn('⚠️ Žádné webhook produkty k kombinování');
    return combinedProducts;
  }
  
  webhookProducts.forEach((webhookProduct, index) => {
    console.log(`\n🔄 Kombinuji produkt ${index + 1}/${webhookProducts.length}: ${webhookProduct.id}`);
    
    // Najdi odpovídající produkt v Supabase datech
    const supabaseProduct = supabaseProducts.find(
      sp => sp.product_code === webhookProduct.id
    );
    
    if (supabaseProduct) {
      // ✅ ÚSPĚŠNÉ KOMBINOVÁNÍ - máme data z obou zdrojů
      console.log(`🔍 Mapuji Supabase data pro ${supabaseProduct.product_code}:`);
      console.log(`   📝 Raw název: "${supabaseProduct.name}"`);
      console.log(`   💰 Raw cena: ${supabaseProduct.price} (type: ${typeof supabaseProduct.price})`);
      console.log(`   💱 Raw měna: "${supabaseProduct.currency}"`);
      console.log(`   🔗 Raw URL: "${supabaseProduct.product_url}"`);
      console.log(`   🖼️ Raw obrázek: "${supabaseProduct.image_url}"`);
      console.log(`   🏷️ Raw kategorie: "${supabaseProduct.category}"`);
      
      // Důkladné ošetření hodnot z databáze
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
      
      const cleanedCategory = supabaseProduct.category && supabaseProduct.category.trim() !== ''
        ? supabaseProduct.category.trim()
        : 'Nezařazeno';
      
      const combinedProduct: HybridProductRecommendation = {
        id: index + 1,
        product_code: supabaseProduct.product_code,
        product_name: cleanedProductName,
        description: webhookProduct.recommendation, // Použij doporučení z webhooku jako popis
        category: cleanedCategory,
        price: cleanedPrice,
        currency: cleanedCurrency,
        product_url: cleanedProductUrl,
        image_url: cleanedImageUrl,
        similarity_score: 0.9, // Vysoká relevance, protože přišlo z AI doporučení
        webhook_recommendation: webhookProduct.recommendation
      };
      
      combinedProducts.push(combinedProduct);
      
      console.log(`✅ Finální kombinovaný produkt:`);
      console.log(`   📝 Název: "${combinedProduct.product_name}"`);
      console.log(`   💰 Cena: ${combinedProduct.price} ${combinedProduct.currency}`);
      console.log(`   🔗 URL: ${combinedProduct.product_url || 'CHYBÍ'}`);
      console.log(`   🖼️ Obrázek: ${combinedProduct.image_url || 'CHYBÍ'}`);
      console.log(`   🏷️ Kategorie: ${combinedProduct.category}`);
      
      // Varování pro chybějící kritická data
      if (!combinedProduct.price) {
        console.warn(`⚠️ CHYBÍ CENA pro produkt ${supabaseProduct.product_code}`);
      }
      if (!combinedProduct.product_url) {
        console.warn(`⚠️ CHYBÍ URL pro produkt ${supabaseProduct.product_code}`);
      }
      if (!combinedProduct.image_url) {
        console.warn(`⚠️ CHYBÍ OBRÁZEK pro produkt ${supabaseProduct.product_code}`);
      }
    } else {
      // ⚠️ FALLBACK - produkt nebyl nalezen v Supabase
      console.warn(`⚠️ Produkt ${webhookProduct.id} nebyl nalezen v Supabase - používám fallback`);
      
      // Vytvořme fallback s omezenými informacemi ale s AI doporučením
      const fallbackProduct: HybridProductRecommendation = {
        id: index + 1,
        product_code: webhookProduct.id,
        product_name: `BEWIT Produkt ${webhookProduct.id}`, // Přidáme brand pro profesionálnost
        description: webhookProduct.recommendation,
        category: 'Tradiční čínská medicína', // Default kategorie na základě kontextu
        price: null, // Cena není dostupná
        currency: 'CZK',
        product_url: `https://bewit.love/produkt/${webhookProduct.id}`, // Pokus o guess URL
        image_url: null, // Obrázek není dostupný
        similarity_score: 0.7, // Nižší skóre kvůli chybějícím datům
        webhook_recommendation: webhookProduct.recommendation
      };
      
      combinedProducts.push(fallbackProduct);
      console.log(`🔄 Fallback produkt vytvořen pro ID: ${webhookProduct.id}`);
    }
  });
  
  console.log(`\n🎯 KOMBINOVÁNÍ DOKONČENO:`);
  console.log(`   - Celkem zpracováno: ${webhookProducts.length} webhook produktů`);
  console.log(`   - Nalezeno v Supabase: ${supabaseProducts.length} produktů`);
  console.log(`   - Úspěšně kombinováno: ${combinedProducts.filter(p => p.price !== null).length} produktů`);
  console.log(`   - Fallback produkty: ${combinedProducts.filter(p => p.price === null).length} produktů`);
  console.log(`   - Finální počet: ${combinedProducts.length} produktů`);
  
  return combinedProducts;
}

/**
 * Hlavní funkce pro získání hybridních doporučení produktů
 */
export async function getHybridProductRecommendations(
  userMessage: string,
  sessionId?: string
): Promise<HybridProductRecommendation[]> {
  console.log(`🚀 SPOUŠTÍM HYBRIDNÍ VYHLEDÁVÁNÍ PRODUKTŮ`);
  console.log(`📝 Dotaz: "${userMessage}"`);
  console.log(`🔑 Session ID: ${sessionId || 'Neposkytnut'}`);
  
  try {
    // === KROK 1: Získej doporučení z webhooku ===
    console.log(`\n📡 KROK 1: Získávám doporučení z webhooku...`);
    
    const webhookProducts = await getProductRecommendationsFromWebhook(userMessage, sessionId);
    
    if (webhookProducts.length === 0) {
      console.warn('📭 WEBHOOK NEVRÁTIL ŽÁDNÁ DOPORUČENÍ');
      console.warn('💡 Možné příčiny:');
      console.warn('   - AI nenašla vhodné produkty');
      console.warn('   - Webhook parsing selhal');
      console.warn('   - Prázdná odpověď z N8N');
      return [];
    }
    
    console.log(`✅ Webhook vrátil ${webhookProducts.length} doporučení`);
    webhookProducts.forEach((wp, i) => {
      console.log(`   ${i + 1}. ID: ${wp.id}, Doporučení: ${wp.recommendation.substring(0, 100)}...`);
    });
    
    // === KROK 2: Získej data produktů ze Supabase ===
    console.log(`\n🗄️ KROK 2: Vyhledávám produkty v Supabase...`);
    
    const productIds = webhookProducts.map(wp => wp.id);
    console.log(`🔍 Hledaná ID:`, productIds);
    
    let supabaseProducts: SupabaseProduct[] = [];
    let supabaseError = null;
    
    try {
      supabaseProducts = await getProductsFromSupabase(productIds);
    } catch (error) {
      console.error('❌ Supabase vyhledávání selhalo:', error);
      supabaseError = error;
      
      // Pokračujeme s prázdným seznamem (fallback mode)
      console.log('🔄 Pokračuji v fallback módu bez Supabase dat');
    }
    
    if (supabaseProducts.length > 0) {
      console.log(`✅ Supabase vrátil ${supabaseProducts.length} produktů`);
      supabaseProducts.forEach((sp, i) => {
        console.log(`   ${i + 1}. ${sp.product_code}: ${sp.name} (${sp.price} ${sp.currency})`);
      });
    } else {
      console.warn('⚠️ Žádné produkty nenalezeny v Supabase');
      if (supabaseError) {
        console.warn('🔧 Důvod: Supabase chyba -', supabaseError.message);
      } else {
        console.warn('🔧 Důvod: Produkty s těmito ID neexistují v databázi');
      }
    }
    
    // === KROK 3: Zkombinuj data ===
    console.log(`\n🔗 KROK 3: Kombinuji webhook a Supabase data...`);
    
    const hybridProducts = combineWebhookWithSupabaseData(webhookProducts, supabaseProducts);
    
    if (hybridProducts.length > 0) {
      console.log(`\n✅ HYBRIDNÍ VYHLEDÁVÁNÍ ÚSPĚŠNĚ DOKONČENO!`);
      console.log(`🎯 Vráceno ${hybridProducts.length} produktů:`);
      
      hybridProducts.forEach((hp, i) => {
        const status = hp.price !== null ? '✅ Kompletní' : '⚠️ Fallback';
        console.log(`   ${i + 1}. ${status} - ${hp.product_name} (${hp.product_code})`);
      });
      
      // Pokud máme chybu Supabase ale stále vracíme produkty, upozorni na to
      if (supabaseError) {
        console.warn(`\n⚠️ UPOZORNĚNÍ: Produkty jsou vráceny v fallback módu kvůli Supabase chybě`);
        console.warn(`🔧 Chyba Supabase: ${supabaseError.message}`);
        console.warn(`💡 Produkty budou mít omezené informace (bez cen, obrázků, atd.)`);
      }
    } else {
      console.error(`\n❌ HYBRIDNÍ VYHLEDÁVÁNÍ SELHALO`);
      console.error(`🔧 Žádné produkty nebyly vytvořeny navzdory webhook datům`);
    }
    
    return hybridProducts;
    
  } catch (error) {
    console.error(`\n❌ KRITICKÁ CHYBA V HYBRIDNÍM VYHLEDÁVÁNÍ:`, error);
    console.error(`🔧 Error message:`, error instanceof Error ? error.message : 'Neznámá chyba');
    console.error(`🔧 Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
    
    // Rozhodnutí jestli propagovat chybu nebo vrátit prázdný seznam
    if (error instanceof Error && error.message.includes('webhook')) {
      console.error(`🚨 Webhook je kritický - propaguju chybu`);
      throw error;
    } else {
      console.warn(`🔄 Vracím prázdný seznam kvůli non-kritické chybě`);
      return [];
    }
  }
}

/**
 * Test funkce pro hybridní vyhledávání
 */
export async function testHybridProductSearch(testMessage: string = 'Doporuč mi něco na bolesti kloubů') {
  console.log(`🧪 Testuji hybridní vyhledávání se zprávou: "${testMessage}"`);
  
  try {
    const results = await getHybridProductRecommendations(testMessage);
    
    console.log(`📊 Test výsledky (${results.length} produktů):`);
    results.forEach((product, index) => {
      console.log(`${index + 1}. ${product.product_name}`);
      console.log(`   ID: ${product.product_code}`);
      console.log(`   Cena: ${product.price ? `${product.price} ${product.currency}` : 'Neuvedena'}`);
      console.log(`   Doporučení: ${product.webhook_recommendation.substring(0, 100)}...`);
      console.log(`   URL: ${product.product_url || 'Neuvedena'}`);
      console.log('---');
    });
    
    return results;
    
  } catch (error) {
    console.error('❌ Test hybridního vyhledávání selhal:', error);
    return [];
  }
}
