/**
 * Combined Search Service - Zástupná implementace
 * Tato služba kombinuje různé typy vyhledávání
 */

export interface SearchResult {
  id: string;
  title: string;
  score: number;
  source: 'vector' | 'fulltext' | 'hybrid';
}

export async function performCombinedSearch(query: string, limit: number = 10): Promise<SearchResult[]> {
  return [];
}

export async function searchWithFilters(
  query: string,
  filters: Record<string, any>,
  limit: number = 10
): Promise<SearchResult[]> {
  return [];
}




