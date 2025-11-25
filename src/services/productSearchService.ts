/**
 * Product Search Service - Zástupná implementace
 * Tato služba poskytuje základní rozhraní pro vyhledávání produktů
 */

export interface ProductRecommendation {
  id: string;
  title: string;
  author?: string;
  description?: string;
  coverImageUrl?: string;
  publicationYear?: number;
  score?: number;
}

export async function searchProducts(query: string, limit: number = 10): Promise<ProductRecommendation[]> {
  console.warn('⚠️ Product search není implementován');
  return [];
}

export async function getProductById(id: string): Promise<ProductRecommendation | null> {
  console.warn('⚠️ Get product by ID není implementován');
  return null;
}

export async function getRelatedProducts(productId: string, limit: number = 5): Promise<ProductRecommendation[]> {
  console.warn('⚠️ Related products není implementován');
  return [];
}




