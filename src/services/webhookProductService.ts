/**
 * Webhook Product Service
 * Služba pro komunikaci s N8N webhook pro doporučení produktů
 */

export interface WebhookProductRequest {
  chatInput: string;
  session_id?: string;
  user_context?: string;
  timestamp: string;
}

export interface WebhookProductResponse {
  success?: boolean;
  message?: string;
  output?: string; // Textový výstup s markdown produkty
  recommended_products?: Array<{
    id: number;
    product_code: string;
    name: string;
    description?: string;
    category?: string;
    price?: number;
    currency?: string;
    product_url?: string;
    image_url?: string;
    relevance_score?: number;
  }>;
  error?: string;
  total_count?: number;
  processing_time?: string;
  // Debug informace
  raw_webhook_response?: any;
  parsed_from_markdown?: boolean;
}

/**
 * Odešle uživatelskou zprávu na N8N webhook pro doporučení produktů
 */
export async function requestProductRecommendations(
  userMessage: string,
  sessionId?: string,
  userContext?: string
): Promise<WebhookProductResponse> {
  const webhookUrl = 'https://n8n.srv980546.hstgr.cloud/webhook/cd6b668b-1e35-4018-9bf4-28d0926b023b';
  
  console.log(`📤 Odesílám požadavek na doporučení produktů pro zprávu: "${userMessage}"`);

  try {
    // Připrav data pro webhook
    const requestData: WebhookProductRequest = {
      chatInput: userMessage,
      session_id: sessionId || `session_${Date.now()}`,
      user_context: userContext || '',
      timestamp: new Date().toISOString()
    };

    console.log('📋 Request data:', requestData);

    // Odešli požadavek na webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    console.log('📡 Webhook response status:', response.status);

    if (!response.ok) {
      console.error(`❌ Chyba HTTP: ${response.status} ${response.statusText}`);
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }

    // Zpracuj odpověď
    let responseData: WebhookProductResponse;
    try {
      responseData = await response.json();
      console.log('📥 Webhook response data:', responseData);
    } catch (parseError) {
      console.error('❌ Chyba při parsování JSON odpovědi:', parseError);
      return {
        success: false,
        error: 'Neplatná JSON odpověď z webhoku'
      };
    }

    // Ulož raw odpověď pro debug
    const originalResponseData = JSON.parse(JSON.stringify(responseData));

    // Zpracuj odpověď - webhook může vracet buď strukturované produkty nebo markdown text
    if (Array.isArray(responseData) && responseData.length > 0 && responseData[0].output) {
      // Formát z příkladu: [{ "output": "markdown text..." }]
      const markdownOutput = responseData[0].output;
      console.log('📝 Webhook vrátil markdown output, parsuju produkty...');
      
      const parsedProducts = parseMarkdownProducts(markdownOutput);
      responseData = {
        success: true,
        message: 'Produkty naparsovány z markdown výstupu',
        recommended_products: parsedProducts,
        total_count: parsedProducts.length,
        raw_webhook_response: originalResponseData,
        parsed_from_markdown: true
      };
    } else {
      // Původní formát se strukturovanými produkty
      if (typeof responseData.success !== 'boolean') {
        console.warn('⚠️ Odpověď neobsahuje pole success, předpokládám úspěch');
        responseData.success = true;
      }

      if (responseData.success && responseData.recommended_products) {
        console.log(`✅ Webhook vrátil ${responseData.recommended_products.length} strukturovaných produktů`);
        
        // Validuj a normalizuj produktová data
        responseData.recommended_products = responseData.recommended_products
          .filter(product => product && product.id && product.name)
          .map(product => ({
            ...product,
            currency: product.currency || 'CZK',
            relevance_score: product.relevance_score || 0.5
          }));
      }
    }

    return responseData;

  } catch (error) {
    console.error('❌ Chyba při komunikaci s webhook:', error);
    return {
      success: false,
      error: `Chyba komunikace: ${error instanceof Error ? error.message : 'Neznámá chyba'}`
    };
  }
}

/**
 * Parsuje markdown output z webhook a extrahuje produktové informace
 */
