/**
 * Chatbot Settings Service - Zástupná implementace
 * Tato služba spravuje nastavení chatbota
 */

import { supabase } from '../lib/supabase';

export interface ChatbotSettings {
  id?: string;
  name: string;
  systemPrompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export class ChatbotSettingsService {
  static async getAllSettings(): Promise<ChatbotSettings[]> {
    try {
      const { data, error } = await supabase
        .from('chatbot_settings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Chyba při načítání nastavení chatbota:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Chyba při načítání nastavení chatbota:', error);
      return [];
    }
  }

  static async getActiveSettings(): Promise<ChatbotSettings | null> {
    try {
      const { data, error } = await supabase
        .from('chatbot_settings')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Chyba při načítání aktivního nastavení:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Chyba při načítání aktivního nastavení:', error);
      return null;
    }
  }

  static async createSettings(settings: Omit<ChatbotSettings, 'id' | 'createdAt' | 'updatedAt'>): Promise<ChatbotSettings | null> {
    try {
      const { data, error } = await supabase
        .from('chatbot_settings')
        .insert([settings])
        .select()
        .single();

      if (error) {
        console.error('Chyba při vytváření nastavení:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Chyba při vytváření nastavení:', error);
      return null;
    }
  }

  static async updateSettings(id: string, settings: Partial<ChatbotSettings>): Promise<ChatbotSettings | null> {
    try {
      const { data, error } = await supabase
        .from('chatbot_settings')
        .update(settings)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Chyba při aktualizaci nastavení:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Chyba při aktualizaci nastavení:', error);
      return null;
    }
  }

  static async deleteSettings(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('chatbot_settings')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Chyba při mazání nastavení:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Chyba při mazání nastavení:', error);
      return false;
    }
  }

  static async setActive(id: string): Promise<boolean> {
    try {
      // Nejprve deaktivujeme všechna nastavení
      await supabase
        .from('chatbot_settings')
        .update({ is_active: false })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all

      // Pak aktivujeme vybrané nastavení
      const { error } = await supabase
        .from('chatbot_settings')
        .update({ is_active: true })
        .eq('id', id);

      if (error) {
        console.error('Chyba při aktivaci nastavení:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Chyba při aktivaci nastavení:', error);
      return false;
    }
  }
}


