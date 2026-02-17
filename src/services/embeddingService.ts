/**
 * Embedding Service - Zástupná implementace
 * Tato služba generuje embeddingy pro vektorové vyhledávání
 */

export async function generateEmbedding(text: string): Promise<number[]> {
  // Vrací prázdný vektor nebo mock vektor
  return new Array(1536).fill(0); // OpenAI embedding rozměr je 1536
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  return texts.map(() => new Array(1536).fill(0));
}

export async function generateEmbeddingWithRetry(
  text: string,
  maxRetries: number = 3
): Promise<number[]> {
  return new Array(1536).fill(0);
}




