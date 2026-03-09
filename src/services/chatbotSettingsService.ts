/**
 * Chatbot Settings Service
 * Služba pro správu nastavení chatbotů a jejich filtrací
 */

import { supabase } from '../lib/supabase';

// Edge funkce URL pro admin operace
const EDGE_FUNCTION_URL = 'https://modopafybeslbcqjxsve.supabase.co/functions/v1/update-chatbot-settings';

// Interface pro nastavení chatbota podle databázové struktury
export interface ChatbotSettings {
  id?: string;
  chatbot_id: string;
  chatbot_name: string;
  description?: string;
  product_recommendations: boolean;
  product_button_recommendations: boolean;  // 🆕 Produktové doporučení na tlačítko
  inline_product_links?: boolean;  // 🆕 Inline produktové linky (ChatGPT styl)
  book_database: boolean;
  allowed_categories: string[];
  allowed_publication_types: string[];
  allowed_labels: string[];
  is_active: boolean;
  is_default_web_chatbot?: boolean;  // 🆕 Zobrazit v bublině na webu
  webhook_url?: string;  // 🆕 N8N webhook URL pro tento chatbot
  // Nová nastavení pro feed zdroje
  use_feed_1?: boolean;
  use_feed_2?: boolean;
  // 🆕 Nastavení produktového routeru a manuálního funnelu
  enable_product_router?: boolean;  // Zapnutí/vypnutí automatického produktového routeru
  enable_manual_funnel?: boolean;   // Zapnutí manuálního funnel spouštěče (tlačítko místo calloutu)
  // 🆕 Nastavení sumarizace historie
  summarize_history?: boolean;      // Zapnutí automatické sumarizace historie pro N8N webhook
  // 🆕 Filtrování produktových kategorií
  allowed_product_categories?: string[];  // Povolené kategorie z product_feed_2 pro Product Pills
  // 🆕 Grupování produktů podle kategorií v tabulce
  group_products_by_category?: boolean;  // Zobrazit produkty rozdělené podle kategorií
  // 🆕 Zobrazování zdrojů v chatbotu
  show_sources?: boolean;  // Zobrazovat zdroje v odpovědích chatbota
  // 🆕 Párování kombinací produktů
  enable_product_pairing?: boolean;  // Automatické párování produktů podle tabulky leceni
  // 🆕 Vyhledávač produktů (Feed Agent)
  enable_product_search?: boolean;  // Povolení přepínání mezi AI chatem a vyhledávačem produktů
  // 🆕 Filtrování látek podle problému (EO Směsi)
  filter_ingredients_by_problem?: boolean;  // Zobrazit látky z tabulky ingredient-solution podle detekovaného problému
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

// Interface pro kategorie
export interface Category {
  id: string;
  name: string;
}

// Interface pro typy publikací
export interface PublicationType {
  id: string;
  name: string;
  description?: string;
}

// Interface pro štítky
export interface Label {
  id: string;
  name: string;
}

// Interface pro produktové kategorie z product_feed_2
export interface ProductCategory {
  category: string;
  product_count: number;
}

// Interface pro vytvoření nového chatbota
export interface CreateChatbotSettingsData {
  chatbot_id: string;
  chatbot_name: string;
  description?: string;
  product_recommendations: boolean;
  product_button_recommendations: boolean;  // 🆕 Produktové doporučení na tlačítko
  inline_product_links?: boolean;  // 🆕 Inline produktové linky (ChatGPT styl)
  book_database: boolean;
  allowed_categories: string[];
  allowed_publication_types: string[];
  allowed_labels: string[];
  is_active: boolean;
  webhook_url?: string;  // 🆕 N8N webhook URL pro tento chatbot
  // Nová nastavení pro feed zdroje
  use_feed_1?: boolean;
  use_feed_2?: boolean;
  // 🆕 Nastavení produktového routeru a manuálního funnelu
  enable_product_router?: boolean;
  enable_manual_funnel?: boolean;
  // 🆕 Nastavení sumarizace historie
  summarize_history?: boolean;
  // 🆕 Filtrování produktových kategorií
  allowed_product_categories?: string[];
  // 🆕 Grupování produktů podle kategorií
  group_products_by_category?: boolean;
  // 🆕 Zobrazování zdrojů v chatbotu
  show_sources?: boolean;
  // 🆕 Párování kombinací produktů
  enable_product_pairing?: boolean;
  // 🆕 Vyhledávač produktů (Feed Agent)
  enable_product_search?: boolean;
  // 🆕 Filtrování látek podle problému (EO Směsi)
  filter_ingredients_by_problem?: boolean;
}

// Interface pro aktualizaci chatbota
export interface UpdateChatbotSettingsData {
  chatbot_name?: string;
  description?: string;
  product_recommendations?: boolean;
  product_button_recommendations?: boolean;  // 🆕 Produktové doporučení na tlačítko
  inline_product_links?: boolean;  // 🆕 Inline produktové linky (ChatGPT styl)
  book_database?: boolean;
  allowed_categories?: string[];
  allowed_publication_types?: string[];
  allowed_labels?: string[];
  is_active?: boolean;
  is_default_web_chatbot?: boolean;  // 🆕 Zobrazit v bublině na webu
  webhook_url?: string;  // 🆕 N8N webhook URL pro tento chatbot
  // Nová nastavení pro feed zdroje
  use_feed_1?: boolean;
  use_feed_2?: boolean;
  // 🆕 Nastavení produktového routeru a manuálního funnelu
  enable_product_router?: boolean;
  enable_manual_funnel?: boolean;
  // 🆕 Nastavení sumarizace historie
  summarize_history?: boolean;
  // 🆕 Filtrování produktových kategorií
  allowed_product_categories?: string[];
  // 🆕 Grupování produktů podle kategorií
  group_products_by_category?: boolean;
  // 🆕 Zobrazování zdrojů v chatbotu
  show_sources?: boolean;
  // 🆕 Párování kombinací produktů
  enable_product_pairing?: boolean;
  // 🆕 Vyhledávač produktů (Feed Agent)
  enable_product_search?: boolean;
  // 🆕 Filtrování látek podle problému (EO Směsi)
  filter_ingredients_by_problem?: boolean;
}

// Interface pro filtry chatbota
export interface ChatbotFilters {
  categories: Category[];
  publicationTypes: PublicationType[];
  labels: Label[];
  productRecommendations: boolean;
  productButtonRecommendations: boolean;  // 🆕 Produktové doporučení na tlačítko
  inlineProductLinks: boolean;  // 🆕 Inline produktové linky (ChatGPT styl)
  bookDatabase: boolean;
  useFeed1: boolean;  // 🆕 Použít Feed 1 (zbozi.xml)
  useFeed2: boolean;  // 🆕 Použít Feed 2 (Product Feed 2)
  webhookUrl?: string;  // 🆕 N8N webhook URL pro tento chatbot
  // 🆕 Nastavení produktového routeru a manuálního funnelu
  enableProductRouter: boolean;  // Zapnutí/vypnutí automatického produktového routeru
  enableManualFunnel: boolean;   // Zapnutí manuálního funnel spouštěče
  // 🆕 Nastavení sumarizace historie
  summarizeHistory: boolean;     // Automatická sumarizace historie pro N8N webhook
  // 🆕 Filtrování produktových kategorií
  allowedProductCategories: string[];  // Povolené kategorie z product_feed_2
  // 🆕 Grupování produktů podle kategorií
  groupProductsByCategory: boolean;  // Zobrazit produkty rozdělené podle kategorií
  // 🆕 Zobrazování zdrojů v chatbotu
  showSources: boolean;  // Zobrazovat zdroje v odpovědích
  // 🆕 Párování kombinací produktů
  enableProductPairing: boolean;  // Automatické párování produktů podle tabulky leceni
  // 🆕 Vyhledávač produktů (Feed Agent)
  enableProductSearch: boolean;  // Povolení přepínání mezi AI chatem a vyhledávačem produktů
  // 🆕 Filtrování látek podle problému (EO Směsi)
  filterIngredientsByProblem: boolean;  // Zobrazit látky z tabulky ingredient-solution podle detekovaného problému
}

export class ChatbotSettingsService {
  // Načtení všech nastavení chatbotů
  static async getAllChatbotSettings(): Promise<ChatbotSettings[]> {
    try {
      const { data, error } = await supabase
        .from('chatbot_settings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // 🔍 DEBUG: Vypiš webhook_url pro každý chatbot

      return data || [];
    } catch (error) {
      throw error;
    }
  }

  // Načtení nastavení konkrétního chatbota
  static async getChatbotSettings(chatbotId: string): Promise<ChatbotSettings | null> {
    try {
      const { data, error } = await supabase
        .from('chatbot_settings')
        .select('*')
        .eq('chatbot_id', chatbotId)
        .single();

      if (error) {
        return null;
      }
      return data;
    } catch (error) {
      return null;
    }
  }

  // Načtení nastavení chatbota s detaily (rozšířené informace)
  static async getChatbotSettingsWithDetails(chatbotId: string): Promise<ChatbotSettings | null> {
    return this.getChatbotSettings(chatbotId);
  }

  // 🆕 Načtení výchozího webového chatbota (pro bublinu na webu)
  static async getDefaultWebChatbot(): Promise<ChatbotSettings | null> {
    try {
      
      const { data, error } = await supabase
        .from('chatbot_settings')
        .select('*')
        .eq('is_default_web_chatbot', true)
        .eq('is_active', true)
        .single();

      if (error) {
        // Fallback na sana_chat, pokud není nastaven žádný výchozí
        return this.getChatbotSettings('sana_chat');
      }

      return data;
    } catch (error) {
      // Fallback na sana_chat
      return this.getChatbotSettings('sana_chat');
    }
  }

  // 🆕 Načtení všech aktivních chatbotů pro selector
  static async getActiveChatbots(): Promise<ChatbotSettings[]> {
    try {
      const { data, error } = await supabase
        .from('chatbot_settings')
        .select('*')
        .eq('is_active', true)
        .order('chatbot_name', { ascending: true });

      if (error) {
        throw error;
      }
      return data || [];
    } catch (error) {
      return [];
    }
  }

  // Vytvoření nového chatbota
  static async createChatbotSettings(data: CreateChatbotSettingsData): Promise<ChatbotSettings> {
    try {
      // Pro CREATE použijeme běžný klient - RLS politika by měla povolit INSERT
      const { data: result, error } = await supabase
        .from('chatbot_settings')
        .insert([data])
        .select()
        .single();

      if (error) {
        throw error;
      }

      return result;
    } catch (error) {
      throw error;
    }
  }

  // Aktualizace nastavení chatbota
  static async updateChatbotSettings(chatbotId: string, data: UpdateChatbotSettingsData): Promise<ChatbotSettings> {
    try {
      // Proveď UPDATE
      const { data: updateResult, error: updateError } = await supabase
        .from('chatbot_settings')
        .update(data)
        .eq('chatbot_id', chatbotId)
        .select()
        .single();

      if (updateError) {
        throw new Error(
          `UPDATE selhal: ${updateError.message}\n\n` +
          `💡 Řešení:\n` +
          `1. Zkontrolujte, zda jste přihlášeni\n` +
          `2. Spusťte SQL script pro opravu RLS politik (viz dokumentace)`
        );
      }

      if (!updateResult) {
        throw new Error('UPDATE nevrátil žádná data');
      }
      return updateResult;
    } catch (error) {
      throw error;
    }
  }

  // Smazání chatbota
  static async deleteChatbotSettings(chatbotId: string): Promise<void> {
    try {
      // Pro DELETE použijeme běžný klient - RLS politika by měla povolit DELETE
      const { error } = await supabase
        .from('chatbot_settings')
        .delete()
        .eq('chatbot_id', chatbotId);

      if (error) {
        throw error;
      }
    } catch (error) {
      throw error;
    }
  }

  // Načtení všech kategorií
  static async getCategories(): Promise<Category[]> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      throw error;
    }
  }

