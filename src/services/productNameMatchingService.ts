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
  category?: string; // 🆕 Kategorie produktu z product_feed_2
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
// DB LOAD HELPERS
// ============================================================================

/**
 * Supabase/PostgREST má serverový cap `max-rows` (typicky 1000).
 * `.limit(5000)` nestačí, protože server i tak vrátí max 1000 řádků.
 * Řešení: stránkování přes `.range()` po 1000.
 */
async function fetchAllProductsWithPinyinNames(): Promise<any[]> {
  const PAGE_SIZE = 1000;
  const all: any[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const to = from + PAGE_SIZE - 1;

    // Pozn.: typy supabase-js pro rpc() někdy nepropagují range(), proto cast na any.
    const query = (supabase.rpc('get_products_with_pinyin_names') as any).range(from, to);
    const { data, error } = await query;

    if (error) {
      console.error('❌ Matching ERROR:', error.message);
      throw new Error(`Database error: ${error.message}`);
    }

    const page = (data ?? []) as any[];
    all.push(...page);

    if (page.length < PAGE_SIZE) {
      break;
    }
  }

  return all;
}

// ============================================================================
// HLAVNÍ FUNKCE
// ============================================================================

/**
 * Najde produkty v product_feed_2 na základě seznamu názvů z GPT
 * 
 * @param productNames - Seznam názvů produktů z GPT (např. ["Te Xiao Bi Min Gan Wan", "Čistý dech"])
 * @param allowedCategories - 🆕 Volitelný seznam povolených kategorií (např. ["PRAWTEIN® – superpotravinové směsi", "TČM - Tradiční čínská medicína"])
 * @returns MatchingResult s namatchovanými produkty
 */
