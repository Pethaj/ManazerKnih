/**
 * Chat History Service
 * ============================================================================
 * Service pro ukládání a načítání historie chatových konverzací ze Supabase
 * ============================================================================
 * 
 * Struktura:
 * - Každá zpráva (user i bot) je uložena jako samostatný řádek v tabulce chat_messages
 * - Session se identifikuje přes session_id (generovaný na frontendu)
 * - Metadata (filtry) se ukládají jen u user zpráv
 * - Bot zprávy mají metadata = null (zdědí z předchozí user zprávy)
 */

import { supabase } from '../lib/supabase';

// ============================================================================
// INTERFACES
// ============================================================================

export interface ChatHistoryMessage {
  id?: string;  // UUID, generuje Supabase
  session_id: string;
  user_id?: string | null;
  chatbot_id: string;
  role: 'user' | 'bot';
  message_text: string;
  message_data?: {
    sources?: Array<{ uri: string; title: string }>;
    productRecommendations?: any[];
    matchedProducts?: any[];
    isFunnelMessage?: boolean;
    funnelProducts?: any[];
    symptomList?: string[];
    isUpdateFunnel?: boolean;
    hasCallout?: boolean;
  };
  conversation_metadata?: {
    categories?: string[];
    labels?: string[];
    publication_types?: string[];
  } | null;
  created_at?: string;
}

export interface ChatSession {
  session_id: string;
  chatbot_id: string;
  first_message: string;
  message_count: number;
  started_at: string;
  last_message_at: string;
}

// ============================================================================
// UKLÁDÁNÍ ZPRÁV
// ============================================================================

/**
 * Uloží jednu zprávu do historie
 * @param message - Zpráva k uložení
 * @returns { error } - null pokud úspěch, jinak error message
 */
export async function saveMessage(
  message: ChatHistoryMessage
): Promise<{ error: string | null }> {
  try {
    console.log('💾 [ChatHistory] Ukládám zprávu do Supabase:', {
      session_id: message.session_id,
      role: message.role,
      text_length: message.message_text.length,
      has_metadata: !!message.conversation_metadata,
      has_message_data: !!message.message_data
    });

    // Připravíme data pro uložení - ukládáme JEN existující pole
    const dataToSave: any = {
      session_id: message.session_id,
      user_id: message.user_id || null,
      chatbot_id: message.chatbot_id,
      role: message.role,
      message_text: message.message_text,
    };

    // Message data - ukládáme jen pokud existují neprázdná data
    if (message.message_data && Object.keys(message.message_data).length > 0) {
      // Filtrujeme jen existující pole (ne undefined, ne prázdné arrays)
      const filteredData: any = {};
      
      if (message.message_data.sources && message.message_data.sources.length > 0) {
        filteredData.sources = message.message_data.sources;
      }
      if (message.message_data.productRecommendations && message.message_data.productRecommendations.length > 0) {
        filteredData.productRecommendations = message.message_data.productRecommendations;
      }
      if (message.message_data.matchedProducts && message.message_data.matchedProducts.length > 0) {
        filteredData.matchedProducts = message.message_data.matchedProducts;
      }
      if (message.message_data.funnelProducts && message.message_data.funnelProducts.length > 0) {
        filteredData.funnelProducts = message.message_data.funnelProducts;
      }
      if (message.message_data.symptomList && message.message_data.symptomList.length > 0) {
        filteredData.symptomList = message.message_data.symptomList;
      }
      if (message.message_data.isFunnelMessage !== undefined) {
        filteredData.isFunnelMessage = message.message_data.isFunnelMessage;
      }
      if (message.message_data.isUpdateFunnel !== undefined) {
        filteredData.isUpdateFunnel = message.message_data.isUpdateFunnel;
      }
      if (message.message_data.hasCallout !== undefined) {
        filteredData.hasCallout = message.message_data.hasCallout;
      }

      if (Object.keys(filteredData).length > 0) {
        dataToSave.message_data = filteredData;
      }
    }

    // Conversation metadata - ukládáme jen u USER zpráv
    if (message.role === 'user' && message.conversation_metadata) {
      const filteredMetadata: any = {};
      
      if (message.conversation_metadata.categories && message.conversation_metadata.categories.length > 0) {
        filteredMetadata.categories = message.conversation_metadata.categories;
      }
      if (message.conversation_metadata.labels && message.conversation_metadata.labels.length > 0) {
        filteredMetadata.labels = message.conversation_metadata.labels;
      }
      if (message.conversation_metadata.publication_types && message.conversation_metadata.publication_types.length > 0) {
        filteredMetadata.publication_types = message.conversation_metadata.publication_types;
      }

      if (Object.keys(filteredMetadata).length > 0) {
        dataToSave.conversation_metadata = filteredMetadata;
      }
    }

    const { error } = await supabase
      .from('chat_messages')
      .insert([dataToSave]);

    if (error) {
      console.error('❌ [ChatHistory] Chyba při ukládání zprávy:', error);
      return { error: error.message };
    }

    console.log('✅ [ChatHistory] Zpráva úspěšně uložena');
    return { error: null };

  } catch (err) {
    console.error('❌ [ChatHistory] Neočekávaná chyba při ukládání:', err);
    return { error: err instanceof Error ? err.message : 'Neznámá chyba' };
  }
}

