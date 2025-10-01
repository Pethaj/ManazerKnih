import { supabase } from '../lib/supabase';

// TypeScript typy pro nastavení chatbotů
export interface Category {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface PublicationType {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Label {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface ChatbotSettings {
  id: string;
  chatbot_id: string;
  chatbot_name: string;
  description?: string;
  product_recommendations: boolean;
  book_database: boolean;
  allowed_categories: string[];
  allowed_publication_types: string[];
  allowed_labels: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface ChatbotSettingsWithDetails {
  id: string;
  chatbot_id: string;
  chatbot_name: string;
  description?: string;
  product_recommendations: boolean;
  book_database: boolean;
  allowed_categories: Category[];
  allowed_publication_types: PublicationType[];
  allowed_labels: Label[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateChatbotSettingsData {
  chatbot_id: string;
  chatbot_name: string;
  description?: string;
  product_recommendations?: boolean;
  book_database?: boolean;
  allowed_categories?: string[];
  allowed_publication_types?: string[];
  allowed_labels?: string[];
  is_active?: boolean;
}

export interface UpdateChatbotSettingsData {
  chatbot_name?: string;
  description?: string;
  product_recommendations?: boolean;
  book_database?: boolean;
  allowed_categories?: string[];
  allowed_publication_types?: string[];
  allowed_labels?: string[];
  is_active?: boolean;
}

/**
 * Service pro správu nastavení chatbotů
 */
export class ChatbotSettingsService {
  /**
   * Ověří existenci tabulky chatbot_settings v databázi
   */
  static async checkTableExists(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('chatbot_settings')
        .select('count(*)', { count: 'exact', head: true });
      
      return !error;
    } catch (err) {
      console.error('Tabulka chatbot_settings neexistuje:', err);
      return false;
    }
  }

  /**
   * Získá všechny dostupné kategorie
   */
  static async getCategories(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (error) {
      console.error('Chyba při načítání kategorií:', error);
      throw new Error('Nepodařilo se načíst kategorie');
    }

    return data || [];
  }

  /**
   * Získá všechny dostupné typy publikací
   */
  static async getPublicationTypes(): Promise<PublicationType[]> {
    const { data, error } = await supabase
      .from('publication_types')
      .select('*')
      .order('name');

    if (error) {
      console.error('Chyba při načítání typů publikací:', error);
      throw new Error('Nepodařilo se načíst typy publikací');
    }

    return data || [];
  }

  /**
   * Získá všechny dostupné štítky
   */
  static async getLabels(): Promise<Label[]> {
    const { data, error } = await supabase
      .from('labels')
      .select('*')
      .order('name');

    if (error) {
      console.error('Chyba při načítání štítků:', error);
      throw new Error('Nepodařilo se načíst štítky');
    }

    return data || [];
  }

  /**
   * Získá všechna nastavení chatbotů
   */
  static async getAllChatbotSettings(): Promise<ChatbotSettings[]> {
    const { data, error } = await supabase
      .from('chatbot_settings')
      .select('*')
      .order('chatbot_name');

    if (error) {
      console.error('Chyba při načítání nastavení chatbotů:', error);
      throw new Error('Nepodařilo se načíst nastavení chatbotů');
    }

    return data || [];
  }

  /**
   * Získá nastavení konkrétního chatbota podle ID
   */
  static async getChatbotSettings(chatbotId: string): Promise<ChatbotSettings | null> {
    const { data, error } = await supabase
      .from('chatbot_settings')
      .select('*')
      .eq('chatbot_id', chatbotId)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Záznam nenalezen
        return null;
      }
      console.error('Chyba při načítání nastavení chatbota:', error);
      throw new Error('Nepodařilo se načíst nastavení chatbota');
    }

    return data;
  }

  /**
   * Získá podrobná nastavení chatbota s načtenými detaily kategorií a typů publikací
   */
  static async getChatbotSettingsWithDetails(chatbotId: string): Promise<ChatbotSettingsWithDetails | null> {
    const settings = await this.getChatbotSettings(chatbotId);
    if (!settings) {
      return null;
    }

    // Načti kategorie
    const categories = await this.getCategoriesByIds(settings.allowed_categories);
    const publicationTypes = await this.getPublicationTypesByIds(settings.allowed_publication_types);
    const labels = await this.getLabelsByIds(settings.allowed_labels);

    return {
      ...settings,
      allowed_categories: categories,
      allowed_publication_types: publicationTypes,
      allowed_labels: labels,
    };
  }