export async function matchProductNames(
  productNames: string[], 
  allowedCategories?: string[]
): Promise<MatchingResult> {
  // 🔢 VERZE KONTROLA - Aktuální verze: 3.2 (RPC pagination fix)
  console.log('🔢 MATCHING SERVICE VERSION: 3.2 (2026-02-17 - RPC pagination fix: load >1000 rows)');
  
  if (productNames.length === 0) {
    return {
      success: true,
      matches: [],
      unmatched: []
    };
  }
  
  try {
    // Načteme všechny produkty s pinyin_name z databáze.
    // 🔧 DŮLEŽITÉ: serverový cap max-rows (1000) → musíme stránkovat.
    const allProducts = await fetchAllProductsWithPinyinNames();

    if (allProducts.length === 0) {
      return {
        success: true,
        matches: [],
        unmatched: productNames
      };
    }
    
    console.log(`✅ Načteno ${allProducts.length} produktů z databáze`);
    
    // 🆕 FILTROVÁNÍ PODLE POVOLENÝCH KATEGORIÍ - PŘED MATCHINGEM!
    let products = allProducts;
    
    if (allowedCategories && allowedCategories.length > 0) {
      console.log(`🔍 Filtrování produktů podle ${allowedCategories.length} povolených kategorií:`, allowedCategories);
      
      products = allProducts.filter(product => {
        const productCategory = product.category?.toLowerCase().trim() || '';
        
        const isAllowed = allowedCategories.some(allowedCat => {
          const normalizedAllowed = allowedCat.toLowerCase().trim();
          return productCategory.includes(normalizedAllowed) || normalizedAllowed.includes(productCategory);
        });
        
        return isAllowed;
      });
      
      console.log(`✅ Po filtraci kategorií: ${products.length} z ${allProducts.length} produktů`);
      console.log(`   📊 Kategorie zahrnuty: ${allowedCategories.join(', ')}`);
    } else {
      console.log(`ℹ️ Žádné kategorie nejsou nastaveny - načteny všechny produkty`);
    }
    
    // Pro každý název z GPT najdeme best match
    const matches: MatchedProduct[] = [];
    const unmatched: string[] = [];
    
    for (const gptName of productNames) {
      const match = findBestMatch(gptName, products);
      
      const categoryEmoji = match ? getCategoryEmoji(match.category) : '';
      
      console.log(`🔍 "${gptName}" → ${match ? `✅ ${match.product_name} (${match.similarity.toFixed(2)}) ${categoryEmoji}` : '❌ NOT FOUND'}`);
      
      if (match && match.similarity >= 0.5) {
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
    console.error('❌ MATCHING CRITICAL ERROR:', error);
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
 * 
 * NOVÝ PŘÍSTUP (v3.0):
 * 1. DETEKCE kategorie z GPT názvu (wan, směs EO, prawteiny, atd.)
 * 2. FILTROVÁNÍ produktů podle kategorie
 * 3. MATCHING pouze v rámci té kategorie
 * 
 * Každá kategorie má své pravidla:
 * - Wany: dlouhý pinyin název nebo číselný kód
 * - Směsi EO: krátký název (2-6 znaků) + "esenciální olej"
 * - Prawteiny: název + "prawteiny"
 * - Ostatní: standardní matching
 */
function findBestMatch(
  gptName: string,
  products: any[]
): MatchedProduct | null {
  
  // 1️⃣ DETEKCE KATEGORIE z GPT názvu
  const detectedCategory = detectProductCategory(gptName);
  
  console.log(`  🎯 Detekovaná kategorie pro "${gptName}": ${detectedCategory}`);
  
  // 2️⃣ FILTROVÁNÍ produktů podle kategorie
  let filteredProducts = products;
  
  if (detectedCategory === 'EO_BLEND') {
    // Pouze směsi esenciálních olejů
    filteredProducts = products.filter(p => isEssentialOilBlendCategory(p.category));
    console.log(`  📦 Filtrováno na ${filteredProducts.length} směsí EO (z ${products.length} celkem)`);
  } else if (detectedCategory === 'WAN') {
    // Pouze wany (TČM)
    filteredProducts = products.filter(p => isWanCategory(p.category));
    console.log(`  📦 Filtrováno na ${filteredProducts.length} wanů (z ${products.length} celkem)`);
  } else if (detectedCategory === 'PRAWTEIN') {
    // Pouze prawteiny
    filteredProducts = products.filter(p => isPrawteinCategory(p.category));
    console.log(`  📦 Filtrováno na ${filteredProducts.length} prawteinů (z ${products.length} celkem)`);
  }
  // Pro 'UNKNOWN' hledáme ve všech produktech
  
  if (filteredProducts.length === 0) {
    console.log(`  ⚠️  Po filtraci na kategorii ${detectedCategory} nezůstaly žádné produkty!`);
    return null;
  }
  
  // 3️⃣ MATCHING v rámci filtrované kategorie
  let bestMatch: MatchedProduct | null = null;
  let bestSimilarity = 0;
  
  const normalizedGptName = normalizeText(gptName);
  
  for (const product of filteredProducts) {
    const isEssentialOilBlend = isEssentialOilBlendCategory(product.category);
    
    // Zkusíme matchovat proti pinyin_name, product_name i description_short
    const candidates = [
      product.pinyin_name,
      product.product_name,
      extractPinyinFromDescription(product.description_short)
    ].filter(Boolean);
    
    for (const candidate of candidates) {
      const normalizedCandidate = normalizeText(candidate, isEssentialOilBlend);
      
      // Pro směsi EO: porovnáme také GPT název bez "esencialni olej"
      const normalizedGptForEO = isEssentialOilBlend 
        ? normalizeText(gptName, true) 
        : normalizedGptName;
      
      const similarity = calculateSimilarity(normalizedGptForEO, normalizedCandidate, isEssentialOilBlend);
      
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = {
          id: product.id,
          product_code: product.product_code,
          product_name: product.product_name,
          pinyin_name: product.pinyin_name,
          url: product.url,
          category: product.category,
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
 * 
 * @param text - Text k normalizaci
 * @param isEssentialOilBlend - Pokud je to směs EO, odstraní suffix "esencialni olej"
 */
function normalizeText(text: string, isEssentialOilBlend: boolean = false): string {
  if (!text) return '';
  
  let normalized = text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Odstranění diakritiky
    .replace(/[–-]/g, ' ') // Normalizace pomlček
    .replace(/\s+/g, ' ') // Vícenásobné mezery na jednu
    .replace(/[^\w\s]/g, ''); // Odstranění interpunkce
  
  // Pro směsi esenciálních olejů: odstraníme suffix "esencialni olej" / "eo"
  if (isEssentialOilBlend) {
    normalized = normalized
      .replace(/\s*esencialni\s+olej\s*$/i, '')
      .replace(/\s*eo\s*$/i, '')
      .trim();
  }
  
  return normalized;
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
 * Rozpozná, zda je produkt směs esenciálních olejů podle kategorie
 * 
 * @param category - Kategorie produktu z product_feed_2
 * @returns true pokud je to směs EO
 */
function isEssentialOilBlendCategory(category: string | null | undefined): boolean {
  if (!category) return false;
  
  const normalized = category.toLowerCase().trim();
  
  // Rozpoznání kategorií směsí esenciálních olejů
  return (
    normalized.includes('směs') && normalized.includes('esenciální') ||
    normalized.includes('smes') && normalized.includes('esencialni') ||
    normalized === 'směsi esenciálních olejů' ||
    normalized === 'smesi esencialnich oleju' ||
    normalized.includes('eo směs') ||
    normalized.includes('eo smes')
  );
}

/**
 * Rozpozná, zda je produkt wan (TČM) podle kategorie
 */
function isWanCategory(category: string | null | undefined): boolean {
  if (!category) return false;
  
  const normalized = category.toLowerCase().trim();
  
  return (
    normalized.includes('wan') ||
    normalized.includes('tcm') ||
    normalized.includes('tčm') ||
    normalized.includes('tradiční čínská') ||
    normalized.includes('tradicni cinska')
  );
}

/**
 * Rozpozná, zda je produkt prawtein podle kategorie
 */
function isPrawteinCategory(category: string | null | undefined): boolean {
  if (!category) return false;
  
  const normalized = category.toLowerCase().trim();
  
  return (
    normalized.includes('prawtein') ||
    normalized.includes('prawteiny')
  );
}

/**
 * DETEKCE KATEGORIE z GPT názvu
 * 
 * Rozpozná, o jaký typ produktu se jedná podle charakteristik názvu:
 * - 'EO_BLEND' = Směs esenciálních olejů (NO, NOSE, NOPA, NOHEPA, ...)
 * - 'WAN' = Wan - TČM produkt (dlouhý pinyin název nebo číselný kód)
 * - 'PRAWTEIN' = Prawtein
 * - 'UNKNOWN' = Neznámá kategorie (hledat ve všech)
 */
function detectProductCategory(gptName: string): 'EO_BLEND' | 'WAN' | 'PRAWTEIN' | 'UNKNOWN' {
  if (!gptName) return 'UNKNOWN';
  
  const trimmed = gptName.trim();
  const length = trimmed.length;
  const lowerName = trimmed.toLowerCase();
  
  // 1️⃣ PRAWTEINY: obsahuje "prawtein" nebo "prawteiny"
  if (lowerName.includes('prawtein')) {
    return 'PRAWTEIN';
  }
  
  // 2️⃣ SMĚSI EO: krátký název (2-6 znaků), velká písmena, bez mezer
  if (length >= 2 && length <= 6 && !trimmed.includes(' ')) {
    const letterCount = (trimmed.match(/[a-zA-Z]/g) || []).length;
    const upperCount = (trimmed.match(/[A-Z]/g) || []).length;
    
    // Alespoň 2 písmena a většina je velká
    if (letterCount >= 2 && upperCount > 0) {
      return 'EO_BLEND';
    }
  }
  
  // 3️⃣ WANY: dlouhý pinyin název (obsahuje mezery a >10 znaků)
  //    NEBO číselný kód (001, 004, 115, atd.)
  if (length > 10 && trimmed.includes(' ')) {
    // Pravděpodobně dlouhý pinyin název wanu
    const words = trimmed.split(/\s+/);
    if (words.length >= 2) {
      return 'WAN';
    }
  }
  
  // Číselný kód (001-999)
  if (/^[0-9]{3,}$/.test(trimmed)) {
    return 'WAN';
  }
  
  // 4️⃣ NEZNÁMÁ kategorie - hledat ve všech
  return 'UNKNOWN';
}

/**
 * Vrátí emoji pro kategorii (pro debug logging)
 */
function getCategoryEmoji(category: string | null | undefined): string {
  if (!category) return '';
  
  const normalized = category.toLowerCase();
  
  if (normalized.includes('směs') && normalized.includes('esenciální')) return '🌿 EO';
  if (normalized.includes('wan') || normalized.includes('tčm')) return '🏯 Wan';
  if (normalized.includes('prawtein')) return '🥗 Prawtein';
  
  return '';
}

/**
 * Rozpozná, zda GPT název vypadá jako název směsi EO
 * 
 * @deprecated Tato funkce už se nepoužívá v v3.0 - místo toho použij detectProductCategory()
 */
function isShortEOBlendName(name: string): boolean {
  if (!name) return false;
  
  const trimmed = name.trim();
  const length = trimmed.length;
  
  // Krátký název (2-6 znaků) bez mezer
  if (length < 2 || length > 6) return false;
  if (trimmed.includes(' ')) return false;
  
  // Obsahuje alespoň 2 písmena (ne jen čísla)
  const letterCount = (trimmed.match(/[a-zA-Z]/g) || []).length;
  if (letterCount < 2) return false;
  
  // Většina znaků je velká písmena (>50%)
  const upperCount = (trimmed.match(/[A-Z]/g) || []).length;
  const hasUppercase = upperCount > 0;
  
  return hasUppercase;
}

/**
 * Vypočítá podobnost mezi dvěma řetězci (0 = žádná, 1 = totožné)
 * Kombinuje:
 * 1. Exact match
 * 2. Start of string match (bonus)
 * 3. Start of word match (bonus)
 * 4. Substring match
 * 5. Word overlap
 * 6. Levenshtein distance
 * 
 * @param isEssentialOilBlend - Pokud je true, zvyšuje prioritu exact match na začátku
 */
function calculateSimilarity(str1: string, str2: string, isEssentialOilBlend: boolean = false): number {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1.0;
  
  // Určíme, který string je kratší (search term) a který delší (candidate)
  const shorter = str1.length <= str2.length ? str1 : str2;
  const longer = str1.length > str2.length ? str1 : str2;
  
  // 1. Exact match na začátku stringu (nejvyšší priorita)
  // Pro směsi EO: ještě vyšší priorita, protože název je klíčový
  // Např. "nohepa" matchuje "nohepa esencialni olej" lépe než cokoliv jiného
  if (longer.startsWith(shorter + ' ') || longer === shorter) {
    return isEssentialOilBlend ? 0.98 : 0.95;
  }
  
  // 2. Match na začátku slova (vysoká priorita)
  // Např. "no" matchuje "no esencialni" nebo "esencialni no"
  const wordBoundaryRegex = new RegExp(`\\b${shorter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  if (wordBoundaryRegex.test(longer)) {
    // Bonus pokud je to první slovo (pro směsi EO je to velmi důležité)
    const firstWord = longer.split(/\s+/)[0];
    if (firstWord === shorter) {
      return isEssentialOilBlend ? 0.95 : 0.92;
    }
    return isEssentialOilBlend ? 0.90 : 0.88;
  }
  
  // 3. Substring match (nižší priorita)
  if (str1.includes(str2) || str2.includes(str1)) {
    return 0.75;
  }
  
  // 4. Word overlap (kolik slov se shoduje)
  const words1 = str1.split(/\s+/);
  const words2 = str2.split(/\s+/);
  const commonWords = words1.filter(w => words2.includes(w) && w.length > 2);
  const wordOverlap = commonWords.length / Math.max(words1.length, words2.length);
  
  // 5. Levenshtein distance
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




