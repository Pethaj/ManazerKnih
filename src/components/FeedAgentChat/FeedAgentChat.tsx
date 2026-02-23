/**
 * Feed Agent Chat - UI komponenta
 * 
 * Testovací chat rozhraní pro Feed Agenta
 * Vizuálně vychází ze SanaChat
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { processFeedAgentMessage, FeedAgentMessage } from '../../feedAgent/feedAgentService';

// ============================================================================
// IKONY
// ============================================================================

const SendIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
  </svg>
);

const TrashIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

const DatabaseIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);

// ============================================================================
// PŘEDDEFINOVANÉ DOTAZY
// ============================================================================

const EXAMPLE_QUERIES = [
  'Najdi mi všechny produkty s levandulí',
  'Které esenciální oleje jsou jednodruhové a které jsou směsi?',
  'Do jaké kategorie patří produkt s kódem 5?',
  'Prodáváme bergamot?',
  'Ukáž mi statistiky celé databáze',
  'Spáruj tyto produkty: ["NOHEPA", "Levandule pravá", "Te Xiao Bi Min Gan Wan"]',
];

// ============================================================================
// CHAT ZPRÁVA KOMPONENTA
// ============================================================================

interface ChatMessageProps {
  message: FeedAgentMessage;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
          isUser ? 'bg-blue-500' : 'bg-bewit-blue'
        }`}
      >
        {isUser ? 'Ty' : 'FA'}
      </div>

      {/* Bublina zprávy */}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-blue-500 text-white rounded-tr-sm'
            : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'
        }`}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="text-sm prose prose-sm max-w-none prose-headings:text-gray-800 prose-strong:text-gray-800 prose-a:text-blue-600">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}
        <div className={`text-xs mt-1 ${isUser ? 'text-blue-100' : 'text-gray-400'} text-right`}>
          {message.timestamp.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// LOADING KOMPONENTA
// ============================================================================

const TypingIndicator: React.FC = () => (
  <div className="flex items-start gap-3">
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-bewit-blue flex items-center justify-center text-white text-sm font-bold">
      FA
    </div>
    <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-500 mr-2">Feed Agent přemýšlí</span>
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-2 h-2 bg-bewit-blue rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  </div>
);

// ============================================================================
// HLAVNÍ KOMPONENTA
// ============================================================================

const FeedAgentChat: React.FC = () => {
  const [messages, setMessages] = useState<FeedAgentMessage[]>([
    {
      role: 'assistant',
      content: `## Vítej! Jsem **Feed Agent** 🗄️\n\nJsem expert na BEWIT produktovou databázi. Mohu ti pomoci:\n\n- 🔍 **Vyhledávat produkty** podle klíčového slova (např. "levandule")\n- 🌿 **Rozlišit** jednodruhové esenciální oleje od směsí\n- 📂 **Zjistit kategorii** produktu\n- ✅ **Zkontrolovat dostupnost** – zda produkt prodáváme\n- 🔗 **Párovat produkty** podle názvů (fuzzy matching)\n- 📊 **Statistiky** celé databáze\n\nNapiš mi svůj dotaz nebo vyber příklad níže.`,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll na nejnovější zprávu
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Odeslání zprávy
  const handleSend = useCallback(async (messageText?: string) => {
    const text = messageText || inputValue.trim();
    if (!text || isLoading) return;

    const userMessage: FeedAgentMessage = {
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Sestavíme historii (bez uvítací zprávy)
      const historyForAgent = messages.slice(1).concat(userMessage).map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      }));

      const response = await processFeedAgentMessage(text, historyForAgent.slice(0, -1));

      const assistantMessage: FeedAgentMessage = {
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (!response.success && response.error?.includes('OPENROUTER_API_KEY')) {
        setApiKeyMissing(true);
      }
    } catch (error) {
      const errorMessage: FeedAgentMessage = {
        role: 'assistant',
        content: `❌ Nastala chyba: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [inputValue, isLoading, messages]);

  // Enter pro odeslání (Shift+Enter = nový řádek)
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Vymazání konverzace
  const handleClearChat = useCallback(() => {
    setMessages([
      {
        role: 'assistant',
        content: `Konverzace byla vymazána. Jak ti mohu pomoci?`,
        timestamp: new Date(),
      },
    ]);
  }, []);

  // Auto-resize textarea
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Hlavička */}
      <div className="bg-bewit-blue text-white shadow-md flex-shrink-0">
        <div className="flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-lg p-2">
              <DatabaseIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Feed Agent</h1>
              <p className="text-xs text-blue-200">Expert na BEWIT produktovou databázi</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-blue-200 hidden sm:block">Mistral Small · OpenRouter</span>
            <button
              onClick={handleClearChat}
              className="flex items-center justify-center h-9 w-9 rounded-md bg-white/10 hover:bg-white/20 transition-colors"
              title="Vymazat konverzaci"
            >
              <TrashIcon className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* API Key upozornění */}
      {apiKeyMissing && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-sm text-yellow-800">
          ⚠️ <strong>VITE_OPENROUTER_API_KEY</strong> není nastavena. Přidej ji do souboru <code>.env</code>
        </div>
      )}

      {/* Oblast zpráv */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, idx) => (
          <ChatMessage key={idx} message={msg} />
        ))}

        {isLoading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Příklady dotazů */}
      {messages.length === 1 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-gray-500 mb-2 font-medium">Příklady dotazů:</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUERIES.map((query, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(query)}
                className="text-xs bg-white border border-gray-200 hover:border-bewit-blue hover:text-bewit-blue text-gray-600 px-3 py-1.5 rounded-full transition-all duration-200 shadow-sm"
                disabled={isLoading}
              >
                {query}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input oblast */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex items-end gap-3 max-w-4xl mx-auto">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Napiš svůj dotaz... (Enter = odeslat, Shift+Enter = nový řádek)"
              className="w-full resize-none rounded-2xl border border-gray-300 focus:border-bewit-blue focus:ring-2 focus:ring-bewit-blue/20 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none transition-all duration-200 min-h-[48px] max-h-[120px] leading-relaxed"
              rows={1}
              disabled={isLoading}
            />
          </div>
          <button
            onClick={() => handleSend()}
            disabled={!inputValue.trim() || isLoading}
            className="flex-shrink-0 w-12 h-12 rounded-full bg-bewit-blue text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-md"
            title="Odeslat"
          >
            <SendIcon className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-gray-400 text-center mt-2">
          Feed Agent · BEWIT product_feed_2 · Mistral Small via OpenRouter
        </p>
      </div>
    </div>
  );
};

export default FeedAgentChat;