/**
 * Uloží user zprávu (s metadaty)
 */
export async function saveUserMessage(
  sessionId: string,
  userId: string | null,
  chatbotId: string,
  messageText: string,
  metadata?: {
    categories?: string[];
    labels?: string[];
    publication_types?: string[];
  }
): Promise<{ error: string | null }> {
  return saveMessage({
    session_id: sessionId,
    user_id: userId,
    chatbot_id: chatbotId,
    role: 'user',
    message_text: messageText,
    conversation_metadata: metadata || null,
    message_data: {}
  });
}

/**
 * Uloží bot zprávu (bez metadat, ale s message_data)
 */
export async function saveBotMessage(
  sessionId: string,
  userId: string | null,
  chatbotId: string,
  messageText: string,
  messageData?: {
    sources?: Array<{ uri: string; title: string }>;
    productRecommendations?: any[];
    matchedProducts?: any[];
    isFunnelMessage?: boolean;
    funnelProducts?: any[];
    symptomList?: string[];
    isUpdateFunnel?: boolean;
    hasCallout?: boolean;
  }
): Promise<{ error: string | null }> {
  return saveMessage({
    session_id: sessionId,
    user_id: userId,
    chatbot_id: chatbotId,
    role: 'bot',
    message_text: messageText,
    conversation_metadata: null,  // Bot zprávy NEMAJÍ metadata
    message_data: messageData || {}
  });
}

// ============================================================================
// NOVÝ SYSTÉM: UKLÁDÁNÍ PÁRU OTÁZKA-ODPOVĚĎ
// ============================================================================

/**
 * Uloží pár otázka-odpověď jako JEDEN řádek
 * @param sessionId - ID session
 * @param userId - ID uživatele (nullable)
 * @param chatbotId - ID chatbota
 * @param userQuestion - Text otázky uživatele
 * @param botAnswer - Text odpovědi bota
 * @param questionMetadata - Filtry aktivní při otázce (categories, labels, atd.)
 * @param answerData - Data z odpovědi bota (sources, products, atd.)
 * @returns { error } - null pokud úspěch, jinak error message
 */
