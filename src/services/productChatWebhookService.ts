/**
 * Product Chat Webhook Service
 * Služba pro komunikaci s N8N webhookem pro produktová doporučení
 * s hyper-personalizovanými texty pro každý produkt
 */

import { supabase } from '../lib/supabase';

// N8N Webhook URL pro Product Chat
const PRODUCT_CHAT_WEBHOOK_URL = 'https://n8n.srv980546.hstgr.cloud/webhook/cd6b668b-1e35-4018-9bf4-28d0926b023b';

// Interface pro produktové doporučení z N8N
export interface ProductRecommendation {
  product_code: string;
  recommendation: string;  // Personalizované doporučení z GPT
}

// Interface pro odpověď z N8N webhooku
export interface N8NWebhookResponse {
  text: string;  // Celková odpověď chatbota
  products: ProductRecommendation[];  // Array produktů s doporučeními
}

// Interface pro obohacený produkt (s metadaty z product_feed_2)
export interface EnrichedProduct {
  product_code: string;
  product_name: string;
  recommendation: string;  // ⭐ Personalizované doporučení z N8N
  description: string;  // Popis z product_feed_2
  url: string;
  image_url: string;
  price: number;
  currency: string;
  availability: number;
}

/**
 * Zavolá N8N webhook pro produktová doporučení
 * 
 * @param query - Dotaz uživatele (např. "wany na bolest nohy")
 * @param sessionId - Session ID pro kontext
 * @returns Response z N8N s textem a produkty
 */
async function callProductChatWebhook(
  query: string,
  sessionId: string
): Promise<N8NWebhookResponse> {
  try {
    console.log('🚀 Volám N8N webhook pro Product Chat...');
    console.log('📝 Dotaz:', query);
    console.log('🔑 Session ID:', sessionId);

    const response = await fetch(PRODUCT_CHAT_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chatInput: query,
        session_id: sessionId,
        timestamp: new Date().toISOString()
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ N8N webhook error:', response.status, errorText);
      throw new Error(`N8N webhook failed: ${response.status} ${response.statusText}`);
    }

    let data = await response.json();
    console.log('✅ N8N webhook raw response:', JSON.stringify(data).substring(0, 200) + '...');

    // N8N vrací data zabalené v array[0].data struktuře
    // Formát: [{ data: [{ "ID produktu": "2737", "Doporuceni": "..." }] }]
    if (Array.isArray(data) && data.length > 0 && data[0].data) {
      console.log('🔧 Rozbaluji N8N response z array[0].data struktury');
      const productsData = data[0].data;
      
      // Konvertuj N8N formát na náš formát
      const products = productsData.map((item: any) => ({
        product_code: item['ID produktu'],
        recommendation: item['Doporuceni']
      }));
      
      data = {
        text: `Našel jsem pro vás ${products.length} doporučených produktů:`,
        products: products
      };
      
      console.log('✅ Konvertováno na standardní formát:', {
        textLength: data.text.length,
        productsCount: data.products.length
      });
    }

    // Validace response
    if (!data.text || !Array.isArray(data.products)) {
      console.error('❌ Invalid N8N response format:', data);
      throw new Error('Invalid response format from N8N webhook');
    }

    console.log('✅ Finální response:', {
      textLength: data.text?.length || 0,
      productsCount: data.products?.length || 0
    });

    return data;
  } catch (error) {
    console.error('❌ Chyba při volání N8N webhooku:', error);
    throw error;
  }
}

/**
 * Obohacení produktů o metadata z product_feed_2
 * 
 * @param recommendations - Produkty s doporučeními z N8N
 * @returns Obohacené produkty s kompletními metadaty
 */
