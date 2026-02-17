
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import ProductSyncAdmin from './ProductSync';
import { ProductCarousel } from '../ProductCarousel';
import { searchRelevantProducts, ProductRecommendation } from '../../services/productSearchService';

// Declare global variables from CDN scripts for TypeScript
declare const jspdf: any;
declare const html2canvas: any;

// Supabase configuration
const SUPABASE_URL = 'https://umxkjdllhlkclrplxdxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVteGtqZGxsaGxrY2xycGx4ZHh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjEyMzM0MTMsImV4cCI6MjAzNjgwOTQxM30.MKSjLqO1YMGwGOdZIttWOwrCaQTSHkf6Fc-9XQbQ8t0';
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// API functions for loading metadata
const api = {
    async getLabels(): Promise<string[]> {
        const { data, error } = await supabaseClient
            .from('labels')
            .select('name')
            .order('name');
        if (error) {
            return [];
        }
        return data.map(item => item.name);
    },
    
    async getCategories(): Promise<string[]> {
        const { data, error } = await supabaseClient
            .from('categories')
            .select('name')
            .order('name');
        if (error) {
            return [];
        }
        return data.map(item => item.name);
    },
    
    async getPublicationTypes(): Promise<string[]> {
        const { data, error } = await supabaseClient
            .from('publication_types')
            .select('name')
            .order('name');
        if (error) {
            return [];
        }
        return data.map(item => item.name);
    }
};

// --- TYPES (from types.ts) ---
interface Source {
  uri: string;
  title: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
  sources?: Source[];
  productRecommendations?: ProductRecommendation[];
}

// Rozhraní pro metadata filtrace
interface ChatMetadata {
  categories?: string[];
  labels?: string[];
  publication_types?: string[];
}

// Props pro SanaChat komponentu
interface SanaChatProps {
  selectedCategories: string[];
  selectedLabels: string[];
  selectedPublicationTypes: string[];
}


// --- ICONS (from components/icons.tsx) ---
type IconProps = React.SVGProps<SVGSVGElement>;

const NewChatIcon: React.FC<IconProps> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
    </svg>
);

const ExportPdfIcon: React.FC<IconProps> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
);

const SendIcon: React.FC<IconProps> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
);

const UserIcon: React.FC<IconProps> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);

const BotIcon: React.FC<IconProps> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
        <path d="M12 2C6.477 2 2 6.477 2 12h10c5.523 0 10-4.477 10-10C17.523 2 12 2 12 2z"/>
    </svg>
);

const LinkIcon: React.FC<IconProps> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72" />
    </svg>
);

const SanaAILogo: React.FC<IconProps> = (props) => (
    <img 
        src="https://modopafybeslbcqjxsve.supabase.co/storage/v1/object/public/web/Generated_Image_September_08__2025_-_3_09PM-removebg-preview.png"
        alt="Sana AI Logo" 
        style={{ objectFit: 'contain' }}
        {...props}
    />
);

const ImageIcon: React.FC<IconProps> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <circle cx="8.5" cy="8.5" r="1.5"></circle>
        <polyline points="21 15 16 10 5 21"></polyline>
    </svg>
);

const KeyIcon: React.FC<IconProps> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
    </svg>
);

const ProductIcon: React.FC<IconProps> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
        <line x1="3" y1="6" x2="21" y2="6"/>
        <path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
);

const FilterIcon: React.FC<IconProps> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
    </svg>
);

// --- CHAT SERVICE (from services/chatService.ts) ---
const N8N_WEBHOOK_URL = 'https://n8n.srv980546.hstgr.cloud/webhook/97dc857e-352b-47b4-91cb-bc134afc764c/chat';

