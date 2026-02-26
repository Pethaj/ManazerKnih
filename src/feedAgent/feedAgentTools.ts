/**
 * Feed Agent Tools
 * 
 * Nástroje (tools) pro Feed Agenta - expert na vyhledávání v product_feed_2
 * Každý tool je samostatná funkce napojená na Supabase databázi
 */

import { supabase } from '../lib/supabase';

// ============================================================================
// INTERFACES
// ============================================================================

export interface ProductFeedItem {
  id: number;
  product_code: string;
  product_name: string;
  description_short?: string;
  description_long?: string;
  category?: string;
  url?: string;
  thumbnail?: string;
  price?: number;
  currency?: string;
  availability?: number;
  in_action?: number;
  sales_last_30_days?: number;
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  count?: number;
}

// ============================================================================
// POMOCNÉ FUNKCE
// ============================================================================

/**
 * Normalizuje text pro vyhledávání (odstraní diakritiku, malá písmena)
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Párovací algoritmus s Levenshtein vzdáleností
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + 1);
      }
    }
  }
  return dp[m][n];
}

function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1.0;

  const shorter = str1.length <= str2.length ? str1 : str2;
  const longer = str1.length > str2.length ? str1 : str2;

  if (longer.startsWith(shorter + ' ') || longer === shorter) return 0.95;

  const wordBoundaryRegex = new RegExp(`\\b${shorter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  if (wordBoundaryRegex.test(longer)) return 0.88;
  if (str1.includes(str2) || str2.includes(str1)) return 0.75;

  const words1 = str1.split(/\s+/);
  const words2 = str2.split(/\s+/);
  const commonWords = words1.filter(w => words2.includes(w) && w.length > 2);
  const wordOverlap = commonWords.length / Math.max(words1.length, words2.length);

  const levenshtein = levenshteinDistance(str1, str2);
  const maxLen = Math.max(str1.length, str2.length);
  const levenshteinSimilarity = 1 - levenshtein / maxLen;

  return wordOverlap * 0.6 + levenshteinSimilarity * 0.4;
}

// ============================================================================
// FEED AGENT TOOLS - IMPLEMENTACE
// ============================================================================

/**
 * TOOL: Vyhledávání produktů podle klíčového slova
 *
 * Pokud přesné hledání (%keyword%) nevrátí výsledky, použije fuzzy matching:
 * načte kandidáty z product_name pomocí prefixu a vybere ty s nejvyšší podobností.
 * Výsledky jsou filtrovány - vrací jen produkty s dostatečnou podobností názvu.
 */
