/**
 * N8N Product Embedding Service
 * Služba pro volání n8n webhooků pro generování embeddings produktů
 */

const N8N_WEBHOOK_URL = "https://n8n.srv980546.hstgr.cloud/webhook/3890ccdd-d09f-461b-b409-660d477023a3";

export interface N8nProductPayload {
  product_code: string;
  product_name: string;
  description_short: string;
  description_long: string;
  feed_source: 'feed_1' | 'feed_2';
  category?: string;
  price?: number;
  url?: string;
}

export interface N8nWebhookResponse {
  success: boolean;
  message?: string;
  embedding_created?: boolean;
}

/**
 * Odešle produkt na n8n webhook pro vytvoření embeddings
 */
export async function sendProductToN8n(payload: N8nProductPayload): Promise<N8nWebhookResponse> {
  try {

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    return {
      success: true,
      message: 'Embedding úspěšně vytvořen',
      embedding_created: true,
      ...result
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Neznámá chyba',
      embedding_created: false
    };
  }
}

/**
 * Odešle více produktů najednou (batch)
 * Volá webhook postupně s malými pauzami mezi požadavky
 */
export async function sendProductsBatchToN8n(
  products: N8nProductPayload[],
  delayMs: number = 100
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;


  for (const product of products) {
    const result = await sendProductToN8n(product);
    
    if (result.success) {
      sent++;
    } else {
      failed++;
    }

    // Malá pauza mezi požadavky, aby nedošlo k přetížení
    if (delayMs > 0 && products.indexOf(product) < products.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }


  return { sent, failed };
}

/**
 * Vytvoří payload pro Feed 2 produkt
 */
export function createFeed2Payload(product: {
  product_code: string;
  product_name: string;
  description_short?: string | null;
  description_long?: string | null;
  category?: string | null;
  price?: number | null;
  url?: string | null;
}): N8nProductPayload {
  return {
    product_code: product.product_code,
    product_name: product.product_name,
    description_short: product.description_short || '',
    description_long: product.description_long || '',
    feed_source: 'feed_2',
    category: product.category || undefined,
    price: product.price || undefined,
    url: product.url || undefined,
  };
}

/**
 * Testovací funkce - odešle testovací produkt
 */
export async function testN8nWebhook(): Promise<boolean> {
  const testPayload: N8nProductPayload = {
    product_code: 'TEST-001',
    product_name: 'Testovací produkt',
    description_short: 'Krátký testovací popis produktu',
    description_long: 'Dlouhý testovací popis produktu s více informacemi',
    feed_source: 'feed_2',
    category: 'Test kategorie',
    price: 100,
    url: 'https://test.com/product'
  };

  const result = await sendProductToN8n(testPayload);
  return result.success;
}





