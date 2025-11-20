/**
 * Hybrid Product Service - Zástupná implementace
 * Tato služba kombinuje různé zdroje pro doporučení produktů
 */

export interface HybridProductRecommendation {
  id: string;
  title: string;
  author?: string;
  description?: string;
  score: number;
  source: string;
  coverImageUrl?: string;
  publicationYear?: number;
}

export async function getHybridProductRecommendations(
  query: string,
  limit: number = 10
): Promise<HybridProductRecommendation[]> {
  console.warn('⚠️ Hybrid product recommendations není implementován');
  return [];
}

export async function getRecommendationsFromMultipleSources(
  query: string,
  sources: string[]
): Promise<HybridProductRecommendation[]> {
  console.warn('⚠️ Hybrid recommendations from multiple sources není implementován');
  return [];
}


