/**
 * Embedding Service - Zástupná implementace
 * Tato služba generuje embeddingy pro vektorové vyhledávání
 */

export async function generateEmbedding(text: string): Promise<number[]> {
  console.warn('⚠️ Embedding service není implementován, vrací se prázdný vektor');
  // Vrací prázdný vektor nebo mock vektor
  return new Array(1536).fill(0); // OpenAI embedding rozměr je 1536
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  console.warn('⚠️ Embedding service není implementován, vrací se prázdné vektory');
  return texts.map(() => new Array(1536).fill(0));
}

export async function generateEmbeddingWithRetry(
  text: string,
  maxRetries: number = 3
): Promise<number[]> {
  console.warn('⚠️ Embedding service není implementován, vrací se prázdný vektor');
  return new Array(1536).fill(0);
}