export async function saveChatPair(
  sessionId: string,
  userId: string | null,
  chatbotId: string,
  userQuestion: string,
  botAnswer: string,
  questionMetadata?: {
    categories?: string[];
    labels?: string[];
    publication_types?: string[];
  },
  answerData?: {
    sources?: Array<{ uri: string; title: string }>;
    productRecommendations?: any[];
    products?: any[];
    matchedProducts?: any[];
    isFunnelMessage?: boolean;
    funnelProducts?: any[];
    symptomList?: string[];
    isUpdateFunnel?: boolean;
    hasCallout?: boolean;
  }
): Promise<{ error: string | null }> {
  try {
    console.log('💾 [ChatHistory] Ukládám PAR otázka-odpověď:', {
      session_id: sessionId,
      question_length: userQuestion.length,
      answer_length: botAnswer.length,
      has_metadata: !!questionMetadata,
      has_answer_data: !!answerData
    });

    // Připravíme data pro uložení
    const dataToSave: any = {
      session_id: sessionId,
      user_id: userId || null,
      chatbot_id: chatbotId,
      role: 'pair',  // Označení že jde o pár otázka-odpověď
      message_text: userQuestion,  // Otázka uživatele (pro full-text search)
    };

    // Message data - obsahuje odpověď + všechna bot data
    const messageDataToSave: any = {
      answer: botAnswer  // Odpověď bota
    };

    // Přidáme answer data (sources, products, atd.) - jen existující pole
    if (answerData) {
      if (answerData.sources && answerData.sources.length > 0) {
        messageDataToSave.sources = answerData.sources;
      }
      
      // Produkty jako separatní array
      if (answerData.products && answerData.products.length > 0) {
        messageDataToSave.products = answerData.products;
      }
      if (answerData.productRecommendations && answerData.productRecommendations.length > 0) {
        messageDataToSave.productRecommendations = answerData.productRecommendations;
      }
      if (answerData.matchedProducts && answerData.matchedProducts.length > 0) {
        messageDataToSave.matchedProducts = answerData.matchedProducts;
      }
      
      // Funnel data
      if (answerData.funnelProducts && answerData.funnelProducts.length > 0) {
        messageDataToSave.funnelProducts = answerData.funnelProducts;
      }
      if (answerData.symptomList && answerData.symptomList.length > 0) {
        messageDataToSave.symptomList = answerData.symptomList;
      }
      
      // Flags
      if (answerData.isFunnelMessage !== undefined) {
        messageDataToSave.isFunnelMessage = answerData.isFunnelMessage;
      }
      if (answerData.isUpdateFunnel !== undefined) {
        messageDataToSave.isUpdateFunnel = answerData.isUpdateFunnel;
      }
      if (answerData.hasCallout !== undefined) {
        messageDataToSave.hasCallout = answerData.hasCallout;
      }
    }

    dataToSave.message_data = messageDataToSave;

    // Question metadata (filtry od usera) - jen pokud existují
    if (questionMetadata) {
      const filteredMetadata: any = {};
      
      if (questionMetadata.categories && questionMetadata.categories.length > 0) {
        filteredMetadata.categories = questionMetadata.categories;
      }
      if (questionMetadata.labels && questionMetadata.labels.length > 0) {
        filteredMetadata.labels = questionMetadata.labels;
      }
      if (questionMetadata.publication_types && questionMetadata.publication_types.length > 0) {
        filteredMetadata.publication_types = questionMetadata.publication_types;
      }

      if (Object.keys(filteredMetadata).length > 0) {
        dataToSave.conversation_metadata = filteredMetadata;
      }
    }

    const { error } = await supabase
      .from('chat_messages')
      .insert([dataToSave]);

    if (error) {
      console.error('❌ [ChatHistory] Chyba při ukládání páru:', error);
      return { error: error.message };
    }

    console.log('✅ [ChatHistory] Pár otázka-odpověď úspěšně uložen');
    return { error: null };

  } catch (err) {
    console.error('❌ [ChatHistory] Neočekávaná chyba při ukládání páru:', err);
    return { error: err instanceof Error ? err.message : 'Neznámá chyba' };
  }
}

// ============================================================================
// NAČÍTÁNÍ SESSIONS (PRO UI - SEZNAM KONVERZACÍ)
// ============================================================================

/**
 * Získá seznam sessions uživatele (pro pagination v UI)
 * @param userId - ID uživatele
 * @param limit - Počet sessions na stránku (default 20)
 * @param offset - Offset pro pagination (default 0)
 * @returns { sessions, error }
 */
