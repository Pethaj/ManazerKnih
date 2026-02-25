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
  // user_id ODSTRANĚNO - user info je v message_data.user_info
  chatbot_id: string;
  role: 'user' | 'bot' | 'pair';  // 🆕 'pair' pro otázka-odpověď páry
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
    user_info?: {
      external_user_id?: string;
      first_name?: string;
      last_name?: string;
      email?: string;
      position?: string;
      [key: string]: any; // Flexibilní pro budoucí rozšíření
    };
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
    console.log({
      session_id: message.session_id,
      role: message.role,
      text_length: message.message_text.length,
      has_metadata: !!message.conversation_metadata,
      has_message_data: !!message.message_data
    });

    // Připravíme data pro uložení - ukládáme JEN existující pole
    const dataToSave: any = {
      session_id: message.session_id,
      // user_id ODSTRANĚNO - user info je v message_data.user_info
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
      // 🆕 Ukládání user_info z iframe embedu
      if (message.message_data.user_info && Object.keys(message.message_data.user_info).length > 0) {
        filteredData.user_info = message.message_data.user_info;
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
      return { error: error.message };
    }

    return { error: null };

  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Neznámá chyba' };
  }
}

/**
 * Uloží user zprávu (s metadaty)
 */
export async function saveUserMessage(
  sessionId: string,
  userId: string | null,  // DEPRECATED - ignorováno, user info je v message_data
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
    // user_id ODSTRANĚNO
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
  userId: string | null,  // DEPRECATED - ignorováno, user info je v message_data
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
    // user_id ODSTRANĚNO
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
    user_info?: {
      external_user_id?: string;
      first_name?: string;
      last_name?: string;
      email?: string;
      position?: string;
      [key: string]: any;
    };
  }
): Promise<{ error: string | null }> {
  try {
    console.log({
      session_id: sessionId,
      question_length: userQuestion.length,
      answer_length: botAnswer.length,
      has_metadata: !!questionMetadata,
      has_answer_data: !!answerData
    });

    // Připravíme data pro uložení
    const dataToSave: any = {
      session_id: sessionId,
      // user_id ODSTRANĚNO - user info je v answerData.user_info
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
    
    // 🆕 User info - PRIORITA: localStorage > answerData.user_info
    let finalUserInfo = null;
    
    // 💾 NOVÉ: Zkus načíst z localStorage
    try {
      const stored = localStorage.getItem('BEWIT_USER_DATA');
      if (stored) {
        const parsed = JSON.parse(stored);
        finalUserInfo = {
          external_user_id: String(parsed.id || ''),
          first_name: parsed.firstName || '',
          last_name: parsed.lastName || '',
          email: parsed.email || '',
          position: parsed.position || '',
          token_eshop: parsed.tokenEshop || ''
        };
      }
    } catch (e) {
    }
    
    // Fallback na answerData.user_info
    if (!finalUserInfo && answerData?.user_info && Object.keys(answerData.user_info).length > 0) {
      finalUserInfo = answerData.user_info;
    }
    
    // Uložíme do SAMOSTATNÉHO sloupce user_data
    if (finalUserInfo && Object.keys(finalUserInfo).length > 0) {
      dataToSave.user_data = finalUserInfo;
    } else {
    }

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
      return { error: error.message };
    }

    return { error: null };

  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Neznámá chyba' };
  }
}

// ============================================================================
// FEEDBACK
// ============================================================================

/**
 * Uloží feedback (smiley + text) k poslednímu záznamu dané session
 * Aktualizuje nejnovější řádek v chat_messages pro danou session_id
 */
export async function saveChatFeedback(
  sessionId: string,
  smiley: number | null,
  feedbackText: string
): Promise<{ error: string | null }> {
  try {
    // Připravíme jen vyplněná data
    const updateData: any = {};
    if (smiley !== null) {
      updateData.smiley = smiley;
    }
    if (feedbackText && feedbackText.trim().length > 0) {
      updateData.feedback_text = feedbackText.trim();
    }

    // Pokud není co uložit, vrátíme úspěch bez dotazu
    if (Object.keys(updateData).length === 0) {
      return { error: null };
    }

    // Najdeme ID posledního záznamu pro tuto session
    const { data: lastRecord, error: fetchError } = await supabase
      .from('chat_messages')
      .select('id')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !lastRecord) {
      return { error: fetchError?.message || 'Záznam nenalezen' };
    }

    const { error } = await supabase
      .from('chat_messages')
      .update(updateData)
      .eq('id', lastRecord.id);

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Neznámá chyba' };
  }
}

// ============================================================================
// NAČÍTÁNÍ SESSIONS (PRO UI - SEZNAM KONVERZACÍ)
// ============================================================================

/**
 * DEPRECATED - RPC funkce get_user_chat_sessions smazána (závisela na user_id)
 * Pro načítání sessions použij přímý SELECT na chat_messages filtrovaný podle session_id
 */

// ============================================================================
// NAČÍTÁNÍ ZPRÁV JEDNÉ SESSION (PRO LAZY LOADING)
// ============================================================================

/**
 * DEPRECATED - RPC funkce get_session_messages smazána (závisela na user_id)
 * Pro načítání zpráv jedné session použij přímý SELECT:
 * 
 * const { data } = await supabase
 *   .from('chat_messages')
 *   .select('*')
 *   .eq('session_id', sessionId)
 *   .order('created_at', { ascending: true });
 */

// ============================================================================
// VYHLEDÁVÁNÍ (FULL-TEXT SEARCH)
// ============================================================================

/**
 * DEPRECATED - RPC funkce search_chat_messages smazána (závisela na user_id)
 * Pro full-text search použij přímý SELECT s textSearch:
 * 
 * const { data } = await supabase
 *   .from('chat_messages')
 *   .select('*')
 *   .textSearch('message_text', searchQuery)
 *   .limit(50);
 */

// ============================================================================
// SMAZÁNÍ (VOLITELNÉ)
// ============================================================================

/**
 * DEPRECATED - Zprávy jsou immutable (audit trail)
 * Mazání je zakázáno RLS policies
 */
