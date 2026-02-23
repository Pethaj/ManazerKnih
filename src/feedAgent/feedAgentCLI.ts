#!/usr/bin/env tsx
/**
 * Feed Agent CLI
 *
 * Terminálové rozhraní pro testování Feed Agenta.
 * Používá feed-agent-proxy Edge Function (nativní tool calling).
 *
 * Spuštění:
 *   npm run feed-agent
 *   npm run feed-agent:ask "jaké produkty máme s levandulí?"
 */

import * as readline from 'readline';

// ============================================================================
// KONFIGURACE
// ============================================================================

const SUPABASE_URL = 'https://modopafybeslbcqjxsve.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZG9wYWZ5YmVzbGJjcWp4c3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNTM0MjEsImV4cCI6MjA3MDgyOTQyMX0.8gxL0b9flTUyoltiEIJx8Djuiyx16rySlffHkd_nm1U';
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/feed-agent-proxy`;
const REST_URL = `${SUPABASE_URL}/rest/v1`;
const MODEL = 'mistralai/mistral-small-3.2-24b-instruct';

// ============================================================================
// REST API helper
// ============================================================================

async function supabaseRest(table: string, params: Record<string, string>): Promise<any[]> {
  // PostgREST REST API URL formát:
  // Správně: product_name=ilike.%25coldet%25 (browser/fetch dekóduje %25 → %)
  // fetch v Node.js posílá URL tak jak je - tedy %25 zůstane %25 a PostgREST dostane %
  const encodeValue = (v: string) =>
    encodeURIComponent(v)
      .replace(/%2E/g, '.')   // tečka zpět (PostgREST operátor separator)
      .replace(/%2C/g, ',')   // čárka zpět (select seznam sloupců)
      .replace(/%2A/g, '*');  // hvězdička zpět
  // Poznámka: % → %25 zůstane jako %25, což je správně pro fetch

  const queryString = Object.entries(params)
    .map(([k, v]) => `${k}=${encodeValue(v)}`)
    .join('&');
  const url = `${REST_URL}/${table}?${queryString}`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  if (!res.ok) throw new Error(`REST chyba: ${res.status} ${await res.text()}`);
  return res.json();
}

// ============================================================================
// TOOL DEFINICE
// ============================================================================

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'classify_products_list',
      description: 'Klasifikuje seznam produktů podle jejich kategorie v databázi. Určí zda jsou jednodruhové esenciální oleje, směsi EO, TČM produkty, prawteiny apod. Použij VŽDY když uživatel chce vědět typ produktu (jednodruhový / směs) pro konkrétní seznam názvů.',
      parameters: {
        type: 'object',
        properties: {
          productNames: {
            type: 'array',
            items: { type: 'string' },
            description: 'Seznam názvů produktů k klasifikaci'
          }
        },
        required: ['productNames']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_products_by_keyword',
      description: 'Vyhledá produkty v databázi product_feed_2 podle klíčového slova. Prohledává název produktu, krátký popis i kategorii.',
      parameters: {
        type: 'object',
        properties: {
          keyword: { type: 'string', description: 'Klíčové slovo pro vyhledávání' },
          limit: { type: 'number', description: 'Maximální počet výsledků (výchozí: 20)' }
        },
        required: ['keyword']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_products_by_category',
      description: 'Vyhledá všechny produkty v dané kategorii.',
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'Název nebo část názvu kategorie' },
          limit: { type: 'number', description: 'Maximální počet výsledků (výchozí: 50)' }
        },
        required: ['category']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_all_categories',
      description: 'Vrátí kompletní seznam všech kategorií produktů v databázi.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_product_category',
      description: 'Zjistí, do jaké kategorie patří konkrétní produkt.',
      parameters: {
        type: 'object',
        properties: {
          productCodeOrName: { type: 'string', description: 'Název nebo kód produktu' }
        },
        required: ['productCodeOrName']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'check_product_availability',
      description: 'Zjistí dostupnost a cenu produktu. Pro "prodáváme X?", "je Y v nabídce?".',
      parameters: {
        type: 'object',
        properties: {
          productName: { type: 'string', description: 'Název produktu' }
        },
        required: ['productName']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'classify_oils',
      description: 'Přehled jednodruhových esenciálních olejů a směsí EO.',
      parameters: {
        type: 'object',
        properties: {
          keyword: { type: 'string', description: 'Volitelné klíčové slovo' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_product_by_code',
      description: 'Načte kompletní detail produktu podle kódu.',
      parameters: {
        type: 'object',
        properties: {
          productCode: { type: 'string', description: 'Produktový kód, např. "5", "2163"' }
        },
        required: ['productCode']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_database_stats',
      description: 'Vrátí statistiky databáze: počet produktů, kategorií, top kategorie.',
      parameters: { type: 'object', properties: {} }
    }
  }
];

// ============================================================================
// SPOUŠTĚNÍ TOOLS
// ============================================================================

async function executeTool(toolName: string, toolArgs: any): Promise<string> {
  try {
    switch (toolName) {

      case 'classify_products_list': {
        const names: string[] = toolArgs.productNames || [];

        // Fuzzy matching helpers (stejná logika jako feedAgentTools.ts)
        const normText = (t: string) =>
          t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

        const levenshtein = (a: string, b: string): number => {
          const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i]);
          for (let j = 0; j <= b.length; j++) dp[0][j] = j;
          for (let i = 1; i <= a.length; i++) {
            for (let j = 1; j <= b.length; j++) {
              dp[i][j] = a[i-1] === b[j-1]
                ? dp[i-1][j-1]
                : Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+1);
            }
          }
          return dp[a.length][b.length];
        };

        const similarity = (s1: string, s2: string): number => {
          if (!s1 || !s2) return 0;
          if (s1 === s2) return 1;
          const shorter = s1.length <= s2.length ? s1 : s2;
          const longer  = s1.length >  s2.length ? s1 : s2;
          if (longer.startsWith(shorter + ' ') || longer === shorter) return 0.95;
          const re = new RegExp(`\\b${shorter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
          if (re.test(longer)) return 0.88;
          if (s1.includes(s2) || s2.includes(s1)) return 0.75;
          const w1 = s1.split(/\s+/), w2 = s2.split(/\s+/);
          const common = w1.filter(w => w2.includes(w) && w.length > 2);
          const wordOv = common.length / Math.max(w1.length, w2.length);
          const lev = levenshtein(s1, s2);
          return wordOv * 0.6 + (1 - lev / Math.max(s1.length, s2.length)) * 0.4;
        };

        const getType = (cat: string | null | undefined) => {
          if (!cat) return 'neznámý';
          const c = cat.toLowerCase();
          if (c.includes('jednodruhov')) return 'jednodruhový esenciální olej';
          if (c.includes('směsi') || c.includes('smesi')) return 'směs esenciálních olejů';
          if (c.includes('tčm') || c.includes('tcm')) return 'TČM produkt';
          if (c.includes('prawtein')) return 'prawtein';
          if (c.includes('kosmetick') || c.includes('pleťov')) return 'kosmetika';
          return cat;
        };

        const results: any[] = [];

        for (const name of names) {
          const norm = normText(name);
          const tokens = norm.split(/\s+/).filter(t => t.length >= 2);
          const searchTermSet = new Set<string>([norm, ...tokens]);

          // Pro jednoslovné výrazy bez mezer přidáme prefix (první polovina)
          // "moveit" → přidáme "move" jako token pro DB dotaz
          if (tokens.length === 1 && norm.length >= 4) {
            searchTermSet.add(norm.slice(0, Math.ceil(norm.length / 2)));
          }
          const searchTerms = [...searchTermSet];

          // Použijeme supabaseRest s ilike na každý token a sloučíme výsledky
          const allRows: any[] = [];
          const seenCodes = new Set<string>();
          for (const term of searchTerms) {
            try {
              const termRows = await supabaseRest('product_feed_2', {
                select: 'product_name,product_code,category,price,currency',
                'product_name': `ilike.%${term}%`,
                limit: '20'
              });
              for (const r of termRows) {
                if (!seenCodes.has(r.product_code)) {
                  seenCodes.add(r.product_code);
                  allRows.push(r);
                }
              }
            } catch { /* ignoruj chybu jednoho tokenu */ }
          }

          const rows = allRows;

          if (rows.length === 0) {
            results.push({ searchedName: name, found: false });
            continue;
          }

          // Skórovací funkce: základ similarity + bonusy za typ produktu
          const scoreFn = (p: any): number => {
            const normalizedPN = normText(p.product_name || '');
            const normalizedPNnoSpaces = normalizedPN.replace(/\s+/g, '');
            const sim = Math.max(
              similarity(norm, normalizedPN),
              similarity(norm, normalizedPNnoSpaces)
            );
            const cat = (p.category || '').toLowerCase();
            const pname = normalizedPN;

            // Bonus za přesnou kategoriální shodu
            // "Jednodruhové esenciální oleje" nebo "Směsi esenciálních olejů" = prioritní
            const isJednodruhove = cat.includes('jednodruhov');
            const isSmesi = cat.includes('smesi') || cat.includes('směsi');
            const isPrawtein = cat.includes('prawtein');
            const isRollon = cat.includes('roll') || cat.includes('aroma roll');

            // Bonus: název přímo končí "esenciální olej" → nejpřesnější match
            const isExactEO = pname.includes('esencialn') && !pname.includes('roll');

            return sim
              + (isJednodruhove || isSmesi ? 0.15 : 0)
              + (isExactEO ? 0.10 : 0)
              + (isPrawtein ? -0.10 : 0)    // PRAWTEIN je méně relevantní než EO
              + (isRollon ? -0.05 : 0);      // Roll-on je méně relevantní než olej
          };

          let bestMatch: any = null;
          let bestScore = -1;
          for (const p of rows) {
            const s = scoreFn(p);
            if (s > bestScore) { bestScore = s; bestMatch = p; }
          }

          if (bestMatch && bestScore >= 0.35) {
            results.push({
              found: true,
              searchedName: name,
              product_name: bestMatch.product_name,
              product_code: bestMatch.product_code,
              category: bestMatch.category,
              type: getType(bestMatch.category),
              price: bestMatch.price
            });
          } else {
            results.push({ searchedName: name, found: false });
          }
        }

        const found = results.filter(r => r.found);
        const notFound = results.filter(r => !r.found);
        let response = `Klasifikace (${found.length}/${results.length} nalezeno):\n\n`;
        for (const item of found) {
          response += `• ${item.product_name} (${item.product_code}) → Typ: ${item.type} | ${item.category}\n`;
        }
        if (notFound.length > 0) {
          response += `\n❌ Nenalezeno: ${notFound.map((i: any) => i.searchedName).join(', ')}`;
        }
        return response;
      }

      case 'search_products_by_keyword': {
        const normKw = (toolArgs.keyword || '').toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        const tokens = normKw.split(/\s+/).filter((t: string) => t.length >= 2);
        const limit = toolArgs.limit || 20;
        const allRows: any[] = [];
        const seenCodes = new Set<string>();

        // Pokus 1: přesné hledání v product_name
        try {
          const mainRows = await supabaseRest('product_feed_2', {
            select: 'product_name,product_code,category,price,currency,availability',
            'product_name': `ilike.%${normKw}%`,
            limit: String(limit),
            order: 'product_name.asc'
          });
          for (const r of mainRows) {
            if (!seenCodes.has(r.product_code)) { seenCodes.add(r.product_code); allRows.push(r); }
          }
        } catch { /* ignoruj */ }

        // Pokus 2: fuzzy - prefix pouze v product_name + filtr podobností
        // "moveit" → prefix "mov" → z kandidátů vezme jen ty kde "moveit" ~ "moveit" (z "Move It")
        if (allRows.length === 0 && normKw.length >= 3) {
          const prefix = normKw.slice(0, Math.ceil(normKw.length / 2));
          const normalizedNoSpaces = normKw.replace(/\s+/g, '');
          try {
            const candidates = await supabaseRest('product_feed_2', {
              select: 'product_name,product_code,category,price,currency,availability',
              'product_name': `ilike.%${prefix}%`,
              limit: '100',
              order: 'product_name.asc'
            });
            for (const r of candidates) {
              const pNorm = (r.product_name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
              const pNormNoSpaces = pNorm.replace(/\s+/g, '');
              if (pNormNoSpaces.includes(normalizedNoSpaces) || pNorm.includes(normKw)) {
                if (!seenCodes.has(r.product_code)) { seenCodes.add(r.product_code); allRows.push(r); }
              }
            }
          } catch { /* ignoruj */ }
        }

        if (allRows.length === 0) return `Žádné produkty pro: "${toolArgs.keyword}"`;
        return `Nalezeno ${allRows.length} produktů pro "${toolArgs.keyword}":\n\n` +
          allRows.map(p =>
            `• ${p.product_name} (${p.product_code}) | ${p.category || 'N/A'} | ${p.price ? `${p.price} ${p.currency}` : 'N/A'} | ${p.availability === 1 ? '✅' : '❌'}`
          ).join('\n');
      }

      case 'search_products_by_category': {
        const q = encodeURIComponent(`ilike.%${toolArgs.category}%`);
        const limit = toolArgs.limit || 50;
        const rows = await supabaseRest('product_feed_2', {
          select: 'product_name,product_code,price,currency,availability',
          category: q,
          limit: String(limit),
          order: 'product_name.asc'
        });
        if (rows.length === 0) return `Žádné produkty v kategorii: "${toolArgs.category}"`;
        return `Produkty v "${toolArgs.category}" (${rows.length}):\n\n` +
          rows.map(p =>
            `• ${p.product_name} (${p.product_code}) | ${p.price ? `${p.price} ${p.currency}` : 'N/A'} | ${p.availability === 1 ? '✅' : '❌'}`
          ).join('\n');
      }

      case 'get_all_categories': {
        const rows = await supabaseRest('product_feed_2', {
          select: 'category',
          order: 'category.asc'
        });
        const cats = [...new Set(rows.map(r => r.category).filter(Boolean))];
        return `Kategorie (${cats.length}):\n\n${cats.map(c => `• ${c}`).join('\n')}`;
      }

      case 'get_product_category': {
        const q = encodeURIComponent(`ilike.%${toolArgs.productCodeOrName}%`);
        const rows = await supabaseRest('product_feed_2', {
          select: 'product_name,product_code,category',
          or: `product_name.${q},product_code.${q}`,
          limit: '5'
        });
        if (rows.length === 0) return `Produkt "${toolArgs.productCodeOrName}" nebyl nalezen.`;
        return rows.map(p => `• ${p.product_name} (${p.product_code}) → ${p.category || 'N/A'}`).join('\n');
      }

      case 'check_product_availability': {
        const q = encodeURIComponent(`ilike.%${toolArgs.productName}%`);
        const rows = await supabaseRest('product_feed_2', {
          select: 'product_name,product_code,category,price,currency,availability',
          product_name: q,
          limit: '10'
        });
        if (rows.length === 0) return `Produkt "${toolArgs.productName}" nebyl nalezen.`;
        const avail = rows.filter(p => p.availability === 1).length;
        return `"${toolArgs.productName}": ${rows.length} záznamů, dostupných: ${avail}\n\n` +
          rows.map(p =>
            `• ${p.product_name} (${p.product_code}) | ${p.price ? `${p.price} ${p.currency}` : 'N/A'} | ${p.availability === 1 ? '✅' : '❌'}`
          ).join('\n');
      }

      case 'classify_oils': {
        // Dotazujeme přímo podle kategorií - bez limitu (stránkování po 1000)
        const fetchAllByCategory = async (catPattern: string) => {
          const all: any[] = [];
          for (let offset = 0; ; offset += 1000) {
            const rows = await supabaseRest('product_feed_2', {
              select: 'product_name,product_code,price,currency,category',
              category: `ilike.%${catPattern}%`,
              ...(toolArgs.keyword ? { product_name: `ilike.%${toolArgs.keyword}%` } : {}),
              order: 'product_name.asc',
              offset: String(offset),
              limit: '1000'
            });
            all.push(...rows);
            if (rows.length < 1000) break;
          }
          return all;
        };

        const jednodruhove = await fetchAllByCategory('jednodruhov');
        const smesi = await fetchAllByCategory('Směsi esenciálních');

        return `Jednodruhové (${jednodruhove.length} celkem):\n` +
          jednodruhove.slice(0, 20).map(p => `• ${p.product_name} | ${p.price} Kč`).join('\n') +
          (jednodruhove.length > 20 ? `\n... a dalších ${jednodruhove.length - 20}` : '') +
          `\n\nSměsi (${smesi.length} celkem):\n` +
          smesi.slice(0, 20).map(p => `• ${p.product_name} | ${p.price} Kč`).join('\n') +
          (smesi.length > 20 ? `\n... a dalších ${smesi.length - 20}` : '');
      }

      case 'get_product_by_code': {
        const rows = await supabaseRest('product_feed_2', {
          select: 'product_name,product_code,category,price,currency,availability,description_short',
          product_code: `eq.${toolArgs.productCode}`,
          limit: '1'
        });
        if (rows.length === 0) return `Produkt s kódem "${toolArgs.productCode}" nebyl nalezen.`;
        const p = rows[0];
        return `${p.product_name} (${p.product_code})\n- Kategorie: ${p.category}\n- Cena: ${p.price} ${p.currency}\n- Dostupnost: ${p.availability === 1 ? '✅' : '❌'}\n- Popis: ${p.description_short || 'N/A'}`;
      }

      case 'get_database_stats': {
        // Stránkování - načteme celou databázi
        const allStatsRows: any[] = [];
        for (let offset = 0; ; offset += 1000) {
          const page = await supabaseRest('product_feed_2', {
            select: 'category,availability',
            order: 'category.asc',
            offset: String(offset),
            limit: '1000'
          });
          allStatsRows.push(...page);
          if (page.length < 1000) break;
        }
        const rows = allStatsRows;
        const total = rows.length;
        const catMap: Record<string, { total: number; available: number }> = {};
        for (const r of rows) {
          const c = r.category || 'Bez kategorie';
          if (!catMap[c]) catMap[c] = { total: 0, available: 0 };
          catMap[c].total++;
          if (r.availability === 1) catMap[c].available++;
        }
        const cats = Object.entries(catMap).sort((a, b) => b[1].total - a[1].total);
        return `Celkem: ${total} produktů | ${cats.length} kategorií\n\nTop kategorie:\n` +
          cats.slice(0, 10).map(([c, v]) => `• ${c}: ${v.total} (${v.available} dostupných)`).join('\n');
      }

      default:
        return `Neznámý nástroj: ${toolName}`;
    }
  } catch (err) {
    return `Chyba ${toolName}: ${err instanceof Error ? err.message : String(err)}`;
  }
}

