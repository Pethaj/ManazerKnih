/**
 * Webhook Product Service - Zástupná implementace
 * Tato služba poskytuje základní rozhraní pro komunikaci s webhook produktovou službou
 */

export interface WebhookProduct {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  price?: number;
}

export async function requestProductRecommendations(query: string): Promise<WebhookProduct[]> {
  console.warn('⚠️ Webhook product recommendations není implementován');
  return [];
}

export function convertWebhookProductsToCarousel(products: WebhookProduct[]): any[] {
  return products.map(product => ({
    id: product.id,
    title: product.name,
    description: product.description || '',
    coverImageUrl: product.imageUrl || '',
    author: '',
    publicationYear: null
  }));
}