  /**
   * Získá kategorie podle jejich ID
   */
  static async getCategoriesByIds(categoryIds: string[]): Promise<Category[]> {
    if (categoryIds.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .in('id', categoryIds)
      .order('name');

    if (error) {
      console.error('Chyba při načítání kategorií podle ID:', error);
      throw new Error('Nepodařilo se načíst kategorie');
    }

    return data || [];
  }

  /**
   * Získá typy publikací podle jejich ID
   */
  static async getPublicationTypesByIds(publicationTypeIds: string[]): Promise<PublicationType[]> {
    if (publicationTypeIds.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from('publication_types')
      .select('*')
      .in('id', publicationTypeIds)
      .order('name');

    if (error) {
      console.error('Chyba při načítání typů publikací podle ID:', error);
      throw new Error('Nepodařilo se načíst typy publikací');
    }

    return data || [];
  }

  /**
   * Získá štítky podle jejich ID
   */
  static async getLabelsByIds(labelIds: string[]): Promise<Label[]> {
    if (labelIds.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from('labels')
      .select('*')
      .in('id', labelIds)
      .order('name');

    if (error) {
      console.error('Chyba při načítání štítků podle ID:', error);
      throw new Error('Nepodařilo se načíst štítky');
    }

    return data || [];
  }

  /**
   * Vytvoří nové nastavení chatbota
   */
  static async createChatbotSettings(settingsData: CreateChatbotSettingsData): Promise<ChatbotSettings> {
    const { data, error } = await supabase
      .from('chatbot_settings')
      .insert([settingsData])
      .select()
      .single();

    if (error) {
      console.error('Chyba při vytváření nastavení chatbota:', error);
      throw new Error('Nepodařilo se vytvořit nastavení chatbota');
    }

    return data;
  }

  /**
   * Aktualizuje nastavení chatbota
   */
  static async updateChatbotSettings(
    chatbotId: string, 
    settingsData: UpdateChatbotSettingsData
  ): Promise<ChatbotSettings> {
    console.log(`💾 Aktualizuji nastavení chatbota: ${chatbotId}`);
    console.log('📝 Data k aktualizaci:', settingsData);

    // Aktualizujeme záznam
    const { data, error } = await supabase
      .from('chatbot_settings')
      .update(settingsData)
      .eq('chatbot_id', chatbotId)
      .select()
      .single();

    if (error) {
      console.error('❌ Chyba při aktualizaci nastavení chatbota:', error);
      console.error('🔍 Podrobnosti chyby:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      console.error('📊 Data k aktualizaci:', settingsData);
      
      // Zkusme najít chatbota, abychom věděli, zda existuje
      const { data: existingData } = await supabase
        .from('chatbot_settings')
        .select('chatbot_id, chatbot_name')
        .eq('chatbot_id', chatbotId);
        
      console.log('🔍 Hledám chatbota v databázi:', existingData);
      
      if (!existingData || existingData.length === 0) {
        throw new Error(`Chatbot s ID '${chatbotId}' neexistuje v databázi. Spusťte SQL script pro vytvoření chatbotů.`);
      }
      
      throw new Error(`Nepodařilo se aktualizovat nastavení chatbota: ${error.message}`);
    }

    if (!data) {
      throw new Error('Aktualizace proběhla, ale žádná data nebyla vrácena');
    }

    console.log('✅ Chatbot úspěšně aktualizován:', data);
    return data;
  }

  /**
   * Smaže nastavení chatbota (pouze deaktivuje)
   */
  static async deleteChatbotSettings(chatbotId: string): Promise<void> {
    const { error } = await supabase
      .from('chatbot_settings')
      .update({ is_active: false })
      .eq('chatbot_id', chatbotId);

    if (error) {
      console.error('Chyba při mazání nastavení chatbota:', error);
      throw new Error('Nepodařilo se smazat nastavení chatbota');
    }
  }

  /**
   * Ověří, zda má chatbot přístup ke kategorii
   */
  static async chatbotHasAccessToCategory(chatbotId: string, categoryId: string): Promise<boolean> {
    const { data, error } = await supabase
      .rpc('chatbot_has_access_to_category', {
        chatbot_id_param: chatbotId,
        category_id_param: categoryId
      });

    if (error) {
      console.error('Chyba při ověřování přístupu ke kategorii:', error);
      return false;
    }

    return data || false;
  }

  /**
   * Ověří, zda má chatbot přístup k typu publikace
   */
  static async chatbotHasAccessToPublicationType(chatbotId: string, publicationTypeId: string): Promise<boolean> {
    const { data, error } = await supabase
      .rpc('chatbot_has_access_to_publication_type', {
        chatbot_id_param: chatbotId,
        publication_type_id_param: publicationTypeId
      });

    if (error) {
      console.error('Chyba při ověřování přístupu k typu publikace:', error);
      return false;
    }

    return data || false;
  }

  /**
   * Získá kategorie dostupné pro chatbota
   */
  static async getChatbotAllowedCategories(chatbotId: string): Promise<Category[]> {
    const { data, error } = await supabase
      .rpc('get_chatbot_allowed_categories', {
        chatbot_id_param: chatbotId
      });

    if (error) {
      console.error('Chyba při načítání povolených kategorií pro chatbota:', error);
      throw new Error('Nepodařilo se načíst povolené kategorie');
    }

    return data || [];
  }

  /**
   * Získá typy publikací dostupné pro chatbota
   */
  static async getChatbotAllowedPublicationTypes(chatbotId: string): Promise<PublicationType[]> {
    const { data, error } = await supabase
      .rpc('get_chatbot_allowed_publication_types', {
        chatbot_id_param: chatbotId
      });

    if (error) {
      console.error('Chyba při načítání povolených typů publikací pro chatbota:', error);
      throw new Error('Nepodařilo se načíst povolené typy publikací');
    }

    return data || [];
  }

  /**
   * Získá filtrace pro konkrétní chatbota ve formátu kompatibilním s SanaChat
   */
  static async getChatbotFilters(chatbotId: string): Promise<{
    categories: Category[];
    publicationTypes: PublicationType[];
    labels: Label[];
    settings: {
      product_recommendations: boolean;
      book_database: boolean;
    };
  }> {
    const settings = await this.getChatbotSettingsWithDetails(chatbotId);
    
    if (!settings) {
      // Pokud nastavení neexistuje, vrátí prázdné filtrace
      return {
        categories: [],
        publicationTypes: [],
        labels: [],
        settings: {
          product_recommendations: false,
          book_database: true,
        },
      };
    }

    return {
      categories: settings.allowed_categories,
      publicationTypes: settings.allowed_publication_types,
      labels: settings.allowed_labels,
      settings: {
        product_recommendations: settings.product_recommendations,
        book_database: settings.book_database,
      },
    };
  }
}

export default ChatbotSettingsService;
