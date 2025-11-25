/**
 * Chatbot Settings Service
 * Služba pro správu nastavení chatbotů a jejich filtrací
 */

import { supabase } from '../lib/supabase';

// Interface pro nastavení chatbota podle databázové struktury
export interface ChatbotSettings {
  id?: string;
  chatbot_id: string;
  chatbot_name: string;
  description?: string;
  product_recommendations: boolean;
  book_database: boolean;
  allowed_categories: string[];
  allowed_publication_types: string[];
  allowed_labels: string[];
  is_active: boolean;
  // Nová nastavení pro feed zdroje
  use_feed_1?: boolean;
  use_feed_2?: boolean;
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

// Interface pro vytvoření nového chatbota
export interface CreateChatbotSettingsData {
  chatbot_id: string;
  chatbot_name: string;
  description?: string;
  product_recommendations: boolean;
  book_database: boolean;
  allowed_categories: string[];
  allowed_publication_types: string[];
  allowed_labels: string[];
  is_active: boolean;
  // Nová nastavení pro feed zdroje
  use_feed_1?: boolean;
  use_feed_2?: boolean;
}

// Interface pro aktualizaci chatbota
export interface UpdateChatbotSettingsData {
  chatbot_name?: string;
  description?: string;
  product_recommendations?: boolean;
  book_database?: boolean;
  allowed_categories?: string[];
  allowed_publication_types?: string[];
  allowed_labels?: string[];
  is_active?: boolean;
  // Nová nastavení pro feed zdroje
  use_feed_1?: boolean;
  use_feed_2?: boolean;
}

// Interface pro filtry chatbota
export interface ChatbotFilters {
  categories: Category[];
  publicationTypes: PublicationType[];
  labels: Label[];
  productRecommendations: boolean;
  bookDatabase: boolean;
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
        console.error('Chyba při načítání nastavení chatbotů:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Chyba při načítání nastavení chatbotů:', error);
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
        console.error('Chyba při načítání nastavení chatbota:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Chyba při načítání nastavení chatbota:', error);
      return null;
    }
  }

  // Načtení nastavení chatbota s detaily (rozšířené informace)
  static async getChatbotSettingsWithDetails(chatbotId: string): Promise<ChatbotSettings | null> {
    return this.getChatbotSettings(chatbotId);
  }

  // Vytvoření nového chatbota
  static async createChatbotSettings(data: CreateChatbotSettingsData): Promise<ChatbotSettings> {
    try {
      const { data: result, error } = await supabase
        .from('chatbot_settings')
        .insert([data])
        .select()
        .single();

      if (error) {
        console.error('Chyba při vytváření chatbota:', error);
        throw error;
      }

      return result;
    } catch (error) {
      console.error('Chyba při vytváření chatbota:', error);
      throw error;
    }
  }

  // Aktualizace nastavení chatbota
  static async updateChatbotSettings(chatbotId: string, data: UpdateChatbotSettingsData): Promise<ChatbotSettings> {
    try {
      const { data: result, error } = await supabase
        .from('chatbot_settings')
        .update(data)
        .eq('chatbot_id', chatbotId)
        .select()
        .single();

      if (error) {
        console.error('Chyba při aktualizaci chatbota:', error);
        throw error;
      }

      return result;
    } catch (error) {
      console.error('Chyba při aktualizaci chatbota:', error);
      throw error;
    }
  }

  // Smazání chatbota
  static async deleteChatbotSettings(chatbotId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('chatbot_settings')
        .delete()
        .eq('chatbot_id', chatbotId);

      if (error) {
        console.error('Chyba při mazání chatbota:', error);
        throw error;
      }
    } catch (error) {
      console.error('Chyba při mazání chatbota:', error);
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
        console.error('Chyba při načítání kategorií:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Chyba při načítání kategorií:', error);
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
        console.error('Chyba při načítání typů publikací:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Chyba při načítání typů publikací:', error);
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
        console.error('Chyba při načítání štítků:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Chyba při načítání štítků:', error);
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
          console.error('Chyba při načítání kategorií:', catError);
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
          console.error('Chyba při načítání typů publikací:', pubError);
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
          console.error('Chyba při načítání štítků:', labelError);
        } else {
          labels.push(...(labelData || []));
        }
      }

      return {
        categories,
        publicationTypes,
        labels,
        productRecommendations: settings.product_recommendations,
        bookDatabase: settings.book_database,
      };
    } catch (error) {
      console.error('Chyba při načítání filtrů chatbota:', error);
      throw error;
    }
  }

  // Aktivace/deaktivace chatbota
  static async setActive(chatbotId: string, isActive: boolean): Promise<void> {
    try {
      const { error } = await supabase
        .from('chatbot_settings')
        .update({ is_active: isActive })
        .eq('chatbot_id', chatbotId);

      if (error) {
        console.error('Chyba při změně aktivace chatbota:', error);
        throw error;
      }
    } catch (error) {
      console.error('Chyba při změně aktivace chatbota:', error);
      throw error;
    }
  }
}