async function enrichProductsWithMetadata(
  recommendations: ProductRecommendation[]
): Promise<EnrichedProduct[]> {
  try {
    console.log('📊 Obohacuji produkty o metadata z product_feed_2...');
    
    if (recommendations.length === 0) {
      console.log('ℹ️ Žádné produkty k obohacení');
      return [];
    }

    const codes = recommendations.map(r => r.product_code);
    console.log('🔍 Hledám metadata pro product_codes:', codes);

    const { data, error } = await supabase
      .from('product_feed_2')
      .select('product_code, product_name, description_short, url, thumbnail, price, currency, availability')
      .in('product_code', codes);

    if (error) {
      console.error('❌ Chyba při načítání metadat z product_feed_2:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.warn('⚠️ Žádná metadata nenalezena pro produkty:', codes);
      // Vrátíme produkty alespoň s doporučeními, i když chybí metadata
      return recommendations.map(rec => ({
        product_code: rec.product_code,
        product_name: 'Produkt ' + rec.product_code,
        recommendation: rec.recommendation,
        description: '',
        url: '',
        image_url: '',
        price: 0,
        currency: 'CZK',
        availability: 0
      }));
    }

    console.log(`✅ Načteno ${data.length} metadat z product_feed_2`);

    // Spojit doporučení z N8N s metadata z product_feed_2
    const enrichedProducts = recommendations.map(rec => {
      const metadata = data.find(d => d.product_code === rec.product_code);
      
      if (!metadata) {
        console.warn(`⚠️ Metadata nenalezena pro produkt ${rec.product_code}`);
      }

      return {
        product_code: rec.product_code,
        product_name: metadata?.product_name || 'Produkt ' + rec.product_code,
        recommendation: rec.recommendation,  // ⭐ Personalizované doporučení z GPT
        description: metadata?.description_short || '',
        url: metadata?.url || '',
        image_url: metadata?.thumbnail || '',
        price: metadata?.price || 0,
        currency: metadata?.currency || 'CZK',
        availability: metadata?.availability || 0
      };
    });

    console.log('✅ Produkty úspěšně obohaceny');
    return enrichedProducts;
  } catch (error) {
    console.error('❌ Chyba při obohacování produktů:', error);
    throw error;
  }
}

/**
 * Hlavní funkce pro získání produktových doporučení
 * Kompletní workflow: N8N webhook → obohacení metadata → vrácení výsledků
 * 
 * @param query - Dotaz uživatele
 * @param sessionId - Session ID pro kontext
 * @returns Objekt s textem odpovědi a obohacenými produkty
 */
export async function getProductRecommendations(
  query: string,
  sessionId: string
): Promise<{
  text: string;
  products: EnrichedProduct[];
}> {
  try {
    console.log('🎯 Zahajuji získávání produktových doporučení');
    console.log('📝 Query:', query);
    console.log('🔑 Session:', sessionId);

    // 1. Zavolat N8N webhook
    const webhookResponse = await callProductChatWebhook(query, sessionId);

    // 2. Obohacení produktů o metadata
    const enrichedProducts = await enrichProductsWithMetadata(webhookResponse.products);

    console.log('🎉 Produktová doporučení úspěšně získána');
    console.log(`📦 Počet produktů: ${enrichedProducts.length}`);

    return {
      text: webhookResponse.text,
      products: enrichedProducts
    };
  } catch (error) {
    console.error('❌ Kritická chyba při získávání produktových doporučení:', error);
    
    // Vrátíme error response místo thrownutí chyby
    return {
      text: '❌ Omlouváme se, došlo k chybě při zpracování vašeho dotazu. Zkuste to prosím znovu.',
      products: []
    };
  }
}

/**
 * Test funkce pro validaci webhooku
 */
export async function testProductChatWebhook(): Promise<boolean> {
  try {
    console.log('🧪 Testuji Product Chat webhook...');
    
    const result = await getProductRecommendations(
      'test dotaz',
      'test-session-' + Date.now()
    );
    
    console.log('✅ Test webhook úspěšný:', {
      hasText: !!result.text,
      productCount: result.products.length
    });
    
    return true;
  } catch (error) {
    console.error('❌ Test webhook selhal:', error);
    return false;
  }
}

