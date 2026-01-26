/**
 * Chat History Utilities
 * ============================================================================
 * Helper funkce pro ukládání párů otázka-odpověď do historie
 * ============================================================================
 */

import { saveChatPair } from '../services/chatHistoryService';

/**
 * Uloží pár otázka-odpověď do historie s automatickým zpracováním dat
 * Pouze loguje chyby, nepřerušuje flow aplikace
 * 
 * @param sessionId - ID session
 * @param userId - ID uživatele
 * @param chatbotId - ID chatbota
 * @param userQuestion - Text otázky uživatele
 * @param botAnswer - Text odpovědi bota
 * @param questionMetadata - Filtry aktivní při otázce
 * @param answerData - Data z odpovědi bota (sources, products, atd.)
 */
export async function saveChatPairToHistory(
  sessionId: string,
  userId: string | null | undefined,
  chatbotId: string | undefined,
  userQuestion: string,
  botAnswer: string,
  questionMetadata?: {
    categories?: string[];
    labels?: string[];
    publication_types?: string[];
  },
  answerData?: {
    sources?: any[];
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
): Promise<void> {
  try {
    await saveChatPair(
      sessionId,
      userId || null,
      chatbotId || 'unknown',
      userQuestion,
      botAnswer,
      questionMetadata,
      answerData
    );
  } catch (err) {
    console.error('⚠️ Nepodařilo se uložit pár otázka-odpověď do historie:', err);
    // Pokračujeme dál - nechceme přerušit konverzaci kvůli problému s ukládáním
  }
}