  // Načtení všech typů publikací
  static async getPublicationTypes(): Promise<PublicationType[]> {
    try {
      const { data, error } = await supabase
        .from('publication_types')
        .select('id, name, description')
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      throw error;
    }
  }

  // Načtení všech štítků
  static async getLabels(): Promise<Label[]> {
    try {
      const { data, error } = await supabase
        .from('labels')
        .select('id, name')
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      throw error;
    }
  }

  // 🆕 Načtení všech produktových kategorií z product_feed_2
  static async getProductCategories(): Promise<ProductCategory[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_product_feed_2_categories');

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      throw error;
    }
  }

  // Načtení filtrů pro konkrétního chatbota (s rozšířenými informacemi)
  static async getChatbotFilters(chatbotId: string): Promise<ChatbotFilters> {
    try {
      // Načti nastavení chatbota
      const settings = await this.getChatbotSettings(chatbotId);
      if (!settings) {
        throw new Error(`Chatbot s ID "${chatbotId}" nebyl nalezen`);
      }

      // Načti kategorie, které má chatbot povolené
      const categories: Category[] = [];
      if (settings.allowed_categories.length > 0) {
        const { data: catData, error: catError } = await supabase
          .from('categories')
          .select('id, name')
          .in('id', settings.allowed_categories);

        if (catError) {
        } else {
          categories.push(...(catData || []));
        }
      }

      // Načti typy publikací, které má chatbot povolené
      const publicationTypes: PublicationType[] = [];
      if (settings.allowed_publication_types.length > 0) {
        const { data: pubData, error: pubError } = await supabase
          .from('publication_types')
          .select('id, name, description')
          .in('id', settings.allowed_publication_types);

        if (pubError) {
        } else {
          publicationTypes.push(...(pubData || []));
        }
      }

      // Načti štítky, které má chatbot povolené
      const labels: Label[] = [];
      if (settings.allowed_labels.length > 0) {
        const { data: labelData, error: labelError } = await supabase
          .from('labels')
          .select('id, name')
          .in('id', settings.allowed_labels);

        if (labelError) {
        } else {
          labels.push(...(labelData || []));
        }
      }

      return {
        categories,
        publicationTypes,
        labels,
        productRecommendations: settings.product_recommendations,
        productButtonRecommendations: settings.product_button_recommendations,
        inlineProductLinks: settings.inline_product_links || false,  // 🆕 Inline produktové linky
        bookDatabase: settings.book_database,
        useFeed1: settings.use_feed_1 !== false, // default true
        useFeed2: settings.use_feed_2 !== false, // default true
        webhookUrl: settings.webhook_url,  // 🆕 N8N webhook URL
        // 🆕 Nastavení produktového routeru a manuálního funnelu
        enableProductRouter: settings.enable_product_router !== false, // default true
        enableManualFunnel: settings.enable_manual_funnel === true,    // default false
        // 🆕 Nastavení sumarizace historie
        summarizeHistory: settings.summarize_history === true,         // default false
        // 🆕 Filtrování produktových kategorií
        allowedProductCategories: settings.allowed_product_categories || [], // default všechny
        // 🆕 Grupování produktů podle kategorií
        groupProductsByCategory: settings.group_products_by_category === true, // default false
        // 🆕 Zobrazování zdrojů
        showSources: settings.show_sources !== false, // default true
        // 🔗 Párování kombinací produktů
        enableProductPairing: settings.enable_product_pairing === true, // default false
        // 🔍 Vyhledávač produktů (Feed Agent)
        enableProductSearch: settings.enable_product_search === true, // default false
        // 🌿 Filtrování látek podle problému (EO Směsi)
        filterIngredientsByProblem: settings.filter_ingredients_by_problem === true, // default false
      };
    } catch (error) {
      throw error;
    }
  }

  // Aktivace/deaktivace chatbota
  static async setActive(chatbotId: string, isActive: boolean): Promise<void> {
    try {
      // Použijeme edge funkci pro konzistenci
      await this.updateChatbotSettings(chatbotId, { is_active: isActive });
    } catch (error) {
      throw error;
    }
  }
}




