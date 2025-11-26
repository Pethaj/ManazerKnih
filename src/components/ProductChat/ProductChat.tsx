/**
 * Product Chat Component
 * Samostatný chat pro produktová doporučení využívající N8N webhook
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ProductCarousel } from '../ProductCarousel';
import { getProductRecommendations, EnrichedProduct } from '../../services/productChatWebhookService';

// Generate session ID
const generateSessionId = () => 
  'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'.replace(/[x]/g, () => 
    ((Math.random() * 16) | 0).toString(16)
  );

// Chat message interface
interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
  products?: EnrichedProduct[];
}

// Icons
const SendIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const UserIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const BotIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
    <path d="M12 2C6.477 2 2 6.477 2 12h10c5.523 0 10-4.477 10-10C17.523 2 12 2 12 2z"/>
  </svg>
);

const ProductChatLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
    <line x1="3" y1="6" x2="21" y2="6"/>
    <path d="M16 10a4 4 0 0 1-8 0"/>
  </svg>
);

interface ProductChatProps {
  onClose?: () => void;
}

const ProductChat: React.FC<ProductChatProps> = ({ onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => generateSessionId());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new message arrives
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userQuery = input.trim();
    setInput('');

    // Add user message
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: userQuery
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      console.log('🎯 Odesílám dotaz do Product Chat:', userQuery);
      
      // Call N8N webhook service
      const { text, products } = await getProductRecommendations(
        userQuery,
        sessionId
      );

      console.log('✅ Odpověď získána:', {
        textLength: text.length,
        productCount: products.length
      });

      // Add bot message with products
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        text: text,
        products: products.length > 0 ? products : undefined
      };
      setMessages(prev => [...prev, botMsg]);

    } catch (error) {
      console.error('❌ Chyba v Product Chat:', error);
      
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        text: '❌ Omlouváme se, došlo k chybě při zpracování vašeho dotazu. Zkuste to prosím znovu.'
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, sessionId]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-bewit-gray">
      {/* Header */}
      <div className="bg-bewit-blue text-white p-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <ProductChatLogo className="text-white" />
          <div>
            <h2 className="text-xl font-bold">Product Chat</h2>
            <p className="text-sm text-white/80">Produktová doporučení BEWIT</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Zavřít"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-slate-500 flex flex-col items-center justify-center min-h-96">
            <ProductChatLogo className="h-16 w-16 text-bewit-blue opacity-20 mb-4" />
            <h3 className="text-xl font-semibold text-bewit-blue mb-2">Vítejte v Product Chat!</h3>
            <p>Zeptejte se na produkty BEWIT a dostanete personalizovaná doporučení.</p>
            <p className="text-sm mt-2">Například: "Wany na bolest nohy" nebo "Produkty pro lepší spánek"</p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'bot' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-bewit-blue flex items-center justify-center text-white">
                <BotIcon className="w-5 h-5" />
              </div>
            )}

            <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-3xl`}>
              <div
                className={`px-4 py-3 rounded-2xl ${
                  msg.role === 'user'
                    ? 'bg-bewit-blue text-white rounded-br-none'
                    : 'bg-white text-bewit-dark border border-slate-200 rounded-bl-none shadow-sm'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>
              </div>

              {/* Product Carousel with personalized recommendations */}
              {msg.products && msg.products.length > 0 && (
                <div className="mt-4 w-full">
                  <ProductCarousel
                    products={msg.products.slice(0, 6).map(p => ({
                      id: p.product_code,
                      product_code: p.product_code,
                      product_name: p.product_name,
                      description: p.recommendation, // ⭐ Personalizované doporučení!
                      product_url: p.url,
                      image_url: p.image_url,
                      price: p.price,
                      currency: p.currency
                    }))}
                    title="Doporučené produkty"
                    showSimilarity={false}
                  />
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center text-slate-600">
                <UserIcon className="w-5 h-5" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-bewit-blue flex items-center justify-center text-white">
              <BotIcon className="w-5 h-5" />
            </div>
            <div className="px-4 py-3 rounded-2xl bg-white border border-slate-200 rounded-bl-none shadow-sm">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 p-4 bg-white">
        <div className="flex items-center bg-white border border-slate-300 rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-bewit-blue transition-shadow duration-200 p-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Zeptejte se na produkty BEWIT..."
            className="w-full flex-1 px-2 py-2 bg-transparent resize-none focus:outline-none text-bewit-dark placeholder-slate-400 leading-5"
            rows={1}
            style={{ maxHeight: '120px', minHeight: '40px' }}
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="ml-3 flex-shrink-0 w-10 h-10 rounded-lg bg-bewit-blue text-white flex items-center justify-center transition-colors duration-200 disabled:bg-slate-300 disabled:cursor-not-allowed hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bewit-blue"
            aria-label="Odeslat zprávu"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <SendIcon className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductChat;