const sendMessageToAPI = async (message: string, sessionId: string, history: ChatMessage[], metadata?: ChatMetadata): Promise<{ text: string; sources: Source[] }> => {
    try {
        const payload: any = {
            sessionId: sessionId,
            action: "sendMessage",
            chatInput: message,
            chatHistory: history,
        };

        // Přidej metadata pouze pokud obsahují zaškrtnuté filtry
        if (Object.keys(metadata).length > 0) {
            payload.metadata = metadata;
        }
        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const errorText = await response.text();
            let errorDetails = '';
            try {
                const errorJson = JSON.parse(errorText);
                errorDetails = `<pre style="background-color: #fff0f0; color: #b91c1c; border: 1px solid #fecaca; padding: 15px; border-radius: 8px; font-family: monospace; white-space: pre-wrap; word-wrap: break-word;"><code>${JSON.stringify(errorJson, null, 2)}</code></pre>`;
            } catch (e) {
                 errorDetails = `<pre style="background-color: #fff0f0; color: #b91c1c; border: 1px solid #fecaca; padding: 15px; border-radius: 8px; font-family: monospace; white-space: pre-wrap; word-wrap: break-word;"><code>${errorText}</code></pre>`;
            }
            throw new Error(`Chyba serveru: ${response.status} ${response.statusText}.<br/><br/>Odpověď ze serveru:<br/>${errorDetails}`);
        }
        const data = await response.json();
        
        // Debug log pro analysis N8N response structure
        
        // Test s ukázkovými daty z problému
        if (process.env.NODE_ENV === 'development') {
            const testHtml = `\n<style>\n  body, .chatgpt-text { font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif; }\n</style>\n<div class="chatgpt-text">\n<p>Ahoj! Jak ti mohu pomoci? 😊</p>\n</div>\n`;
            const cleanedTest = testHtml
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                .replace(/<div class="chatgpt-text">/gi, '')
                .replace(/<\/div>\s*$/gi, '')
                .trim();
        }
        
        let responsePayload = Array.isArray(data) ? data[0] : data;
        
        // N8N může vracet data v různých formátech, zkusíme několik možností
        if (responsePayload && typeof responsePayload.json === 'object' && responsePayload.json !== null) {
            responsePayload = responsePayload.json;
        } else if (responsePayload && responsePayload.body) {
            // N8N někdy wrappuje data do body
            responsePayload = responsePayload.body;
        } else if (responsePayload && responsePayload.data) {
            // Nebo do data fieldu
            responsePayload = responsePayload.data;
        }
        
        // Rozšířený parsing textu - zkusíme více možností
        let botText = responsePayload?.html || 
                     responsePayload?.text || 
                     responsePayload?.output || 
                     responsePayload?.content ||
                     responsePayload?.response ||
                     responsePayload?.message ||
                     responsePayload?.result;
                     
        if (typeof botText !== 'string') {
             const fallbackMessage = 'Odpověď ze serveru neobsahovala text nebo byl ve špatném formátu.';
             const debugInfo = `<br/><br/><small style="color: #6b7280; font-family: sans-serif;">Přijatá data: <code style="background-color: #f3f4f6; padding: 2px 4px; border-radius: 4px; font-family: monospace;">${JSON.stringify(data, null, 2)}</code></small>`;
             throw new Error(fallbackMessage + debugInfo);
        }
        
        // Pokud přišlo HTML z N8N, extrahuj pouze obsah bez <style> tagů
        if (responsePayload?.html && botText.includes('<style>')) {
            // Odstraň <style> bloky a <div class="chatgpt-text"> wrapper
            botText = botText
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Odstraň všechny <style> bloky
                .replace(/<div class="chatgpt-text">/gi, '')     // Odstraň opening div
                .replace(/<\/div>\s*$/gi, '')                   // Odstraň closing div na konci
                .trim();
        }
        return {
            text: botText,
            sources: responsePayload?.sources || [],
        };
    } catch (error) {
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
            throw new Error(
                `<div style="font-family: sans-serif; line-height: 1.6;">` +
                `<strong style="font-size: 1.1em; color: #b91c1c;">Chyba: Nelze se připojit k serveru</strong><br /><br />` +
                `Zdá se, že mám potíže s připojením k vašemu n8n webhooku na adrese <strong>${N8N_WEBHOOK_URL}</strong>.<br /><br />` +
                `Příčinou je téměř jistě bezpečnostní mechanismus prohlížeče zvaný <strong>CORS</strong>. Váš n8n server musí explicitně povolit komunikaci s touto webovou aplikací.` +
                `</div>`
            );
        }
        if (error instanceof Error) throw error;
        throw new Error('Došlo k neznámé chybě při komunikaci se serverem.');
    }
};


// --- UI COMPONENTS (from components/*.tsx) ---