// ============================================================================
// VOLÁNÍ EDGE FUNCTION
// ============================================================================

type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
};

const SYSTEM_PROMPT = `Jsi Feed Agent - expert na BEWIT produktovou databázi.
Vždy odpovídej v češtině. Pro dotazy na produkty VŽDY použij dostupné nástroje.
Po získání výsledků z nástroje odpověz stručně a srozumitelně.`;

async function callEdgeFunction(messages: ChatMessage[]): Promise<any> {
  const res = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
      temperature: 0.1,
      max_tokens: 3000
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`EF chyba: ${res.status} - ${err}`);
  }

  const data = await res.json();
  if (data?.error) throw new Error(`OpenRouter: ${data.error}`);
  return data;
}

// ============================================================================
// AGENTIC LOOP
// ============================================================================

async function processMessage(userInput: string, messages: ChatMessage[]): Promise<string> {
  messages.push({ role: 'user', content: userInput });

  const MAX_ITERATIONS = 5;
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const data = await callEdgeFunction(messages);
    const choice = data?.choices?.[0];
    if (!choice) throw new Error('Prázdná odpověď');

    const assistantMsg = choice.message;
    const toolCalls: any[] = assistantMsg?.tool_calls || [];

    messages.push({
      role: 'assistant',
      content: assistantMsg?.content || null,
      tool_calls: toolCalls.length > 0 ? toolCalls : undefined
    });

    if (toolCalls.length === 0) {
      return assistantMsg?.content || '(bez odpovědi)';
    }

    console.log(`  🔧 Volám nástroj(e): ${toolCalls.map(tc => tc.function?.name).join(', ')}`);

    for (const tc of toolCalls) {
      let args: any = {};
      try {
        args = typeof tc.function?.arguments === 'string'
          ? JSON.parse(tc.function.arguments)
          : tc.function?.arguments || {};
      } catch { args = {}; }

      const result = await executeTool(tc.function?.name, args);
      messages.push({
        role: 'tool',
        content: result,
        tool_call_id: tc.id,
        name: tc.function?.name
      });
    }
  }

  return 'Dosažen max. počet iterací.';
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT }
  ];

  // Jednorázový dotaz z CLI argumentu (všechny argumenty spojit do jednoho dotazu)
  const singleQuestion = process.argv.slice(2).join(' ') || '';
  if (singleQuestion) {
    console.log(`\n🤖 Feed Agent\n${'='.repeat(50)}`);
    console.log(`❓ ${singleQuestion}`);
    console.log('─'.repeat(50));
    try {
      const answer = await processMessage(singleQuestion, messages);
      console.log(`\n${answer}\n`);
    } catch (err) {
      console.error(`❌ ${err instanceof Error ? err.message : err}`);
    }
    process.exit(0);
  }

  // Interaktivní chat
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('\n🤖 Feed Agent CLI');
  console.log('='.repeat(50));
  console.log('Ptej se na produkty v databázi product_feed_2.');
  console.log('Napište "exit" nebo Ctrl+C pro ukončení.\n');

  const ask = () => {
    rl.question('Vy: ', async (input) => {
      const trimmed = input.trim();
      if (!trimmed || trimmed.toLowerCase() === 'exit') {
        console.log('\nNa shledanou! 👋');
        rl.close();
        return;
      }
      try {
        console.log('Agent přemýšlí...');
        const answer = await processMessage(trimmed, messages);
        console.log(`\nAgent: ${answer}\n`);
      } catch (err) {
        console.error(`❌ Chyba: ${err instanceof Error ? err.message : err}\n`);
      }
      ask();
    });
  };

  ask();
}

main().catch(err => {
  console.error('Fatální chyba:', err);
  process.exit(1);
});