export async function getUserChatSessions(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{ sessions: ChatSession[] | null; error: string | null }> {
  try {
    console.log('📖 [ChatHistory] Načítám sessions pro uživatele:', userId);

    const { data, error } = await supabase
      .rpc('get_user_chat_sessions', {
        p_user_id: userId,
        p_limit: limit,
        p_offset: offset
      });

    if (error) {
      console.error('❌ [ChatHistory] Chyba při načítání sessions:', error);
      return { sessions: null, error: error.message };
    }

    console.log(`✅ [ChatHistory] Načteno ${data?.length || 0} sessions`);
    return { sessions: data, error: null };

  } catch (err) {
    console.error('❌ [ChatHistory] Neočekávaná chyba při načítání sessions:', err);
    return { sessions: null, error: err instanceof Error ? err.message : 'Neznámá chyba' };
  }
}

// ============================================================================
// NAČÍTÁNÍ ZPRÁV JEDNÉ SESSION (PRO LAZY LOADING)
// ============================================================================

/**
 * Získá všechny zprávy jedné session
 * @param sessionId - ID session
 * @param userId - ID uživatele (pro bezpečnostní kontrolu)
 * @returns { messages, error }
 */
export async function getSessionMessages(
  sessionId: string,
  userId: string
): Promise<{ messages: ChatHistoryMessage[] | null; error: string | null }> {
  try {
    console.log('📖 [ChatHistory] Načítám zprávy pro session:', sessionId);

    const { data, error } = await supabase
      .rpc('get_session_messages', {
        p_session_id: sessionId,
        p_user_id: userId
      });

    if (error) {
      console.error('❌ [ChatHistory] Chyba při načítání zpráv:', error);
      return { messages: null, error: error.message };
    }

    console.log(`✅ [ChatHistory] Načteno ${data?.length || 0} zpráv`);
    return { messages: data, error: null };

  } catch (err) {
    console.error('❌ [ChatHistory] Neočekávaná chyba při načítání zpráv:', err);
    return { messages: null, error: err instanceof Error ? err.message : 'Neznámá chyba' };
  }
}

// ============================================================================
// VYHLEDÁVÁNÍ (FULL-TEXT SEARCH)
// ============================================================================

/**
 * Vyhledá zprávy obsahující text
 * @param userId - ID uživatele
 * @param searchQuery - Hledaný text
 * @param limit - Maximální počet výsledků (default 50)
 * @returns { results, error }
 */
export async function searchChatMessages(
  userId: string,
  searchQuery: string,
  limit: number = 50
): Promise<{ 
  results: Array<{
    id: string;
    session_id: string;
    role: string;
    message_text: string;
    created_at: string;
    rank: number;
  }> | null; 
  error: string | null;
}> {
  try {
    console.log('🔍 [ChatHistory] Vyhledávám:', searchQuery);

    const { data, error } = await supabase
      .rpc('search_chat_messages', {
        p_user_id: userId,
        p_search_query: searchQuery,
        p_limit: limit
      });

    if (error) {
      console.error('❌ [ChatHistory] Chyba při vyhledávání:', error);
      return { results: null, error: error.message };
    }

    console.log(`✅ [ChatHistory] Nalezeno ${data?.length || 0} výsledků`);
    return { results: data, error: null };

  } catch (err) {
    console.error('❌ [ChatHistory] Neočekávaná chyba při vyhledávání:', err);
    return { results: null, error: err instanceof Error ? err.message : 'Neznámá chyba' };
  }
}

// ============================================================================
// SMAZÁNÍ (VOLITELNÉ)
// ============================================================================

/**
 * Smaže všechny zprávy jedné session
 * @param sessionId - ID session
 * @param userId - ID uživatele (pro bezpečnostní kontrolu)
 * @returns { error }
 */
export async function deleteSession(
  sessionId: string,
  userId: string
): Promise<{ error: string | null }> {
  try {
    console.log('🗑️ [ChatHistory] Mažu session:', sessionId);

    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('session_id', sessionId)
      .eq('user_id', userId);

    if (error) {
      console.error('❌ [ChatHistory] Chyba při mazání session:', error);
      return { error: error.message };
    }

    console.log('✅ [ChatHistory] Session úspěšně smazána');
    return { error: null };

  } catch (err) {
    console.error('❌ [ChatHistory] Neočekávaná chyba při mazání:', err);
    return { error: err instanceof Error ? err.message : 'Neznámá chyba' };
  }
}