const SourcePill: React.FC<{ source: Source }> = ({ source }) => (
    <a href={source.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 bg-bewit-lightBlue text-bewit-blue text-xs font-medium px-3 py-1.5 rounded-full hover:bg-blue-200/70 transition-colors">
        <LinkIcon className="h-3 w-3" />
        <span>{source.title || new URL(source.uri).hostname}</span>
    </a>
);

const TypingIndicator: React.FC = () => (
    <div className="flex items-start gap-3 max-w-4xl mx-auto justify-start">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-bewit-blue flex items-center justify-center text-white">
            <BotIcon className="w-5 h-5" />
        </div>
        <div className="px-4 py-3 rounded-2xl bg-white border border-slate-200 rounded-bl-none shadow-sm">
            <div className="flex items-center space-x-1">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
            </div>
        </div>
    </div>
);

const Message: React.FC<{ message: ChatMessage; onSilentPrompt: (prompt: string) => void; }> = ({ message, onSilentPrompt }) => {
    const isUser = message.role === 'user';
    const sanitizedHtml = message.text || '';
    return (
        <div className={`flex items-start gap-3 max-w-4xl mx-auto group ${isUser ? 'justify-end' : 'justify-start'}`}>
            {!isUser && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-bewit-blue flex items-center justify-center text-white">
                    <BotIcon className="w-5 h-5" />
                </div>
            )}
            <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                <div className={`px-4 py-3 rounded-2xl max-w-xl md:max-w-2xl lg:max-w-3xl shadow-sm ${isUser ? 'bg-bewit-blue text-white rounded-br-none' : 'bg-white text-bewit-dark border border-slate-200 rounded-bl-none'}`}>
                    <div className="prose prose-sm max-w-none text-inherit prose-headings:font-semibold prose-headings:text-lg prose-p:my-2 prose-a:text-bewit-blue hover:prose-a:underline prose-img:rounded-lg prose-img:mt-2 prose-img:mb-1" dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
                    {message.sources && message.sources.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-t-white/20">
                            <h4 className={`text-xs font-semibold mb-2 uppercase tracking-wider ${isUser ? 'text-white/80' : 'text-slate-500'}`}>Zdroje</h4>
                            <div className="flex flex-wrap gap-2">
                                {message.sources.map((source, index) => (<SourcePill key={index} source={source} />))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {!isUser && (
                 <div className="flex flex-col space-y-1 self-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button onClick={() => onSilentPrompt('Ukaz mi vsechny obrazky, ktere s tematem souviseji')} className="p-1.5 text-slate-500 hover:text-bewit-blue hover:bg-slate-200 rounded-full" aria-label="Ukázat obrázky k tématu" title="Ukázat obrázky k tématu"><ImageIcon className="h-5 w-5" /></button>
                    <button onClick={() => onSilentPrompt('text detailne rozepis. POsbirej vsechny informace a udelej detailni vystup')} className="p-1.5 text-slate-500 hover:text-bewit-blue hover:bg-slate-200 rounded-full" aria-label="Rozepsat více" title="Rozepsat více"><KeyIcon className="h-5 w-5" /></button>
                </div>
            )}
            {isUser && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center text-slate-600">
                    <UserIcon className="w-5 h-5" />
                </div>
            )}
        </div>
    );
};

const ChatWindow: React.FC<{ messages: ChatMessage[]; isLoading: boolean; onSilentPrompt: (prompt: string) => void; }> = ({ messages, isLoading, onSilentPrompt }) => {
    const chatEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);
    return (
        <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
            {messages.length === 0 && !isLoading && (
                <div className="text-center text-slate-500 flex flex-col items-center justify-center h-full">
                    <SanaAILogo className="h-45 w-45 text-bewit-blue opacity-20 mb-4" />
                    <h2 className="text-2xl font-semibold text-bewit-blue">Vítejte v Sana AI!</h2>
                    <p>Jak vám dnes mohu pomoci?</p>
                </div>
            )}
            {messages.map((msg) => (<Message key={msg.id} message={msg} onSilentPrompt={onSilentPrompt} />))}
            {isLoading && <TypingIndicator />}
            <div ref={chatEndRef} />
        </div>
    );
};

const ChatInput: React.FC<{ onSendMessage: (text: string) => void; isLoading: boolean; }> = ({ onSendMessage, isLoading }) => {
    const [input, setInput] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() && !isLoading) {
            onSendMessage(input);
            setInput('');
        }
    };
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [input]);
    return (
        <form onSubmit={handleSubmit} className="relative">
            <div className="flex items-center bg-white border border-slate-300 rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-bewit-blue transition-shadow duration-200 p-3">
                <textarea 
                    ref={textareaRef} 
                    value={input} 
                    onChange={(e) => setInput(e.target.value)} 
                    onKeyDown={handleKeyDown} 
                    placeholder="Jak vám mohu pomoci..." 
                    className="w-full flex-1 px-2 py-2 bg-transparent resize-none focus:outline-none text-bewit-dark placeholder-slate-400 leading-5" 
                    rows={1} 
                    style={{ maxHeight: '120px', minHeight: '40px' }} 
                    disabled={isLoading} 
                />
                <button type="submit" disabled={isLoading || !input.trim()} className="ml-3 flex-shrink-0 w-10 h-10 rounded-lg bg-bewit-blue text-white flex items-center justify-center transition-colors duration-200 disabled:bg-slate-300 disabled:cursor-not-allowed hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bewit-blue" aria-label="Odeslat zprávu">
                    {isLoading ? (<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>) : (<SendIcon className="w-5 h-5" />)}
                </button>
            </div>
        </form>
    );
};

