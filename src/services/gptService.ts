/**
 * GPT Service - Zástupná implementace
 * Tato služba poskytuje základní rozhraní pro komunikaci s GPT modely
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function generateProductResponse(
  messages: ChatMessage[],
  context?: string
): Promise<string> {
  console.warn('⚠️ GPT product response není implementován');
  return 'Omlouváme se, chatbot služba momentálně není k dispozici.';
}

export function convertChatHistoryToGPT(history: any[]): ChatMessage[] {
  return history.map(msg => ({
    role: msg.isUser ? 'user' : 'assistant',
    content: msg.text || msg.content || ''
  }));
}

export async function generateCompletion(prompt: string): Promise<string> {
  console.warn('⚠️ GPT completion není implementován');
  return '';
}




