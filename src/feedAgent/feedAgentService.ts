/**
 * Feed Agent Service
 *
 * Agent pro expertní vyhledávání v product_feed_2
 * Model: Mistral Small přes feed-agent-proxy Edge Function
 *
 * Používá nativní OpenAI tool calling:
 * - Tools mají description přímo u sebe (ne v system promptu)
 * - Model vrací strukturované tool_calls (ne JSON string)
 * - Žádné regex hacky na parsování odpovědí
 */

import { supabase } from '../lib/supabase';
import {
  searchProductsByKeyword,
  searchProductsByCategory,
  getAllCategories,
  getProductCategory,
  checkProductAvailability,
  classifyOilProducts,
  classifyProductsList,
  matchProductsByName,
  getProductByCode,
  getDatabaseStats,
} from './feedAgentTools';

// ============================================================================
// INTERFACES
// ============================================================================

export interface FeedAgentMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface FeedAgentResponse {
  success: boolean;
  message: string;
  error?: string;
}

type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
};

// ============================================================================
// KONFIGURACE
// ============================================================================

const EDGE_FUNCTION_URL = 'feed-agent-proxy';
const MODEL = 'mistralai/mistral-small-3.2-24b-instruct';

// ============================================================================
// TOOL DEFINICE - description žije přímo tady (ne v system promptu)
// ============================================================================

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'classify_products_list',
      description: 'Klasifikuje seznam produktů podle jejich kategorie v databázi. Určí zda jsou jednodruhové esenciální oleje, směsi EO, TČM produkty, prawteiny apod. Použij VŽDY když uživatel chce vědět typ produktu ( například jednodruhový / směs) pro konkrétní seznam názvů.',
      parameters: {
        type: 'object',
        properties: {
          productNames: {
            type: 'array',
            items: { type: 'string' },
            description: 'Seznam názvů produktů se zařazením do správné kategorie, např. ["coldet", "bodyguard", "levandule"]'
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
      description: 'Vyhledá produkty v databázi product_feed_2 podle klíčového slova. Prohledává název produktu, krátký popis i kategorii. Vrátí název, kód, kategorii, cenu a dostupnost.',
      parameters: {
        type: 'object',
        properties: {
          keyword: {
            type: 'string',
            description: 'Klíčové slovo pro vyhledávání, např. "levandule", "bergamot", "med"'
          },
          limit: {
            type: 'number',
            description: 'Maximální počet výsledků (výchozí: 20)'
          }
        },
        required: ['keyword']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_products_by_category',
      description: 'Vyhledá všechny produkty v dané kategorii. Kategorie jsou například: "Jednodruhové esenciální oleje", "Směsi esenciálních olejů", "TČM - Tradiční čínská medicína", "PRAWTEIN® – superpotravinové směsi".',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'Název nebo část názvu kategorie'
          },
          limit: {
            type: 'number',
            description: 'Maximální počet výsledků (výchozí: 50)'
          }
        },
        required: ['category']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_all_categories',
      description: 'Vrátí kompletní seznam všech kategorií produktů v databázi. Použij pro přehled dostupných kategorií nebo když nevíš přesný název kategorie.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_product_category',
      description: 'Zjistí, do jaké kategorie patří konkrétní produkt. Hledá podle kódu nebo názvu produktu.',
      parameters: {
        type: 'object',
        properties: {
          productCodeOrName: {
            type: 'string',
            description: 'Název nebo kód produktu, jehož kategorii chceš zjistit'
          }
        },
        required: ['productCodeOrName']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'check_product_availability',
      description: 'Zjistí, zda daný produkt prodáváme, jeho dostupnost a cenu. Použij pro dotazy "prodáváme X?", "je Y v nabídce?", "máme Z?".',
      parameters: {
        type: 'object',
        properties: {
          productName: {
            type: 'string',
            description: 'Název produktu'
          }
        },
        required: ['productName']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'classify_oils',
      description: 'Zobrazí přehled všech jednodruhových esenciálních olejů a směsí EO v databázi. Volitelně filtruje podle klíčového slova. Použij pro "ukáž mi všechny jednodruhové oleje" nebo "seznam všech směsí".',
      parameters: {
        type: 'object',
        properties: {
          keyword: {
            type: 'string',
            description: 'Volitelné klíčové slovo pro filtrování'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'match_products_by_name',
      description: 'Páruje seznam názvů produktů s databází pomocí fuzzy matching algoritmu (stejný jako produktový párovač). Vrátí shody s procentuální podobností. Použij pro přesné párování názvů z externího zdroje.',
      parameters: {
        type: 'object',
        properties: {
          productNames: {
            type: 'array',
            items: { type: 'string' },
            description: 'Seznam názvů produktů k párování'
          }
        },
        required: ['productNames']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_product_by_code',
      description: 'Načte kompletní detail produktu podle jeho produktového kódu (číslo). Vrátí vše včetně popisu.',
      parameters: {
        type: 'object',
        properties: {
          productCode: {
            type: 'string',
            description: 'Produktový kód, např. "5", "2163", "538"'
          }
        },
        required: ['productCode']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_database_stats',
      description: 'Vrátí statistiky celé databáze: celkový počet produktů, počet kategorií a top 10 kategorií podle počtu produktů.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  }
];

// ============================================================================
// SYSTÉMOVÝ PROMPT - čistý, bez popisu tools
// ============================================================================

const SYSTEM_PROMPT = `Jsi **Feed Agent** - expert na BEWIT produktovou databázi (product_feed_2).

Vždy odpovídej v češtině. Pro jakýkoliv dotaz na produkty VŽDY použij dostupné nástroje - nikdy nehádej výsledky.

Po obdržení výsledků z nástroje odpověz uživateli srozumitelně - uveď jména produktů, kategorie, ceny a dostupnost.`;

// ============================================================================
// VOLÁNÍ EDGE FUNCTION
// ============================================================================

async function callEdgeFunction(messages: ChatMessage[]): Promise<any> {
  const { data, error } = await supabase.functions.invoke(EDGE_FUNCTION_URL, {
    body: {
      model: MODEL,
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
      temperature: 0.1,
      max_tokens: 3000
    }
  });

  if (error) throw new Error(`Edge Function chyba: ${error.message}`);
  if (data?.error) throw new Error(`OpenRouter chyba: ${data.error}`);

  return data;
}

// ============================================================================
// SPOUŠTĚNÍ TOOLS
// ============================================================================

async function executeTool(toolName: string, toolArgs: any): Promise<string> {
  try {
    switch (toolName) {
      case 'classify_products_list': {
        const result = await classifyProductsList(toolArgs.productNames || []);
        if (!result.success) return `Chyba: ${result.error}`;
        const items = result.data.results as any[];
        const found = items.filter(i => i.found);
        const notFound = items.filter(i => !i.found);
        let response = `Klasifikace produktů (${found.length}/${items.length} nalezeno):\n\n`;
        for (const item of found) {
          response += `• **${item.product_name}** (${item.product_code})\n`;
          response += `  Typ: **${item.type}** | Kategorie: ${item.category || 'N/A'} | Cena: ${item.price ? `${item.price} Kč` : 'N/A'}\n`;
        }
        if (notFound.length > 0) {
          response += `\n❌ Nenalezeno: ${notFound.map((i: any) => i.searchedName).join(', ')}`;
        }
        return response;
      }

      case 'search_products_by_keyword': {
        const result = await searchProductsByKeyword(toolArgs.keyword, toolArgs.limit || 20);
        if (!result.success) return `Chyba: ${result.error}`;
        const products = result.data as any[];
        if (products.length === 0) return `Žádné produkty nenalezeny pro: "${toolArgs.keyword}"`;
        return `Nalezeno ${products.length} produktů pro "${toolArgs.keyword}":\n\n` +
          products.map(p =>
            `• **${p.product_name}** (${p.product_code}) | ${p.category || 'N/A'} | ${p.price ? `${p.price} ${p.currency}` : 'N/A'} | ${p.availability === 1 ? '✅' : '❌'}`
          ).join('\n');
      }

      case 'search_products_by_category': {
        const result = await searchProductsByCategory(toolArgs.category, toolArgs.limit || 50);
        if (!result.success) return `Chyba: ${result.error}`;
        const products = result.data as any[];
        if (products.length === 0) return `Žádné produkty v kategorii: "${toolArgs.category}"`;
        return `Produkty v kategorii "${toolArgs.category}" (${products.length}):\n\n` +
          products.map(p =>
            `• **${p.product_name}** (${p.product_code}) | ${p.price ? `${p.price} ${p.currency}` : 'N/A'} | ${p.availability === 1 ? '✅' : '❌'}`
          ).join('\n');
      }

      case 'get_all_categories': {
        const result = await getAllCategories();
        if (!result.success) return `Chyba: ${result.error}`;
        const categories = result.data as string[];
        return `Kategorie v databázi (${categories.length}):\n\n${categories.map(c => `• ${c}`).join('\n')}`;
      }

      case 'get_product_category': {
        const result = await getProductCategory(toolArgs.productCodeOrName);
        if (!result.success) return `Chyba: ${result.error}`;
        const products = result.data as any[];
        if (products.length === 0) return `Produkt "${toolArgs.productCodeOrName}" nebyl nalezen.`;
        return products.map(p =>
          `• **${p.product_name}** (${p.product_code}) → Kategorie: **${p.category || 'N/A'}**`
        ).join('\n');
      }

      case 'check_product_availability': {
        const result = await checkProductAvailability(toolArgs.productName);
        if (!result.success) return `Chyba: ${result.error}`;
        const d = result.data;
        if (!d.found) return `Produkt "${toolArgs.productName}" **nebyl nalezen** v databázi.`;
        return `"${toolArgs.productName}": nalezeno ${d.total} produktů, dostupných: ${d.available}\n\n` +
          (d.products as any[]).map(p =>
            `• **${p.product_name}** (${p.product_code}) | ${p.price ? `${p.price} ${p.currency}` : 'N/A'} | ${p.availability === 1 ? '✅ Dostupný' : '❌ Nedostupný'}`
          ).join('\n');
      }

      case 'classify_oils': {
        const result = await classifyOilProducts(toolArgs.keyword || undefined);
        if (!result.success) return `Chyba: ${result.error}`;
        const d = result.data;
        let response = `Klasifikace olejů${toolArgs.keyword ? ` (filtr: "${toolArgs.keyword}")` : ''}:\n\n`;
        response += `🌿 **Jednodruhové** (${d.celkem_jednodruhove}):\n`;
        response += d.jednodruhove.length > 0
          ? d.jednodruhove.map((p: any) => `• ${p.product_name} (${p.product_code}) | ${p.price} Kč`).join('\n')
          : 'Žádné.';
        response += `\n\n🔀 **Směsi** (${d.celkem_smesi}):\n`;
        response += d.smesi.length > 0
          ? d.smesi.map((p: any) => `• ${p.product_name} (${p.product_code}) | ${p.price} Kč`).join('\n')
          : 'Žádné.';
        return response;
      }

      case 'match_products_by_name': {
        const result = await matchProductsByName(toolArgs.productNames || []);
        if (!result.success) return `Chyba: ${result.error}`;
        const d = result.data;
        let response = '';
        if (d.matches.length > 0) {
          response += `✅ Namatchováno (${d.matches.length}):\n` +
            d.matches.map((p: any) =>
              `• **${p.product_name}** (${p.product_code}) | Shoda: ${Math.round(p.similarity * 100)}% | ${p.category || 'N/A'}`
            ).join('\n') + '\n\n';
        }
        if (d.unmatched.length > 0) {
          response += `❌ Nenalezeno (${d.unmatched.length}):\n` +
            d.unmatched.map((n: string) => `• ${n}`).join('\n');
        }
        return response || 'Žádné produkty.';
      }

      case 'get_product_by_code': {
        const result = await getProductByCode(toolArgs.productCode);
        if (!result.success) return `Chyba: ${result.error}`;
        const p = result.data;
        if (!p) return `Produkt s kódem "${toolArgs.productCode}" nebyl nalezen.`;
        return `**${p.product_name}** (${p.product_code})\n` +
          `- Kategorie: ${p.category || 'N/A'}\n` +
          `- Cena: ${p.price ? `${p.price} ${p.currency}` : 'N/A'}\n` +
          `- Dostupnost: ${p.availability === 1 ? '✅' : '❌'}\n` +
          `- Popis: ${p.description_short || 'Bez popisu'}`;
      }

      case 'get_database_stats': {
        const result = await getDatabaseStats();
        if (!result.success) return `Chyba: ${result.error}`;
        const d = result.data;
        return `Celkem produktů: ${d.celkem_produktu} | Kategorií: ${d.celkem_kategorii}\n\nTop 10 kategorií:\n` +
          d.kategorie.slice(0, 10).map((c: any) =>
            `• ${c.category}: ${c.total} produktů (${c.available} dostupných)`
          ).join('\n');
      }

      default:
        return `Neznámý nástroj: ${toolName}`;
    }
  } catch (err) {
    return `Chyba nástroje ${toolName}: ${err instanceof Error ? err.message : String(err)}`;
  }
}

// ============================================================================
// HLAVNÍ FUNKCE AGENTA - nativní tool calling loop
// ============================================================================

export async function processFeedAgentMessage(
  userMessage: string,
  conversationHistory: FeedAgentMessage[] = []
): Promise<FeedAgentResponse> {
  try {
    // Sestavení messages z historie
    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversationHistory.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      })),
      { role: 'user', content: userMessage }
    ];

    // Agentic loop - max 5 iterací
    const MAX_ITERATIONS = 5;

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const data = await callEdgeFunction(messages);

      const choice = data?.choices?.[0];
      if (!choice) throw new Error('OpenRouter nevrátil žádnou odpověď');

      const assistantMessage = choice.message;
      const toolCalls: any[] = assistantMessage?.tool_calls || [];

      // Přidáme assistant zprávu do messages (vždy)
      messages.push({
        role: 'assistant',
        content: assistantMessage?.content || null,
        tool_calls: toolCalls.length > 0 ? toolCalls : undefined
      });

      // Pokud žádné tool_calls → finální odpověď
      if (toolCalls.length === 0) {
        return {
          success: true,
          message: assistantMessage?.content || 'Bez odpovědi.'
        };
      }

      // Spustíme každý tool_call a přidáme výsledky jako tool messages
      for (const toolCall of toolCalls) {
        const toolName = toolCall.function?.name;
        let toolArgs: any = {};
        try {
          toolArgs = typeof toolCall.function?.arguments === 'string'
            ? JSON.parse(toolCall.function.arguments)
            : toolCall.function?.arguments || {};
        } catch {
          toolArgs = {};
        }

        const toolResult = await executeTool(toolName, toolArgs);

        messages.push({
          role: 'tool',
          content: toolResult,
          tool_call_id: toolCall.id,
          name: toolName
        });
      }
    }

    return {
      success: false,
      message: 'Dosažen maximální počet iterací.',
      error: 'MAX_ITERATIONS_REACHED'
    };

  } catch (error) {
    console.error('Feed Agent Error:', error);
    return {
      success: false,
      message: `Chyba: ${error instanceof Error ? error.message : String(error)}`,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export function resetFeedAgent() {
  // Stateless
}
