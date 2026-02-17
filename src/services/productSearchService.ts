/**
 * Product Search Service - Zástupná implementace
 * Tato služba poskytuje základní rozhraní pro vyhledávání produktů
 */

/**
 * Product Recommendation Interface
 * Reprezentuje produktové doporučení z BEWIT katalogu
 */
export interface ProductRecommendation {
  product_code: string;
  product_name: string;
  description?: string;
  product_url?: string;
  image_url?: string;
  price?: number | null;
  currency?: string;
  category?: string;
  similarity?: number;
}

export async function searchProducts(query: string, limit: number = 10): Promise<ProductRecommendation[]> {
  return [];
}

export async function getProductById(id: string): Promise<ProductRecommendation | null> {
  return null;
}

export async function getRelatedProducts(productId: string, limit: number = 5): Promise<ProductRecommendation[]> {
  return [];
}