function parseMarkdownProducts(markdownText: string): Array<{
  product_code: string;
  product_name: string;
  description: string | null;
  category: string | null;
  price: number | null;
  currency: string;
  product_url: string | null;
  image_url: string | null;
  similarity_score?: number;
}> {
  if (!markdownText) return [];
  
  const products: Array<{
    product_code: string;
    product_name: string;
    description: string | null;
    category: string | null;
    price: number | null;
    currency: string;
    product_url: string | null;
    image_url: string | null;
    similarity_score?: number;
  }> = [];

  // Najdi všechny produkty pomocí regex (číslované 1., 2., atd.)
  const productMatches = markdownText.match(/\d+\.\s*\*\*[^]*?(?=\n\n\d+\.\s*\*\*|\n\n(?:Pokud|Tyto produkty)|$)/g);
  const productSections = productMatches || [];
  
  productSections.forEach((section, index) => {
    try {
      // Extrahuj název produktu (za číslicí a ** až do dalších **)
      const nameMatch = section.match(/^\d+\.\s*\*\*([^*]+)\*\*/);
      const productName = nameMatch ? nameMatch[1].trim() : `Produkt ${index + 1}`;
      
      // Extrahuj popis - zkus různé formáty
      let description = null;
      // Formát 1: "**Popis**:" nebo "**Popis:**" 
      let descMatch = section.match(/\*\*Popis:?\*?\*?\s*([^*\n-]+?)(?=\s*[-\n]\s*\*\*|$)/);
      if (descMatch) {
        description = descMatch[1].trim();
      } else {
        // Formát 2: "- Popis:" (nový formát)
        descMatch = section.match(/[-\s]*Popis:\s*([^\n-]+?)(?=\s*[-\n]|$)/);
        if (descMatch) {
          description = descMatch[1].trim();
        }
      }
      
      // Extrahuj cenu - zkus různé formáty  
      let price = null;
      // Formát 1: "**Cena**:" nebo "**Cena:**"
      let priceMatch = section.match(/\*\*Cena:?\*?\*?\s*(\d+)\s*(CZK|Kč)/i);
      if (priceMatch) {
        price = parseInt(priceMatch[1]);
      } else {
        // Formát 2: "- Cena:" (nový formát)
        priceMatch = section.match(/[-\s]*Cena:\s*(\d+)\s*(CZK|Kč)/i);
        if (priceMatch) {
          price = parseInt(priceMatch[1]);
        }
      }
      const currency = priceMatch ? 'CZK' : 'CZK';
      
      // Extrahuj URL
      const urlMatch = section.match(/\[([^\]]+)\]\(([^)]+)\)/);
      const productUrl = urlMatch ? urlMatch[2] : null;
      
      // Extrahuj obrázek
      const imageMatch = section.match(/!\[([^\]]*)\]\(([^)]+)\)/);
      const imageUrl = imageMatch ? imageMatch[2] : null;
      
      // Vygeneruj product_code z URL nebo názvu
      let productCode = '';
      if (productUrl) {
        const urlParts = productUrl.split('/');
        const productSlug = urlParts[urlParts.length - 1].split('?')[0];
        productCode = productSlug.replace('bewit-', '').replace(/-/g, '_');
      } else {
        productCode = productName.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 20);
      }
      
      products.push({
        product_code: productCode,
        product_name: productName,
        description: description,
        category: 'Tradiční čínská medicína', // Default kategorie na základě příkladu
        price: price,
        currency: currency,
        product_url: productUrl,
        image_url: imageUrl,
        similarity_score: 0.8 // Mock similarity
      });
      
    } catch (error) {
      console.warn(`⚠️ Chyba při parsování produktu ${index + 1}:`, error);
    }
  });
  
  console.log(`📦 Naparsováno ${products.length} produktů z markdown textu`);
  return products;
}

/**
 * Konvertuje webhook produkty na formát používaný v ProductCarousel
 */
export function convertWebhookProductsToCarousel(webhookProducts: WebhookProductResponse['recommended_products']): Array<{
  product_code: string;
  product_name: string;
  description: string | null;
  category: string | null;
  price: number | null;
  currency: string;
  product_url: string | null;
  image_url: string | null;
  similarity_score?: number;
}> {
  if (!webhookProducts || !Array.isArray(webhookProducts)) {
    return [];
  }

  return webhookProducts.map(product => {
    // Pokud už je produkt v správném formátu (z parseMarkdownProducts)
    if (product.product_name && product.product_code) {
      return {
        product_code: product.product_code,
        product_name: product.product_name,
        description: product.description || null,
        category: product.category || null,
        price: product.price || null,
        currency: product.currency || 'CZK',
        product_url: product.product_url || null,
        image_url: product.image_url || null,
        similarity_score: product.similarity_score || undefined
      };
    }
    
    // Původní formát (strukturovaný)
    return {
      product_code: (product as any).product_code || (product as any).id?.toString() || '',
      product_name: (product as any).name || (product as any).product_name || '',
      description: (product as any).description || null,
      category: (product as any).category || null,
      price: (product as any).price || null,
      currency: (product as any).currency || 'CZK',
      product_url: (product as any).product_url || null,
      image_url: (product as any).image_url || null,
      similarity_score: (product as any).relevance_score || undefined
    };
  });
}

/**
 * Test funkce pro webhook doporučení
 */
export async function testWebhookProductRecommendations(testMessage: string = 'Potřebuji něco na bolesti kloubů') {
  console.log(`🧪 Testuji webhook doporučení produktů se zprávou: "${testMessage}"`);
  console.log(`📤 Posílám jako chatInput: "${testMessage}"`);
  
  const result = await requestProductRecommendations(testMessage, 'test_session', 'test context');
  
  console.log('📊 Výsledek testu:', result);
  
  if (result.success && result.recommended_products) {
    console.log('✅ Test úspěšný - doporučené produkty:');
    result.recommended_products.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name} (${product.price} ${product.currency})`);
      if (product.relevance_score) {
        console.log(`   Relevance: ${(product.relevance_score * 100).toFixed(1)}%`);
      }
    });
  } else {
    console.log('❌ Test neúspěšný nebo žádné doporučení');
    if (result.error) {
      console.log('❌ Chyba:', result.error);
    }
  }
  
  return result;
}
