/**
 * Feed Agent Chat - UI komponenta
 * 
 * Testovací chat rozhraní pro Feed Agenta
 * Vizuálně vychází ze SanaChat
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { processFeedAgentMessage, FeedAgentMessage, searchProductsAutocomplete } from '../../feedAgent/feedAgentService';
import type { AutocompleteProduct } from '../../feedAgent/feedAgentTools';

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

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<AutocompleteProduct[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const autocompleteDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Scroll na nejnovější zprávu
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Autocomplete: spustí dotaz s debounce 200ms
  const fetchSuggestions = useCallback((query: string) => {
    if (autocompleteDebounce.current) clearTimeout(autocompleteDebounce.current);
    if (query.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    autocompleteDebounce.current = setTimeout(async () => {
      const results = await searchProductsAutocomplete(query.trim(), 8);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setActiveSuggestion(-1);
    }, 200);
  }, []);

  // Klik mimo dropdown → zavři
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Výběr návrhu ze seznamu
  const handleSelectSuggestion = useCallback((product: AutocompleteProduct) => {
    setInputValue(product.product_name);
    setSuggestions([]);
    setShowSuggestions(false);
    setActiveSuggestion(-1);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  // Odeslání zprávy
  const handleSend = useCallback(async (messageText?: string) => {
    const text = messageText || inputValue.trim();
    if (!text || isLoading) return;
    setShowSuggestions(false);

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

  // Enter pro odeslání, šipky pro navigaci v dropdownu
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSuggestion(prev => (prev + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSuggestion(prev => (prev <= 0 ? suggestions.length - 1 : prev - 1));
        return;
      }
      if (e.key === 'Enter' && activeSuggestion >= 0) {
        e.preventDefault();
        handleSelectSuggestion(suggestions[activeSuggestion]);
        return;
      }
      if (e.key === 'Escape') {
        setShowSuggestions(false);
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend, showSuggestions, suggestions, activeSuggestion, handleSelectSuggestion]);

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

  // Auto-resize textarea + spuštění autocomplete
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputValue(val);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
    // Autocomplete pouze pro poslední "slovo" nebo celý jednořádkový vstup
    const lastWord = val.split(/\s+/).pop() ?? '';
    if (val.trim().length >= 2 && !val.includes('\n')) {
      fetchSuggestions(lastWord.length >= 2 ? lastWord : val.trim());
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [fetchSuggestions]);

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

            {/* Autocomplete dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden z-50"
              >
                <div className="px-3 py-1.5 border-b border-gray-100 flex items-center gap-1.5">
                  <svg className="w-3 h-3 text-bewit-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span className="text-xs text-gray-400 font-medium">Návrhy produktů</span>
                </div>
                {suggestions.map((product, idx) => (
                  <button
                    key={product.product_code}
                    onMouseDown={(e) => { e.preventDefault(); handleSelectSuggestion(product); }}
                    className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${
                      idx === activeSuggestion ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    {product.thumbnail ? (
                      <img
                        src={product.thumbnail}
                        alt={product.product_name}
                        className="w-8 h-8 rounded-lg object-contain flex-shrink-0 bg-gray-100"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex-shrink-0 flex items-center justify-center">
                        <span className="text-xs text-gray-400">📦</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{product.product_name}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {product.category && <span>{product.category}</span>}
                        {product.price && <span className="ml-2 font-medium text-bewit-blue">{product.price} {product.currency || 'CZK'}</span>}
                        {product.availability !== undefined && (
                          <span className="ml-2">{product.availability === 1 ? '✅' : '❌'}</span>
                        )}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
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
