/**
 * Product Button Recommendation Service
 * Služba pro produktová doporučení na tlačítko
 * Tlačítko se zobrazí na konci odpovědi chatbota a po kliknutí zavolá N8N
 * s kontextem konverzace (poslední dotaz usera + aktuální odpověď chatbota)
 */

import { supabase } from '../lib/supabase';

// N8N Webhook URL pro Button Recommendations
// DOČASNĚ používáme stejný webhook jako Product Chat
// TODO: Vytvořit samostatný N8N workflow s CORS povoleným nebo použít Supabase Edge Function jako proxy
const BUTTON_RECOMMENDATIONS_WEBHOOK_URL = 'https://n8n.srv980546.hstgr.cloud/webhook/cd6b668b-1e35-4018-9bf4-28d0926b023b';

// Interface pro kontext konverzace
export interface ConversationContext {
  userQuery: string;        // Poslední dotaz od uživatele
  botResponse: string;      // Aktuální odpověď chatbota
  sessionId: string;        // Session ID pro kontext
}

// Interface pro produktové doporučení z N8N
export interface ProductRecommendation {
  product_code: string;
  recommendation: string;  // Personalizované doporučení z GPT
}

// Interface pro odpověď z N8N webhooku
export interface N8NButtonRecommendationResponse {
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
 * Zavolá N8N webhook pro produktová doporučení na tlačítko
 * 
 * @param context - Kontext konverzace (user query + bot response)
 * @returns Response z N8N s textem a produkty
 */
async function callButtonRecommendationsWebhook(
  context: ConversationContext
): Promise<N8NButtonRecommendationResponse> {
  try {
    console.log('🚀 Volám N8N webhook pro Button Recommendations...');
    console.log('📝 User Query:', context.userQuery);
    console.log('🤖 Bot Response:', context.botResponse.substring(0, 100) + '...');
    console.log('🔑 Session ID:', context.sessionId);

    // Kombinujeme user query a bot response do jednoho chat inputu
    // protože používáme Product Chat webhook
    const combinedInput = `Na základě této konverzace doporuč produkty:
Uživatel: ${context.userQuery}
Chatbot: ${context.botResponse}`;

    console.log('📦 Kombinovaný input pro webhook:', combinedInput.substring(0, 150) + '...');

    const response = await fetch(BUTTON_RECOMMENDATIONS_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chatInput: combinedInput,  // Product Chat webhook očekává 'chatInput'
        session_id: context.sessionId,
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

    // N8N může vracet data v několika formátech (stejně jako u Product Chat):
    // 1. [{ data: [...] }] - pole s objektem
    // 2. { data: [...] } - přímo objekt
    // 3. { text: "...", products: [...] } - standardní formát
    
    let productsData = null;
    
    // Varianta 1: Array s data property
    if (Array.isArray(data) && data.length > 0 && data[0].data) {
      console.log('🔧 Rozbaluji N8N response z array[0].data struktury');
      productsData = data[0].data;
    }
    // Varianta 2: Objekt s data property
    else if (data.data && Array.isArray(data.data)) {
      console.log('🔧 Rozbaluji N8N response z object.data struktury');
      productsData = data.data;
    }
    // Varianta 3: Už má standardní formát
    else if (data.text && Array.isArray(data.products)) {
      console.log('✅ N8N response je už ve standardním formátu');
      return data;
    }
    
    // Pokud máme productsData, konvertujeme na standardní formát
    if (productsData && Array.isArray(productsData)) {
      console.log(`🔧 Konvertuji ${productsData.length} produktů na standardní formát`);
      
      const products = productsData.map((item: any) => ({
        product_code: item['ID produktu'] || item.product_code,
        recommendation: item['Doporuceni'] || item.recommendation
      }));
      
      data = {
        text: `Na základě konverzace jsem pro vás vybral ${products.length} produktů:`,
        products: products
      };
      
      console.log('✅ Konvertováno na standardní formát:', {
        textLength: data.text.length,
        productsCount: data.products.length
      });
    }

    // Validace finálního formátu
    if (!data.text || !Array.isArray(data.products)) {
      console.error('❌ Invalid N8N response format po konverzi:', JSON.stringify(data, null, 2));
      throw new Error('Invalid response format from N8N webhook - nelze konvertovat na standardní formát');
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
 * Hlavní funkce pro získání produktových doporučení na tlačítko
 * Kompletní workflow: N8N webhook → obohacení metadata → vrácení výsledků
 * 
 * @param context - Kontext konverzace (user query + bot response)
 * @returns Objekt s textem odpovědi a obohacenými produkty
 */
export async function getButtonProductRecommendations(
  context: ConversationContext
): Promise<{
  text: string;
  products: EnrichedProduct[];
}> {
  try {
    console.log('🎯 Zahajuji získávání produktových doporučení na tlačítko');
    console.log('📝 User Query:', context.userQuery);
    console.log('🤖 Bot Response:', context.botResponse.substring(0, 100) + '...');
    console.log('🔑 Session:', context.sessionId);

    // 1. Zavolat N8N webhook
    const webhookResponse = await callButtonRecommendationsWebhook(context);

    // 2. Obohacení produktů o metadata
    const enrichedProducts = await enrichProductsWithMetadata(webhookResponse.products);

    console.log('🎉 Produktová doporučení na tlačítko úspěšně získána');
    console.log(`📦 Počet produktů: ${enrichedProducts.length}`);

    return {
      text: webhookResponse.text,
      products: enrichedProducts
    };
  } catch (error) {
    console.error('❌ Kritická chyba při získávání produktových doporučení na tlačítko:', error);
    
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
export async function testButtonRecommendationsWebhook(): Promise<boolean> {
  try {
    console.log('🧪 Testuji Button Recommendations webhook...');
    
    const result = await getButtonProductRecommendations({
      userQuery: 'test dotaz uživatele',
      botResponse: 'test odpověď chatbota',
      sessionId: 'test-session-' + Date.now()
    });
    
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

