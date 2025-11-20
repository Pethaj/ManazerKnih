/**
 * Test Vector Search Service - Zástupná implementace
 * Tato služba poskytuje základní rozhraní pro testování vektorového vyhledávání
 */

export async function runCompleteVectorTest(query: string): Promise<any> {
  console.warn('⚠️ Complete vector test není implementován');
  return {
    success: false,
    message: 'Služba není k dispozici',
    results: []
  };
}

export async function testVectorSearch(query: string, limit: number = 10): Promise<any[]> {
  console.warn('⚠️ Test vector search není implementován');
  return [];
}