const languages = [{ code: 'cs', label: 'CZ' }, { code: 'sk', label: 'SK' }, { code: 'de', label: 'DE' }, { code: 'en', label: 'UK' }];
const Header: React.FC<{ 
    onNewChat: () => void; 
    onExportPdf: () => void; 
    selectedLanguage: string; 
    onLanguageChange: (lang: string) => void;
    onToggleFilters?: () => void;
    isFilterPanelVisible?: boolean;
    onToggleProductSync?: () => void;
    isProductSyncVisible?: boolean;
}> = ({ onNewChat, onExportPdf, selectedLanguage, onLanguageChange, onToggleFilters, isFilterPanelVisible, onToggleProductSync, isProductSyncVisible }) => (
    <header className="bg-bewit-blue text-white shadow-md z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
                <div className="flex items-center space-x-3">
                    <SanaAILogo className="h-24 w-24 text-white" />
                </div>
                <div className="flex items-center space-x-2 sm:space-x-4">
                    <div className="flex items-center space-x-2">
                        {languages.map(lang => (<button key={lang.code} onClick={() => onLanguageChange(lang.code)} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${selectedLanguage === lang.code ? 'bg-white text-bewit-blue ring-2 ring-offset-2 ring-offset-bewit-blue ring-white' : 'bg-white/20 hover:bg-white/30 text-white'}`} aria-label={`Změnit jazyk na ${lang.label}`}>{lang.label}</button>))}
                    </div>
                    <div className="h-6 w-px bg-white/20 hidden sm:block"></div>
                    <div className="flex items-center space-x-2">
                        {onToggleFilters && (
                            <button 
                                onClick={onToggleFilters} 
                                className={`flex items-center justify-center h-9 w-9 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white ${isFilterPanelVisible ? 'bg-white/20 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`} 
                                aria-label={isFilterPanelVisible ? 'Skrýt filtry' : 'Zobrazit filtry'} 
                                title={isFilterPanelVisible ? 'Skrýt filtry' : 'Zobrazit filtry'}
                            >
                                <FilterIcon className="h-5 w-5" />
                            </button>
                        )}
                        {onToggleProductSync && (
                            <button 
                                onClick={onToggleProductSync} 
                                className={`flex items-center justify-center h-9 w-9 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white ${isProductSyncVisible ? 'bg-white/20 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`} 
                                aria-label={isProductSyncVisible ? 'Skrýt produkty' : 'Spravovat produkty'} 
                                title={isProductSyncVisible ? 'Skrýt produkty' : 'Spravovat produkty'}
                            >
                                <ProductIcon className="h-5 w-5" />
                            </button>
                        )}
                        <button onClick={onNewChat} className="flex items-center justify-center h-9 w-9 bg-white/10 hover:bg-white/20 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white" aria-label="Nový chat" title="Nový chat"><NewChatIcon className="h-5 w-5" /></button>
                        <button onClick={onExportPdf} className="flex items-center justify-center h-9 w-9 bg-white/10 hover:bg-white/20 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white" aria-label="Export do PDF" title="Export do PDF"><ExportPdfIcon className="h-5 w-5" /></button>
                    </div>
                </div>
            </div>
        </div>
    </header>
);

// --- MAIN PORTABLE APP COMPONENT ---

const generateSessionId = () => 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'.replace(/[x]/g, () => ((Math.random() * 16) | 0).toString(16));

const languageInstructions: { [key: string]: string } = {
  cs: 'Odpověz v češtině.',
  sk: 'Odpovedz v slovenčine.',
  de: 'Antworte auf Deutsch.',
  en: 'Answer in English.',
};

// Komponenta jen s obsahem chatu (bez headeru)
const SanaChatContent: React.FC<SanaChatProps> = ({ selectedCategories, selectedLabels, selectedPublicationTypes }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [sessionId, setSessionId] = useState<string>('');
    const [selectedLanguage, setSelectedLanguage] = useState<string>('cs');

    useEffect(() => {
        setSessionId(generateSessionId());
    }, []);

    const handleSendMessage = useCallback(async (text: string) => {
        if (!text.trim() || !sessionId) return;

        const userMessage: ChatMessage = { id: Date.now().toString(), role: 'user', text: text };
        const newMessages: ChatMessage[] = [...messages, userMessage];
        setMessages(newMessages);
        setIsLoading(true);

        try {
            const currentMetadata: ChatMetadata = {};
            if (selectedCategories.length > 0) {
                currentMetadata.categories = selectedCategories;
            }
            if (selectedLabels.length > 0) {
                currentMetadata.labels = selectedLabels;
            }
            if (selectedPublicationTypes.length > 0) {
                currentMetadata.publication_types = selectedPublicationTypes;
            }
            
            
            const instruction = languageInstructions[selectedLanguage];
            const promptForBackend = `${text.trim()} ${instruction}`;
            const { text: botText, sources } = await sendMessageToAPI(promptForBackend, sessionId, newMessages.slice(0, -1), currentMetadata);
            const botMessage: ChatMessage = { id: (Date.now() + 1).toString(), role: 'bot', text: botText, sources: sources };
            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            const errorMessageText = error instanceof Error ? error.message : 'Omlouvám se, došlo k neznámé chybě.';
            const errorMessage: ChatMessage = { id: (Date.now() + 1).toString(), role: 'bot', text: errorMessageText };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    }, [sessionId, messages, selectedLanguage, selectedCategories, selectedLabels, selectedPublicationTypes]);
    
    const handleSilentPrompt = useCallback(async (text: string) => {
        if (!text.trim() || !sessionId) return;
        setIsLoading(true);
        try {
            const currentMetadata: ChatMetadata = {};
            if (selectedCategories.length > 0) {
                currentMetadata.categories = selectedCategories;
            }
            if (selectedLabels.length > 0) {
                currentMetadata.labels = selectedLabels;
            }
            if (selectedPublicationTypes.length > 0) {
                currentMetadata.publication_types = selectedPublicationTypes;
            }
            
            
            const instruction = languageInstructions[selectedLanguage];
            const promptForBackend = `${text.trim()} ${instruction}`;
            const { text: botText, sources } = await sendMessageToAPI(promptForBackend, sessionId, messages, currentMetadata);
            const botMessage: ChatMessage = { id: (Date.now() + 1).toString(), role: 'bot', text: botText, sources: sources };
            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            const errorMessageText = error instanceof Error ? error.message : 'Omlouvám se, došlo k neznámé chybě.';
            const errorMessage: ChatMessage = { id: (Date.now() + 1).toString(), role: 'bot', text: errorMessageText };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    }, [sessionId, messages, selectedLanguage, selectedCategories, selectedLabels, selectedPublicationTypes]);

    return (
        <div className="flex flex-col h-full font-sans">
            <main className="flex-1 flex flex-col items-center w-full overflow-hidden">
                <div id="chat-container-for-pdf" className="w-full h-full flex-1 overflow-y-auto">
                     <ChatWindow messages={messages} isLoading={isLoading} onSilentPrompt={handleSilentPrompt} />
                </div>
                <div className="w-full max-w-4xl p-4 md:p-6 bg-bewit-gray">
                    <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
                </div>
            </main>
        </div>
    );
};

const SanaChat: React.FC<SanaChatProps> = ({ selectedCategories, selectedLabels, selectedPublicationTypes }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [sessionId, setSessionId] = useState<string>('');
    const [selectedLanguage, setSelectedLanguage] = useState<string>('cs');

    useEffect(() => {
        setSessionId(generateSessionId());
    }, []);

    const handleSendMessage = useCallback(async (text: string) => {
        if (!text.trim() || !sessionId) return;

        const userMessage: ChatMessage = { id: Date.now().toString(), role: 'user', text: text };
        const newMessages: ChatMessage[] = [...messages, userMessage];
        setMessages(newMessages);
        setIsLoading(true);

        try {
            // Vypočti metadata přímo před odesláním s aktuálním stavem filtrů
            const currentMetadata: ChatMetadata = {};
            if (selectedCategories.length > 0) {
                currentMetadata.categories = selectedCategories;
            }
            if (selectedLabels.length > 0) {
                currentMetadata.labels = selectedLabels;
            }
            if (selectedPublicationTypes.length > 0) {
                currentMetadata.publication_types = selectedPublicationTypes;
            }
            
            
            const instruction = languageInstructions[selectedLanguage];
            const promptForBackend = `${text.trim()} ${instruction}`;
            const { text: botText, sources } = await sendMessageToAPI(promptForBackend, sessionId, newMessages.slice(0, -1), currentMetadata);
            const botMessage: ChatMessage = { id: (Date.now() + 1).toString(), role: 'bot', text: botText, sources: sources };
            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            const errorMessageText = error instanceof Error ? error.message : 'Omlouvám se, došlo k neznámé chybě.';
            const errorMessage: ChatMessage = { id: (Date.now() + 1).toString(), role: 'bot', text: errorMessageText };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    }, [sessionId, messages, selectedLanguage, selectedCategories, selectedLabels, selectedPublicationTypes]);
    
    const handleSilentPrompt = useCallback(async (text: string) => {
        if (!text.trim() || !sessionId) return;
        setIsLoading(true);
        try {
            // Vypočti metadata přímo před odesláním s aktuálním stavem filtrů
            const currentMetadata: ChatMetadata = {};
            if (selectedCategories.length > 0) {
                currentMetadata.categories = selectedCategories;
            }
            if (selectedLabels.length > 0) {
                currentMetadata.labels = selectedLabels;
            }
            if (selectedPublicationTypes.length > 0) {
                currentMetadata.publication_types = selectedPublicationTypes;
            }
            
            
            const instruction = languageInstructions[selectedLanguage];
            const promptForBackend = `${text.trim()} ${instruction}`;
            const { text: botText, sources } = await sendMessageToAPI(promptForBackend, sessionId, messages, currentMetadata);
            const botMessage: ChatMessage = { id: (Date.now() + 1).toString(), role: 'bot', text: botText, sources: sources };
            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            const errorMessageText = error instanceof Error ? error.message : 'Omlouvám se, došlo k neznámé chybě.';
            const errorMessage: ChatMessage = { id: (Date.now() + 1).toString(), role: 'bot', text: errorMessageText };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    }, [sessionId, messages, selectedLanguage, selectedCategories, selectedLabels, selectedPublicationTypes]);

    const handleNewChat = useCallback(() => {
        setMessages([]);
        setSessionId(generateSessionId());
        startNewChatOnAPI();
    }, []);

    const handleExportPdf = useCallback(() => {
        const chatContainer = document.getElementById('chat-container-for-pdf');
        if (chatContainer) {
            const originalBackgroundColor = chatContainer.style.backgroundColor;
            chatContainer.style.backgroundColor = 'white';
            html2canvas(chatContainer, { scale: 2, useCORS: true }).then((canvas: HTMLCanvasElement) => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jspdf.jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const scaledImgHeight = (canvas.height * pdfWidth) / canvas.width;
                let position = 0;
                let heightLeft = scaledImgHeight;
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, scaledImgHeight);
                heightLeft -= pdf.internal.pageSize.getHeight();
                while (heightLeft > 0) {
                    position = -heightLeft;
                    pdf.addPage();
                    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, scaledImgHeight);
                    heightLeft -= pdf.internal.pageSize.getHeight();
                }
                pdf.save('sana-ai-chat.pdf');
                chatContainer.style.backgroundColor = originalBackgroundColor;
            });
        }
    }, []);

    const [isProductSyncVisible, setIsProductSyncVisible] = useState<boolean>(false);

    const toggleProductSync = () => {
        setIsProductSyncVisible(!isProductSyncVisible);
    };

    return (
        <div className="flex flex-col h-full bg-bewit-gray font-sans">
            <Header 
                onNewChat={handleNewChat} 
                onExportPdf={handleExportPdf} 
                selectedLanguage={selectedLanguage} 
                onLanguageChange={setSelectedLanguage}
                onToggleProductSync={toggleProductSync}
                isProductSyncVisible={isProductSyncVisible}
            />
            <main className="flex-1 flex flex-col items-center w-full overflow-hidden">
                {isProductSyncVisible ? (
                    <div className="w-full h-full flex-1 overflow-y-auto p-6">
                        <ProductSyncAdmin />
                    </div>
                ) : (
                    <>
                        <div id="chat-container-for-pdf" className="w-full h-full flex-1 overflow-y-auto">
                             <ChatWindow messages={messages} isLoading={isLoading} onSilentPrompt={handleSilentPrompt} />
                        </div>
                        <div className="w-full max-w-4xl p-4 md:p-6 bg-bewit-gray">
                            <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
                        </div>
                    </>
                )}
            </main>
        </div>
    );
};

// --- KOMPONENTA S FILTERY ---
const FilteredSanaChat: React.FC = () => {
    // Dostupné filtry - načtou se z databáze
    const [availableCategories, setAvailableCategories] = useState<string[]>([]);
    const [availableLabels, setAvailableLabels] = useState<string[]>([]);
    const [availablePublicationTypes, setAvailablePublicationTypes] = useState<string[]>([]);
    
    // Filtry jsou defaultně prázdné
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
    const [selectedPublicationTypes, setSelectedPublicationTypes] = useState<string[]>([]);
    
    // State pro zobrazení/skrytí filtračního panelu
    const [isFilterPanelVisible, setIsFilterPanelVisible] = useState<boolean>(false);
    
    // State pro zobrazení/skrytí produktové synchronizace
    const [isProductSyncVisible, setIsProductSyncVisible] = useState<boolean>(false);

    // Načteme metadata z databáze při startu komponenty
    useEffect(() => {
        const loadMetadata = async () => {
            // Nejprve nastavím fallback hodnoty aby se něco zobrazilo
            const fallbackCategories = ['Aromaterapie', 'Masáže', 'Akupunktura', 'Diagnostika', 'TČM', 'Wany'];
            const fallbackLabels = ['Osobní', 'Chci přečíst']; // Dle memory [[memory:7487588]]
            const fallbackTypes = ['public', 'students', 'internal_bewit'];
            
            setAvailableCategories(fallbackCategories);
            setAvailableLabels(fallbackLabels);
            setAvailablePublicationTypes(fallbackTypes);
            
            // Defaultně vše zaškrtnuté
            setSelectedCategories([...fallbackCategories]);
            setSelectedLabels([...fallbackLabels]);
            setSelectedPublicationTypes([...fallbackTypes]);
            
                categories: fallbackCategories,
                labels: fallbackLabels,
                types: fallbackTypes
            });
            
            try {
                const [labels, categories, publicationTypes] = await Promise.all([
                    api.getLabels(),
                    api.getCategories(), 
                    api.getPublicationTypes()
                ]);
                
                
                // Pouze pokud se načetly data z databáze, aktualizuji je
                if (labels.length > 0) {
                    setAvailableLabels(labels);
                    setSelectedLabels([...labels]); // Defaultně vše zaškrtnuté
                }
                if (categories.length > 0) {
                    setAvailableCategories(categories);
                    setSelectedCategories([...categories]); // Defaultně vše zaškrtnuté
                }
                if (publicationTypes.length > 0) {
                    setAvailablePublicationTypes(publicationTypes);
                    setSelectedPublicationTypes([...publicationTypes]); // Defaultně vše zaškrtnuté
                }
                
            } catch (error) {
            }
        };
        
        loadMetadata();
    }, []);

    const toggleFilter = (value: string, selected: string[], setter: (values: string[]) => void) => {
        if (selected.includes(value)) {
            const newSelection = selected.filter(item => item !== value);
            setter(newSelection);
        } else {
            const newSelection = [...selected, value];
            setter(newSelection);
        }
    };

    // Funkce pro reset všech filtrů (odškrtne vše)
    const resetFilters = () => {
        setSelectedCategories([]);
        setSelectedLabels([]);
        setSelectedPublicationTypes([]);
    };

    // Funkce pro výběr všech filtrů
    const selectAllFilters = () => {
        setSelectedCategories([...availableCategories]);
        setSelectedLabels([...availableLabels]);
        setSelectedPublicationTypes([...availablePublicationTypes]);
    };

    // OPRAVENO: Metadata se odesílají VŽDY - obsahují aktuální stav všech filtrů
    const hasFilterRestrictions = 
        (selectedCategories.length > 0 && selectedCategories.length < availableCategories.length) ||
        (selectedLabels.length > 0 && selectedLabels.length < availableLabels.length) ||
        (selectedPublicationTypes.length > 0 && selectedPublicationTypes.length < availablePublicationTypes.length);

    // Metadata se nyní počítají přímo v handleSendMessage a handleSilentPrompt


    const toggleFilterPanel = () => {
        setIsFilterPanelVisible(!isFilterPanelVisible);
    };

    const toggleProductSync = () => {
        setIsProductSyncVisible(!isProductSyncVisible);
    };

    return (
        <div className="flex h-full w-full bg-bewit-gray m-0 p-0">
            {/* Levý panel s filtry - vysouvací */}
            <div className={`${isFilterPanelVisible ? 'w-80' : 'w-0'} bg-white overflow-hidden transition-all duration-300 ease-in-out`}>
                <div className="w-80 p-6 overflow-y-auto h-full">
                <div className="text-center mb-6">
                    <h2 className="text-xl font-bold text-bewit-dark mb-2">
                        Filtrace obsahu
                    </h2>
                    <p className="text-sm text-gray-600">
                        Vyberte kategorie pro přesnější výsledky
                    </p>
                </div>
                
                {/* Tlačítka pro správu filtrů */}
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={selectAllFilters}
                        className="flex-1 px-3 py-2 text-xs font-medium text-bewit-blue bg-bewit-lightBlue rounded-md hover:bg-blue-100 transition-colors"
                    >
                        Vybrat vše
                    </button>
                    <button
                        onClick={resetFilters}
                        className="flex-1 px-3 py-2 text-xs font-medium text-slate-600 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors"
                    >
                        Filter Reset
                    </button>
                </div>
                
                {/* Kategorie - vlastní dva sloupce */}
                <div className="mb-6">
                    <h3 className="text-lg font-semibold text-bewit-dark mb-4 text-center">Kategorie léčby</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {availableCategories.map(category => (
                            <button
                                key={category}
                                onClick={() => toggleFilter(category, selectedCategories, setSelectedCategories)}
                                className={`p-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 text-center ${
                                    selectedCategories.includes(category)
                                        ? 'bg-bewit-blue text-white shadow-md'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Typy publikací - vlastní dva sloupce */}
                <div className="mb-6">
                    <h3 className="text-lg font-semibold text-bewit-dark mb-4 text-center">Typy publikací</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {availablePublicationTypes.map(type => (
                            <button
                                key={type}
                                onClick={() => toggleFilter(type, selectedPublicationTypes, setSelectedPublicationTypes)}
                                className={`p-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 text-center ${
                                    selectedPublicationTypes.includes(type)
                                        ? 'bg-bewit-blue text-white shadow-md'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                {type === 'public' ? 'Veřejné' : type === 'students' ? 'Pro studenty' : 'Interní'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Štítky - vlastní dva sloupce */}
                <div className="mb-6">
                    <h3 className="text-lg font-semibold text-bewit-dark mb-4 text-center">Štítky</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {availableLabels.map(label => (
                            <button
                                key={label}
                                onClick={() => toggleFilter(label, selectedLabels, setSelectedLabels)}
                                className={`p-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 text-center ${
                                    selectedLabels.includes(label)
                                        ? 'bg-bewit-blue text-white shadow-md'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                </div>
            </div>
            
            {/* Pravá část s chatem */}
            <div className="flex-1 flex flex-col w-full">
                {/* Header s tlačítkem pro filtry a posuvníkem */}
                <div className="bg-bewit-blue text-white shadow-md w-full">
                    <div className="w-full">
                        <div className="flex items-center justify-between h-16 pl-4 pr-4">
                            <div className="flex items-center space-x-4">
                                {/* Posuvník pro filtry - přesunuto na levou stranu */}
                                <div className="flex items-center space-x-2">
                                    <span className="text-sm text-white/80">Filtry</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={isFilterPanelVisible}
                                            onChange={toggleFilterPanel}
                                            className="sr-only peer"
                                        />
                                        <div className="relative w-11 h-6 bg-white/20 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-white/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-white/40"></div>
                                    </label>
                                </div>
                                <div className="h-6 w-px bg-white/20"></div>
                                <SanaAILogo className="h-24 w-24 text-white" />
                            </div>
                            
                            {/* Tlačítko pro produktovou synchronizaci */}
                            <div className="flex items-center space-x-2">
                                <button 
                                    onClick={toggleProductSync} 
                                    className={`flex items-center justify-center h-9 w-9 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white ${isProductSyncVisible ? 'bg-white/20 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`} 
                                    aria-label={isProductSyncVisible ? 'Skrýt produkty' : 'Spravovat produkty'} 
                                    title={isProductSyncVisible ? 'Skrýt produkty' : 'Spravovat produkty BEWIT'}
                                >
                                    <ProductIcon className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Chat komponenta nebo ProductSync */}
                <div className="flex-1 bg-bewit-gray">
                    {isProductSyncVisible ? (
                        <div className="w-full h-full flex-1 overflow-y-auto p-6">
                            <ProductSyncAdmin />
                        </div>
                    ) : (
                        <SanaChatContent 
                            selectedCategories={selectedCategories}
                            selectedLabels={selectedLabels}
                            selectedPublicationTypes={selectedPublicationTypes}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export { SanaChat, SanaChatContent, FilteredSanaChat };
export default FilteredSanaChat;