export async function searchProductsByKeyword(keyword: string, limit: number = 20): Promise<ToolResult> {
  try {
    const normalized = normalizeText(keyword);

    // Pokus 1: přesné hledání v product_name, description, kategorii
    const { data: exactData } = await supabase
      .from('product_feed_2')
      .select('id, product_code, product_name, description_short, category, url, thumbnail, price, currency, availability')
      .or(`product_name.ilike.%${normalized}%,description_short.ilike.%${normalized}%,category.ilike.%${normalized}%`)
      .order('product_name')
      .limit(limit);

    if (exactData && exactData.length > 0) {
      return { success: true, data: exactData, count: exactData.length };
    }

    // Pokus 2: fuzzy - načti kandidáty podle prefixu jen z product_name,
    // pak filtruj podobností (tak "moveit" najde "Move It" ale ne "Topol balzámový")
    if (normalized.length >= 3) {
      const prefix = normalized.slice(0, Math.ceil(normalized.length / 2));
      const { data: candidates } = await supabase
        .from('product_feed_2')
        .select('id, product_code, product_name, description_short, category, url, thumbnail, price, currency, availability')
        .ilike('product_name', `%${prefix}%`)
        .limit(100);

      if (candidates && candidates.length > 0) {
        // Filtruj jen ty, kde normalized name (bez mezer) obsahuje hledaný výraz
        const normalizedNoSpaces = normalized.replace(/\s+/g, '');
        const filtered = candidates.filter(p => {
          const pNorm = normalizeText(p.product_name || '');
          const pNormNoSpaces = pNorm.replace(/\s+/g, '');
          return pNormNoSpaces.includes(normalizedNoSpaces) ||
                 pNorm.includes(normalized) ||
                 calculateSimilarity(normalized, pNormNoSpaces) >= 0.7;
        });

        if (filtered.length > 0) {
          return { success: true, data: filtered.slice(0, limit), count: filtered.length };
        }
      }
    }

    return { success: true, data: [], count: 0 };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}

/**
 * TOOL: Vyhledávání produktů podle kategorie
 * Vrátí všechny produkty z dané kategorie
 */
export async function searchProductsByCategory(category: string, limit: number = 50): Promise<ToolResult> {
  try {
    const { data, error } = await supabase
      .from('product_feed_2')
      .select('id, product_code, product_name, description_short, category, url, thumbnail, price, currency, availability')
      .ilike('category', `%${category}%`)
      .order('product_name')
      .limit(limit);

    if (error) throw new Error(error.message);

    return {
      success: true,
      data: data || [],
      count: data?.length || 0
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}

/**
 * TOOL: Získání seznamu všech kategorií
 */
export async function getAllCategories(): Promise<ToolResult> {
  try {
    const PAGE_SIZE = 1000;
    const allRows: any[] = [];

    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await supabase
        .from('product_feed_2')
        .select('category')
        .not('category', 'is', null)
        .order('category')
        .range(from, from + PAGE_SIZE - 1);

      if (error) throw new Error(error.message);
      const page = data || [];
      allRows.push(...page);
      if (page.length < PAGE_SIZE) break;
    }

    const categories = [...new Set(allRows.map(d => d.category).filter(Boolean))];

    return {
      success: true,
      data: categories,
      count: categories.length
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}

/**
 * TOOL: Získání kategorie produktu podle jeho kódu nebo názvu
 */
export async function getProductCategory(productCodeOrName: string): Promise<ToolResult> {
  try {
    const { data, error } = await supabase
      .from('product_feed_2')
      .select('product_code, product_name, category, url, price')
      .or(`product_code.eq.${productCodeOrName},product_name.ilike.%${productCodeOrName}%`)
      .limit(10);

    if (error) throw new Error(error.message);

    return {
      success: true,
      data: data || [],
      count: data?.length || 0
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}

/**
 * TOOL: Zjistit, zda produkt prodáváme (je v databázi)
 */
export async function checkProductAvailability(productName: string): Promise<ToolResult> {
  try {
    const { data, error } = await supabase
      .from('product_feed_2')
      .select('product_code, product_name, category, price, currency, availability, url')
      .ilike('product_name', `%${productName}%`)
      .limit(20);

    if (error) throw new Error(error.message);

    const found = data || [];
    const available = found.filter(p => p.availability === 1);
    const unavailable = found.filter(p => p.availability !== 1);

    return {
      success: true,
      data: {
        found: found.length > 0,
        total: found.length,
        available: available.length,
        unavailable: unavailable.length,
        products: found
      }
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}

/**
 * TOOL: Rozdělení olejů na jednodruhové a směsi
 * Dotazuje každou kategorii separátně se stránkováním → správné počty z celé DB.
 */
export async function classifyOilProducts(keyword?: string): Promise<ToolResult> {
  try {
    const PAGE_SIZE = 1000;

    const fetchByCategory = async (catPattern: string): Promise<any[]> => {
      const all: any[] = [];
      for (let from = 0; ; from += PAGE_SIZE) {
        let q = supabase
          .from('product_feed_2')
          .select('product_code, product_name, category, price, url, availability')
          .ilike('category', `%${catPattern}%`)
          .order('product_name')
          .range(from, from + PAGE_SIZE - 1);
        if (keyword) q = (q as any).ilike('product_name', `%${keyword}%`);
        const { data, error } = await q;
        if (error) break;
        all.push(...(data || []));
        if ((data || []).length < PAGE_SIZE) break;
      }
      return all;
    };

    // Kategorie v DB mají diakritiku: "jednodruhov" funguje pro ilike, "Směsi" musí být přesně
    const jednodruhove = await fetchByCategory('jednodruhov');
    const smesi = await fetchByCategory('Směsi esenciálních');

    return {
      success: true,
      data: {
        jednodruhove,
        smesi,
        celkem_jednodruhove: jednodruhove.length,
        celkem_smesi: smesi.length
      }
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}

/**
 * TOOL: Párování produktů podle názvu (fuzzy matching)
 * Stejná logika jako productNameMatchingService.ts
 */
export async function matchProductsByName(productNames: string[]): Promise<ToolResult> {
  try {
    if (productNames.length === 0) {
      return { success: true, data: { matches: [], unmatched: [] } };
    }

    // Načteme všechny produkty (stránkování)
    const PAGE_SIZE = 1000;
    const allProducts: any[] = [];

    for (let from = 0; ; from += PAGE_SIZE) {
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await (supabase.rpc('get_products_with_pinyin_names') as any).range(from, to);

      if (error) throw new Error(error.message);

      const page = (data ?? []) as any[];
      allProducts.push(...page);

      if (page.length < PAGE_SIZE) break;
    }

    const matches: any[] = [];
    const unmatched: string[] = [];

    for (const searchName of productNames) {
      const normalizedSearch = normalizeText(searchName);
      let bestMatch: any = null;
      let bestSimilarity = 0;

      for (const product of allProducts) {
        const candidates = [
          product.pinyin_name,
          product.product_name,
        ].filter(Boolean).map(normalizeText);

        for (const candidate of candidates) {
          const similarity = calculateSimilarity(normalizedSearch, candidate);
          if (similarity > bestSimilarity) {
            bestSimilarity = similarity;
            bestMatch = { ...product, similarity };
          }
        }
      }

      if (bestMatch && bestSimilarity >= 0.5) {
        matches.push(bestMatch);
      } else {
        unmatched.push(searchName);
      }
    }

    return {
      success: true,
      data: { matches, unmatched },
      count: matches.length
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}

/**
 * TOOL: Vyhledání produktů podle produktového kódu
 */
export async function getProductByCode(productCode: string): Promise<ToolResult> {
  try {
    const { data, error } = await supabase
      .from('product_feed_2')
      .select('*')
      .eq('product_code', productCode)
      .single();

    if (error && error.code !== 'PGRST116') throw new Error(error.message);

    return {
      success: true,
      data: data || null,
      count: data ? 1 : 0
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}

/**
 * TOOL: Klasifikace seznamu produktů - jednodruhový vs směs
 *
 * Používá fuzzy matching (stejný algoritmus jako produktový párovač):
 * 1. Normalizuje hledaný název (odstraní diakritiku, malá písmena)
 * 2. Načte kandidáty z DB pomocí ilike (tokenizuje na slova)
 * 3. Ze všech kandidátů vybere nejlepší shodu podle similarity skóre
 *
 * Pokud uživatel napíše "moveit", najde "Move It esenciální olej".
 * Pokud napíše "levandule", upřednostní esenciální olej před balzámem.
 */
export async function classifyProductsList(productNames: string[]): Promise<ToolResult> {
  try {
    if (productNames.length === 0) {
      return { success: true, data: { results: [] } };
    }

    const results: any[] = [];

    for (const name of productNames) {
      const normalized = normalizeText(name);
      // Tokenizujeme na slova
      const tokens = normalized.split(/\s+/).filter(t => t.length >= 2);

      // Sestavíme vyhledávací výrazy:
      // 1. Celý normalizovaný výraz
      // 2. Každý token zvlášť
      // 3. Verze bez mezer (pro "moveit" → hledáme "move" i "it" zvlášť)
      //    - rozdělíme podle camelCase nebo jen jako fallback tokenizace
      const searchTerms = new Set<string>([normalized, ...tokens]);

      // Pro jednoslovné výrazy (bez mezer) přidáme prefix = první polovina slova
      // Příklad: "moveit" → přidáme "mov" → DB najde "Move It esenciální olej"
      if (tokens.length === 1 && normalized.length >= 4) {
        searchTerms.add(normalized.slice(0, Math.ceil(normalized.length / 2)));
      }

      const orConditions = [...searchTerms]
        .map(t => `product_name.ilike.%${t}%`)
        .join(',');

      const { data, error } = await supabase
        .from('product_feed_2')
        .select('product_code, product_name, category, price, currency, availability')
        .or(orConditions)
        .limit(30);

      if (error) {
        results.push({ searchedName: name, found: false, error: error.message });
        continue;
      }

      if (!data || data.length === 0) {
        results.push({ searchedName: name, found: false });
        continue;
      }

      // Ze všech kandidátů vybereme nejlepší shodu fuzzy matchingem.
      // Klíčový trik: porovnáváme i verzi názvu BEZ MEZER → "moveit" = "move it"
      let bestMatch: any = null;
      let bestScore = -1;

      for (const product of data) {
        const normalizedProductName = normalizeText(product.product_name || '');
        const normalizedNoSpaces = normalizedProductName.replace(/\s+/g, '');

        const sim = Math.max(
          calculateSimilarity(normalized, normalizedProductName),
          calculateSimilarity(normalized, normalizedNoSpaces)
        );

        const cat = (product.category || '').toLowerCase();
        const isJednodruhove = cat.includes('jednodruhov');
        const isSmesi = cat.includes('smesi') || cat.includes('směsi');
        const isPrawtein = cat.includes('prawtein');
        const isRollon = cat.includes('roll') || cat.includes('aroma roll');
        const isExactEO = normalizedProductName.includes('esencialn') && !normalizedProductName.includes('roll');

        const score = sim
          + (isJednodruhove || isSmesi ? 0.15 : 0)
          + (isExactEO ? 0.10 : 0)
          + (isPrawtein ? -0.10 : 0)
          + (isRollon ? -0.05 : 0);

        if (score > bestScore) {
          bestScore = score;
          bestMatch = product;
        }
      }

      // Práh: minimálně 0.35 shody (benevolentní pro krátká jména)
      if (bestMatch && bestScore >= 0.35) {
        results.push({
          searchedName: name,
          found: true,
          product_code: bestMatch.product_code,
          product_name: bestMatch.product_name,
          category: bestMatch.category,
          price: bestMatch.price,
          similarity: Math.round(bestScore * 100),
          type: getOilType(bestMatch.category)
        });
      } else {
        results.push({ searchedName: name, found: false });
      }
    }

    return { success: true, data: { results } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}

/**
 * Pomocná funkce - určí typ produktu podle kategorie
 */
function getOilType(category: string | null | undefined): string {
  if (!category) return 'neznámý';
  const cat = category.toLowerCase();
  if (cat.includes('jednodruhov')) return 'jednodruhový esenciální olej';
  if (cat.includes('směsi') || cat.includes('smesi')) return 'směs esenciálních olejů';
  if (cat.includes('tcm') || cat.includes('tčm') || cat.includes('tradiční čínská')) return 'TČM produkt';
  if (cat.includes('prawtein')) return 'prawtein';
  if (cat.includes('kosmetick') || cat.includes('pleťov') || cat.includes('tělové')) return 'kosmetika';
  return category;
}

// ============================================================================
// AUTOCOMPLETE - PŘÍMÝ SQL DOTAZ (bez agenta, ~50-150ms)
// ============================================================================

export interface AutocompleteProduct {
  product_code: string;
  product_name: string;
  category?: string;
  price?: number;
  currency?: string;
  thumbnail?: string;
  url?: string;
  availability?: number;
  similarity: number;
}

/**
 * Autocomplete vyhledávání produktů pomocí pg_trgm (trigram similarity).
 *
 * Volá Supabase RPC funkci `autocomplete_products` - jde přímo na DB,
 * NEZAPOJUJE agenta ani Edge Function → latence ~50-150ms.
 *
 * Použití: při psaní do inputu (debounce 200ms), ne přes agenta.
 *
 * Vyžaduje spuštění `add_trgm_index_for_autocomplete.sql` v Supabase.
 */
export async function searchProductsAutocomplete(
  query: string,
  limit: number = 8
): Promise<AutocompleteProduct[]> {
  if (!query || query.trim().length < 2) return [];

  try {
    const { data, error } = await supabase.rpc('autocomplete_products', {
      search_query: query.trim(),
      max_results: limit,
    });

    if (error) {
      // Fallback: jednoduchý ilike dotaz
      return searchProductsAutocompleteFallback(query, limit);
    }

    return (data as AutocompleteProduct[]) ?? [];
  } catch {
    return searchProductsAutocompleteFallback(query, limit);
  }
}

/**
 * Fallback autocomplete - čistý ilike dotaz bez pg_trgm.
 * Používá se pokud RPC funkce ještě není nasazena v DB.
 */
async function searchProductsAutocompleteFallback(
  query: string,
  limit: number
): Promise<AutocompleteProduct[]> {
  const normalized = query.toLowerCase().trim();

  const { data } = await supabase
    .from('product_feed_2')
    .select('product_code, product_name, category, price, currency, thumbnail, url, availability')
    .or(`product_name.ilike.${normalized}%,product_name.ilike.% ${normalized}%,product_name.ilike.%${normalized}%`)
    .order('sales_last_30_days', { ascending: false, nullsFirst: false })
    .limit(limit);

  return (data ?? []).map(p => ({ ...p, similarity: 0.5 }));
}

/**
 * TOOL: Statistiky databáze
 */
export async function getDatabaseStats(): Promise<ToolResult> {
  try {
    // Stránkování - Supabase vrací max 1000 řádků na dotaz
    const PAGE_SIZE = 1000;
    const products: any[] = [];

    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await supabase
        .from('product_feed_2')
        .select('category, availability')
        .range(from, from + PAGE_SIZE - 1);

      if (error) throw new Error(error.message);
      const page = data || [];
      products.push(...page);
      if (page.length < PAGE_SIZE) break;
    }
    const categoryMap = new Map<string, { total: number; available: number }>();

    for (const p of products) {
      const cat = p.category || 'Bez kategorie';
      const current = categoryMap.get(cat) || { total: 0, available: 0 };
      current.total++;
      if (p.availability === 1) current.available++;
      categoryMap.set(cat, current);
    }

    const stats = Array.from(categoryMap.entries())
      .map(([category, { total, available }]) => ({ category, total, available }))
      .sort((a, b) => b.total - a.total);

    return {
      success: true,
      data: {
        celkem_produktu: products.length,
        celkem_kategorii: categoryMap.size,
        kategorie: stats
      }
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}
