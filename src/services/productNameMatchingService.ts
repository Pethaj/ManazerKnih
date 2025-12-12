/**
 * Product Name Matching Service
 * 
 * Služba pro matching názvů produktů z GPT odpovědi proti product_feed_2
 * Používá dynamicky generovaný pinyin_name z description_short
 * pro fuzzy matching (ignoruje velká/malá písmena, skloňování atd.)
 */

import { supabase } from '../lib/supabase';

// ============================================================================
// INTERFACES
// ============================================================================

export interface MatchedProduct {
  id: number;
  product_code: string;
  product_name: string;
  pinyin_name: string;
  url: string;
  similarity: number; // 0-1, jak moc se shoduje
  matched_from: string; // Původní název z GPT
}

export interface MatchingResult {
  success: boolean;
  matches: MatchedProduct[];
  unmatched: string[]; // Názvy, které se nepodařilo namatchovat
  error?: string;
}

// ============================================================================
// HLAVNÍ FUNKCE
// ============================================================================

/**
 * Najde produkty v product_feed_2 na základě seznamu názvů z GPT
 * 
 * @param productNames - Seznam názvů produktů z GPT (např. ["Te Xiao Bi Min Gan Wan", "Čistý dech"])
 * @returns MatchingResult s namatchovanými produkty
 */
export async function matchProductNames(productNames: string[]): Promise<MatchingResult> {
  if (productNames.length === 0) {
    return {
      success: true,
      matches: [],
      unmatched: []
    };
  }
  
  try {
    // Načteme všechny produkty s pinyin_name z databáze
    const { data: products, error } = await supabase.rpc('get_products_with_pinyin_names');
    
    if (error) {
      console.error('❌ Chyba při načítání produktů z databáze:', error);
      throw new Error(`Database error: ${error.message}`);
    }
    
    if (!products || products.length === 0) {
      return {
        success: true,
        matches: [],
        unmatched: productNames
      };
    }
    
    // Pro každý název z GPT najdeme best match
    const matches: MatchedProduct[] = [];
    const unmatched: string[] = [];
    
    for (const gptName of productNames) {
      const match = findBestMatch(gptName, products);
      
      if (match && match.similarity >= 0.5) { // Threshold pro matching
        matches.push(match);
      } else {
        unmatched.push(gptName);
      }
    }
    
    return {
      success: true,
      matches,
      unmatched
    };
    
  } catch (error) {
    console.error('❌ Kritická chyba při matchingu produktů:', error);
    return {
      success: false,
      matches: [],
      unmatched: productNames,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// ============================================================================
// HELPER FUNKCE
// ============================================================================

/**
 * Najde nejlepší match pro daný název v seznamu produktů
 * Používá fuzzy matching (normalizace, levenshtein distance)
 */
function findBestMatch(
  gptName: string,
  products: any[]
): MatchedProduct | null {
  let bestMatch: MatchedProduct | null = null;
  let bestSimilarity = 0;
  
  const normalizedGptName = normalizeText(gptName);
  
  for (const product of products) {
    // Zkusíme matchovat proti pinyin_name, product_name i description_short
    const candidates = [
      product.pinyin_name,
      product.product_name,
      extractPinyinFromDescription(product.description_short)
    ].filter(Boolean);
    
    for (const candidate of candidates) {
      const similarity = calculateSimilarity(normalizedGptName, normalizeText(candidate));
      
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = {
          id: product.id,
          product_code: product.product_code,
          product_name: product.product_name,
          pinyin_name: product.pinyin_name,
          url: product.url,
          similarity: similarity,
          matched_from: gptName
        };
      }
    }
  }
  
  return bestMatch;
}

/**
 * Normalizuje text pro srovnání (lowercase, trim, odstranění diakritiky)
 */
function normalizeText(text: string): string {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Odstranění diakritiky
    .replace(/[–-]/g, ' ') // Normalizace pomlček
    .replace(/\s+/g, ' ') // Vícenásobné mezery na jednu
    .replace(/[^\w\s]/g, ''); // Odstranění interpunkce
}

/**
 * Extrahuje pinyin název z description_short (pokud začíná **text**)
 */
function extractPinyinFromDescription(descriptionShort: string | null): string | null {
  if (!descriptionShort) return null;
  
  const match = descriptionShort.match(/^\*\*([^*]+)\*\*/);
  if (!match) return null;
  
  // Odstraníme číselný prefix (např. "009 – ")
  const text = match[1].trim().replace(/^[0-9]+\s*[–-]?\s*/, '');
  return text;
}

/**
 * Vypočítá podobnost mezi dvěma řetězci (0 = žádná, 1 = totožné)
 * Kombinuje:
 * 1. Exact substring match
 * 2. Word overlap
 * 3. Levenshtein distance
 */
function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1.0;
  
  // 1. Exact substring match
  if (str1.includes(str2) || str2.includes(str1)) {
    return 0.9;
  }
  
  // 2. Word overlap (kolik slov se shoduje)
  const words1 = str1.split(/\s+/);
  const words2 = str2.split(/\s+/);
  const commonWords = words1.filter(w => words2.includes(w) && w.length > 2);
  const wordOverlap = commonWords.length / Math.max(words1.length, words2.length);
  
  // 3. Levenshtein distance
  const levenshtein = levenshteinDistance(str1, str2);
  const maxLen = Math.max(str1.length, str2.length);
  const levenshteinSimilarity = 1 - (levenshtein / maxLen);
  
  // Kombinovaný score (váha na word overlap a levenshtein)
  return wordOverlap * 0.6 + levenshteinSimilarity * 0.4;
}

/**
 * Levenshtein distance (edit distance) mezi dvěma řetězci
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = [];
  
  for (let i = 0; i <= m; i++) {
    dp[i] = [i];
  }
  
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,    // deletion
          dp[i][j - 1] + 1,    // insertion
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }
  
  return dp[m][n];
}

// ============================================================================
// TEST FUNKCE
// ============================================================================

/**
 * Testovací funkce
 */
export async function testProductMatching(): Promise<void> {
  // Test funkce - lze použít pro debugging
}




