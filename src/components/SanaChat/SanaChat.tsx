
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { supabase as supabaseClient } from '../../lib/supabase';
import ProductSyncAdmin from './ProductSync';
import { ProductCarousel } from '../ProductCarousel';
import { ProductRecommendationButton } from '../ProductRecommendationButton';
import { ProductRecommendation } from '../../services/productSearchService';
import { generateProductResponse, convertChatHistoryToGPT } from '../../services/gptService';
import { quickVectorSearchTest } from '../../services/vectorDiagnostics';
import { runCompleteVectorTest } from '../../services/testVectorSearch';
import { requestProductRecommendations, convertWebhookProductsToCarousel } from '../../services/webhookProductService';
import { performCombinedSearch } from '../../services/combinedSearchService';
import { getHybridProductRecommendations, HybridProductRecommendation } from '../../services/hybridProductService';

// Declare global variables from CDN scripts for TypeScript
declare const jspdf: any;
declare const html2canvas: any;

// API functions for loading metadata
const api = {
    async getLabels(): Promise<string[]> {
        const { data, error } = await supabaseClient
            .from('labels')
            .select('name')
            .order('name');
        if (error) {
            console.error('Error loading labels:', error);
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
            console.error('Error loading categories:', error);
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
            console.error('Error loading publication types:', error);
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
  chatbotSettings?: {
    product_recommendations: boolean;
    product_button_recommendations: boolean;  // 🆕 Produktové doporučení na tlačítko
    book_database: boolean;
    use_feed_1?: boolean;  // 🆕 Použít Feed 1 (zbozi.xml)
    use_feed_2?: boolean;  // 🆕 Použít Feed 2 (Product Feed 2)
  };
  onClose?: () => void;
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

const sendMessageToAPI = async (message: string, sessionId: string, history: ChatMessage[], metadata?: ChatMetadata): Promise<{ text: string; sources: Source[]; productRecommendations?: ProductRecommendation[] }> => {
    try {
        const payload: any = {
            sessionId: sessionId,
            action: "sendMessage",
            chatInput: message,
            chatHistory: history,
        };

        // Přidej metadata pouze pokud obsahují zaškrtnuté filtry
        if (metadata && Object.keys(metadata).length > 0) {
            payload.metadata = metadata;
        }

        // Detailní logování před odesláním
        console.log('🚀 Odesílám požadavek na N8N webhook...');
        console.log('📤 Payload size:', JSON.stringify(payload).length, 'bytes');
        console.log('📤 Session ID:', sessionId);
        console.log('📤 Message length:', message.length);
        console.log('📤 History length:', history.length);
        console.log('📤 Metadata:', metadata);
        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        console.log('📥 N8N response status:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ N8N error response:', errorText);
            
            let errorDetails = '';
            try {
                const errorJson = JSON.parse(errorText);
                errorDetails = `<pre style="background-color: #fff0f0; color: #b91c1c; border: 1px solid #fecaca; padding: 15px; border-radius: 8px; font-family: monospace; white-space: pre-wrap; word-wrap: break-word;"><code>${JSON.stringify(errorJson, null, 2)}</code></pre>`;
            } catch (e) {
                 errorDetails = `<pre style="background-color: #fff0f0; color: #b91c1c; border: 1px solid #fecaca; padding: 15px; border-radius: 8px; font-family: monospace; white-space: pre-wrap; word-wrap: break-word;"><code>${errorText}</code></pre>`;
            }

            // Specifické zpracování 500 chyb
            if (response.status === 500) {
                throw new Error(`🔧 N8N workflow selhalo (500 error). Zkontrolujte prosím N8N workflow konfiguraci.<br/><br/>Detaily chyby:<br/>${errorDetails}<br/><br/>💡 <strong>Tip:</strong> Problém je pravděpodobně v N8N workflow, ne v aplikaci.`);
            }

            throw new Error(`Chyba serveru: ${response.status} ${response.statusText}.<br/><br/>Odpověď ze serveru:<br/>${errorDetails}`);
        }
        const data = await response.json();
        
        // Debug log pro analysis N8N response structure
        console.log('N8N webhook response:', JSON.stringify(data, null, 2));
        console.log('Payload sent to N8N:', JSON.stringify(payload, null, 2));
        console.log('Metadata being sent:', JSON.stringify(metadata, null, 2));
        
        // Test s ukázkovými daty z problému
        if (process.env.NODE_ENV === 'development') {
            console.log('--- HTML parsing test ---');
            const testHtml = `\n<style>\n  body, .chatgpt-text { font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif; }\n</style>\n<div class="chatgpt-text">\n<p>Ahoj! Jak ti mohu pomoci? 😊</p>\n</div>\n`;
            const cleanedTest = testHtml
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                .replace(/<div class="chatgpt-text">/gi, '')
                .replace(/<\/div>\s*$/gi, '')
                .trim();
            console.log('Original HTML:', testHtml);
            console.log('Cleaned HTML:', cleanedTest);
        }
        
        // N8N může vracet array objektů (jako v ukázce uživatele)
        let responsePayload;
        if (Array.isArray(data)) {
            console.log('📦 N8N vrátil array dat:', data);
            responsePayload = data[0];
        } else {
            responsePayload = data;
        }
        
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
        
        // Správné zpracování HTML z N8N - zachovat vše kromě <style> tagů
        let finalBotText = botText;
        
        console.log('🔍 Původní HTML odpověď z N8N:', botText.substring(0, 500) + '...');
        
        // Pokud přišlo HTML z N8N, zpracuj ho správně
        if (responsePayload?.html || botText.includes('<style>') || botText.includes('<div class="chatgpt-text">')) {
            // Odstraň pouze <style> bloky - zachovej vše ostatní včetně wrapper divů
            finalBotText = botText
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                .trim();
                
            // Pokud je obsah wrapenovan v div class="chatgpt-text", extrahuj obsah
            const chatgptMatch = finalBotText.match(/<div class="chatgpt-text"[^>]*>([\s\S]*)<\/div>\s*$/i);
            if (chatgptMatch) {
                finalBotText = chatgptMatch[1].trim();
            }
        }
        
        console.log('🔧 Zpracovaný HTML:', finalBotText.substring(0, 500) + '...');
        
        // Log pro debug obrázků
        if (finalBotText.includes('<img')) {
            console.log('🖼️ Detekován HTML s obrázky v odpovědi - počet:', (finalBotText.match(/<img[^>]*>/gi) || []).length);
        }

        return {
            text: finalBotText,
            sources: responsePayload?.sources || [],
            productRecommendations: undefined,
        };
    } catch (error) {
        console.error('❌ Celková chyba v sendMessageToAPI:', error);
        
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
            throw new Error(
                `<div style="font-family: sans-serif; line-height: 1.6;">` +
                `<strong style="font-size: 1.1em; color: #b91c1c;">Chyba: Nelze se připojit k serveru</strong><br /><br />` +
                `Zdá se, že mám potíže s připojením k vašemu n8n webhooku na adrese <strong>${N8N_WEBHOOK_URL}</strong>.<br /><br />` +
                `Příčinou je téměř jistě bezpečnostní mechanismus prohlížeče zvaný <strong>CORS</strong>. Váš n8n server musí explicitně povolit komunikaci s touto webovou aplikací.` +
                `</div>`
            );
        }
        
        // Pro chyby z našeho vlastního error handlingu (již obsahují HTML formátování)
        if (error instanceof Error && error.message.includes('N8N workflow selhalo')) {
            throw error;
        }
        
        if (error instanceof Error) throw error;
        throw new Error('Došlo k neznámé chybě při komunikaci se serverem.');
    }
};
const startNewChatOnAPI = () => console.log("New chat started. State cleared in UI.");


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

const Message: React.FC<{ 
    message: ChatMessage; 
    onSilentPrompt: (prompt: string) => void; 
    chatbotSettings?: { 
        product_recommendations: boolean; 
        product_button_recommendations: boolean; 
        book_database: boolean; 
        use_feed_1?: boolean; 
        use_feed_2?: boolean; 
    };
    sessionId?: string;        // 🆕 Pro ProductRecommendationButton
    lastUserQuery?: string;    // 🆕 Pro ProductRecommendationButton
}> = ({ message, onSilentPrompt, chatbotSettings, sessionId, lastUserQuery }) => {
    const isUser = message.role === 'user';
    
    // Vylepšené zpracování HTML pro lepší zobrazení obrázků a formátování
    const processMessageText = (text: string): string => {
        if (!text) return '';
        
        let processedText = text;
        
        // Ujisti se, že img tagy mají správné atributy pro zobrazení
        processedText = processedText.replace(
            /<img([^>]*)>/gi, 
            (match, attrs) => {
                // Pokud už má loading a style, zachovej je
                if (attrs.includes('loading=') && attrs.includes('style=')) {
                    return match;
                }
                
                // Přidej loading="lazy" a základní styly pro obrázky
                let newAttrs = attrs;
                if (!attrs.includes('loading=')) {
                    newAttrs += ' loading="lazy"';
                }
                if (!attrs.includes('style=')) {
                    newAttrs += ' style="max-width: 100%; height: auto; border-radius: 8px; margin: 12px 0; display: block;"';
                }
                
                // Přidej alt text pokud chybí (pro lepší accessibility)
                if (!attrs.includes('alt=')) {
                    newAttrs += ' alt="Obrázek z dokumentu"';
                }
                
                // Onerror handler odstraněn - obrázky se zobrazují správně
                
                // Odstraním crossorigin, protože může způsobovat CORS problémy
                // if (!attrs.includes('crossorigin=')) {
                //     newAttrs += ' crossorigin="anonymous"';
                // }
                
                return `<img${newAttrs}>`;
            }
        );
        
        // Debug log pro obrázky a formátování
        if (processedText.includes('<img')) {
            const imgTags = processedText.match(/<img[^>]*>/gi) || [];
            console.log('🖼️ Zpracování zprávy s obrázky - počet:', imgTags.length);
            imgTags.forEach((tag, index) => {
                const srcMatch = tag.match(/src="([^"]*)"/) || tag.match(/src='([^']*)'/);
                if (srcMatch) {
                    console.log(`🖼️ Obrázek ${index + 1} URL:`, srcMatch[1]);
                }
            });
        }
        if (processedText.includes('<h1') || processedText.includes('<h2') || processedText.includes('<h3')) {
            console.log('📝 Zpracování zprávy s nadpisy:', processedText.substring(0, 200) + '...');
        }
        
        return processedText;
    };
    
    const sanitizedHtml = processMessageText(message.text || '');
    
    return (
        <div className={`flex items-start gap-3 max-w-4xl mx-auto group ${isUser ? 'justify-end ml-auto pl-12' : 'justify-start'}`}>
            {!isUser && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-bewit-blue flex items-center justify-center text-white">
                    <BotIcon className="w-5 h-5" />
                </div>
            )}
            <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                <div className={`px-4 py-3 rounded-2xl max-w-xl md:max-w-2xl lg:max-w-3xl shadow-sm ${isUser ? 'bg-bewit-blue text-white rounded-br-none' : 'bg-white text-bewit-dark border border-slate-200 rounded-bl-none'}`}>
                    <div className="prose prose-sm max-w-none text-inherit prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-h4:text-base prose-h5:text-sm prose-h6:text-xs prose-p:my-2 prose-strong:font-bold prose-a:text-bewit-blue hover:prose-a:underline prose-img:block prose-img:max-w-full prose-img:h-auto prose-img:rounded-lg prose-img:mt-3 prose-img:mb-2 prose-img:shadow-md prose-img:object-cover" dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
                    
                    {/* Produktová doporučení - zobrazí se pokud jsou zapnutá v nastavení chatbotu */}
                    {!isUser && message.productRecommendations && message.productRecommendations.length > 0 && 
                     chatbotSettings?.product_recommendations && (
                        <div className="mt-4">
                            {console.log('🎠 Renderuji ProductCarousel s produkty:', message.productRecommendations.length, 'Settings:', chatbotSettings)}
                            <ProductCarousel 
                                products={message.productRecommendations} 
                                showSimilarity={true}
                                title="🛍️ Doporučené produkty"
                            />
                        </div>
                    )}
                    
                    {/* Produktové doporučení na tlačítko - zobrazí se pokud je zapnuté v nastavení */}
                    {!isUser && chatbotSettings?.product_button_recommendations && sessionId && lastUserQuery && (
                        <div className="mt-4">
                            {console.log('🔘 Zobrazuji tlačítko doporučení', { 
                                product_button_recommendations: chatbotSettings?.product_button_recommendations,
                                sessionId: !!sessionId,
                                lastUserQuery: lastUserQuery.substring(0, 30) 
                            })}
                            <ProductRecommendationButton
                                userQuery={lastUserQuery}
                                botResponse={message.text}
                                sessionId={sessionId}
                            />
                        </div>
                    )}
                    
                    {message.sources && message.sources.length > 0 && (
                        <div className={`mt-4 pt-3 border-t ${isUser ? 'border-t-white/30' : 'border-t-slate-200'}`}>
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

const ChatWindow: React.FC<{ 
    messages: ChatMessage[]; 
    isLoading: boolean; 
    onSilentPrompt: (prompt: string) => void;
    shouldAutoScroll?: boolean;
    chatbotSettings?: { 
        product_recommendations: boolean; 
        product_button_recommendations: boolean; 
        book_database: boolean; 
        use_feed_1?: boolean; 
        use_feed_2?: boolean; 
    };
    sessionId?: string;        // 🆕 Pro ProductRecommendationButton
}> = ({ messages, isLoading, onSilentPrompt, shouldAutoScroll = true, chatbotSettings, sessionId }) => {
    const chatEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const [lastMessageCount, setLastMessageCount] = useState(0);
    const [showScrollButton, setShowScrollButton] = useState(false);
    
    useEffect(() => {
        // Pouze scrolluj pokud:
        // 1. Je povoleno auto-scroll
        // 2. Přibyly nové zprávy (ne jen aktualizace existujících)
        // 3. Nebo je loading stav (typing indicator)
        const newMessageAdded = messages.length > lastMessageCount;
        
        if (shouldAutoScroll && (newMessageAdded || isLoading)) {
            console.log('🔄 Auto-scroll:', { 
                shouldAutoScroll, 
                newMessageAdded, 
                isLoading,
                messageCount: messages.length,
                lastCount: lastMessageCount 
            });
            // Auto-scroll pomocí scroll containeru
            setTimeout(() => {
                if (chatContainerRef.current) {
                    chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
                } else {
                    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                }
            }, 100);
            setShowScrollButton(false);
        } else if (!shouldAutoScroll) {
            // Pokud je auto-scroll vypnutý, zkontroluj jestli se změnil obsah zpráv (produkty)
            const hasContentChanges = messages.some((msg, index) => {
                if (index >= lastMessageCount) return false; // Nové zprávy už jsou ošetřené výše
                // Zkontroluj jestli se změnily produktové doporučení v existující zprávě
                return msg.productRecommendations && msg.productRecommendations.length > 0;
            });
            
            if (hasContentChanges || newMessageAdded) {
                console.log('📍 Auto-scroll vypnutý - zobrazuji scroll tlačítko pro nový obsah');
                setShowScrollButton(true);
            }
        }
        
        setLastMessageCount(messages.length);
    }, [messages, isLoading, shouldAutoScroll, lastMessageCount]);
    
    const scrollToBottom = () => {
        // Scrolluj pomocí našeho ref
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        } else {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
        setShowScrollButton(false);
    };
    
    // Funkce pro detekci kdy uživatel scrolluje nahoru
    const handleScroll = useCallback(() => {
        if (chatContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
            const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10; // 10px tolerance
            
            // Zobraz scroll tlačítko pokud není na konci a jsou nějaké zprávy
            if (!isAtBottom && messages.length > 0) {
                setShowScrollButton(true);
            } else {
                setShowScrollButton(false);
            }
        }
    }, [messages.length]);
    
    return (
        <div className="relative flex flex-col h-full">
            {/* Scrollovatelná oblast pro zprávy - fixní výška */}
            <div 
                ref={chatContainerRef}
                className="chat-scroll-container flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6 min-h-0"
                onScroll={handleScroll}
                style={{ 
                    scrollBehavior: 'smooth',
                    /* Firefox scrollbar styling */
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#CBD5E1 #F8FAFC'
                }}
            >
                {messages.length === 0 && !isLoading && (
                    <div className="text-center text-slate-500 flex flex-col items-center justify-center min-h-96">
                        <SanaAILogo className="h-45 w-45 text-bewit-blue opacity-20 mb-4" />
                        <h2 className="text-2xl font-semibold text-bewit-blue">Vítejte v Sana AI!</h2>
                        <p>Jak vám dnes mohu pomoci?</p>
                    </div>
                )}
                {messages.map((msg, index) => {
                    // Pro ProductRecommendationButton potřebujeme znát poslední dotaz uživatele
                    const lastUserQuery = messages
                        .slice(0, index)
                        .reverse()
                        .find(m => m.role === 'user')?.text || '';
                    
                    return (
                        <Message 
                            key={msg.id} 
                            message={msg} 
                            onSilentPrompt={onSilentPrompt} 
                            chatbotSettings={chatbotSettings}
                            sessionId={sessionId}
                            lastUserQuery={lastUserQuery}
                        />
                    );
                })}
                {isLoading && <TypingIndicator />}
                
                {/* Invisible element pro scrollování na konec */}
                <div ref={chatEndRef} />
            </div>
            
            {/* Scroll dolů tlačítko - responsivní pozice */}
            {showScrollButton && (
                <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 z-50">
                    <button
                        onClick={scrollToBottom}
                        className="flex items-center gap-1 sm:gap-2 bg-bewit-blue text-white px-3 py-2 sm:px-4 sm:py-2 rounded-full shadow-lg hover:bg-blue-700 transition-all duration-200 animate-bounce"
                        title="Přejít na konec chatu"
                    >
                        <span className="text-xs sm:text-sm font-medium hidden sm:inline">Nový obsah</span>
                        <span className="text-xs font-medium sm:hidden">↓</span>
                        <svg className="hidden sm:block" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M7 10l5 5 5-5"></path>
                        </svg>
                    </button>
                </div>
            )}
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
    onToggleProductRecommendations?: () => void;
    chatbotSettings?: { 
        product_recommendations: boolean; 
        product_button_recommendations: boolean; 
        book_database: boolean; 
        use_feed_1?: boolean; 
        use_feed_2?: boolean; 
    };
    onClose?: () => void;
}> = ({ onNewChat, onExportPdf, selectedLanguage, onLanguageChange, onToggleFilters, isFilterPanelVisible, onToggleProductRecommendations, chatbotSettings, onClose }) => (
    <header className="bg-bewit-blue text-white shadow-md z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
                <div className="flex items-center space-x-3">
                    <SanaAILogo className="h-10 w-10 text-white" />
                    <span className="text-xl font-bold">SANA AI</span>
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
                        <button onClick={onNewChat} className="flex items-center justify-center h-9 w-9 bg-white/10 hover:bg-white/20 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white" aria-label="Nový chat" title="Nový chat"><NewChatIcon className="h-5 w-5" /></button>
                        <button onClick={onExportPdf} className="flex items-center justify-center h-9 w-9 bg-white/10 hover:bg-white/20 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white" aria-label="Export do PDF" title="Export do PDF"><ExportPdfIcon className="h-5 w-5" /></button>
                        {onClose && (
                            <button onClick={onClose} className="flex items-center justify-center h-9 w-9 bg-white/10 hover:bg-white/20 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white" aria-label="Zavřít chat" title="Zavřít chat">
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
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
const SanaChatContent: React.FC<SanaChatProps> = ({ 
    selectedCategories, 
    selectedLabels, 
    selectedPublicationTypes,
    chatbotSettings = { 
        product_recommendations: false, 
        product_button_recommendations: false, 
        book_database: true,
        use_feed_1: true,
        use_feed_2: true
    },
    onClose
}) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [sessionId, setSessionId] = useState<string>('');
    const [selectedLanguage, setSelectedLanguage] = useState<string>('cs');
    const [autoScroll, setAutoScroll] = useState<boolean>(true);

    useEffect(() => {
        setSessionId(generateSessionId());
        
        // Spustíme KOMPLETNÍ diagnostiku vektorové databáze při prvním načtení
        if (chatbotSettings.product_recommendations) {
            console.log('🔧 Spouštím KOMPLETNÍ diagnostiku vektorové databáze...');
            
            // Nejprve rychlý test
            quickVectorSearchTest().catch(err => {
                console.error('❌ Chyba při rychlé diagnostice:', err);
            });
            
            // Pak kompletní test po 3 sekundách
            setTimeout(() => {
                console.log('🚀 Spouštím kompletní test vektorového vyhledávání...');
                runCompleteVectorTest().then(results => {
                    console.log('🎯 Kompletní test dokončen - výsledky výše v console');
                }).catch(err => {
                    console.error('❌ Chyba při kompletním testu:', err);
                });
            }, 3000);
        }
    }, [chatbotSettings.product_recommendations]);

    const handleSendMessage = useCallback(async (text: string) => {
        if (!text.trim() || !sessionId) return;

        const userMessage: ChatMessage = { id: Date.now().toString(), role: 'user', text: text };
        const newMessages: ChatMessage[] = [...messages, userMessage];
        setMessages(newMessages);
        setIsLoading(true);
        
        // Zapneme auto-scroll při novém dotazu uživatele
        setAutoScroll(true);

        try {
            console.log('🎯 Chatbot settings v SanaChatContent:', {
                book_database: chatbotSettings.book_database,
                product_recommendations: chatbotSettings.product_recommendations,
                willUseCombinedSearch: chatbotSettings.book_database && chatbotSettings.product_recommendations
            });
            
            // Připravíme metadata pro filtry
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
            
            // === KOMBINOVANÉ VYHLEDÁVÁNÍ - OBA ZDROJE NAJEDNOU ===
            if (chatbotSettings.book_database && chatbotSettings.product_recommendations) {
                console.log('🚀 Kombinované vyhledávání: knihy + produkty současně s prioritizací knih');
                
                // Použijeme kombinovanou službu s callback pro postupné zobrazování
                let botMessageId = (Date.now() + 1).toString();
                
                const onBooksReceived = (booksResult: Partial<{ text: string; sources: any[]; productRecommendations: ProductRecommendation[] }>) => {
                    console.log('📚 onBooksReceived callback zavolán v komponentě!', {
                        textLength: booksResult.text?.length || 0,
                        sourcesCount: booksResult.sources?.length || 0,
                        productsCount: booksResult.productRecommendations?.length || 0
                    });
                    
                    const botMessage: ChatMessage = { 
                        id: botMessageId, 
                        role: 'bot', 
                        text: booksResult.text || '', 
                        sources: booksResult.sources || [],
                        productRecommendations: booksResult.productRecommendations
                    };
                    
                    console.log('📚 Přidávám zprávu do messages:', botMessage);
                    setMessages(prev => {
                        const newMessages = [...prev, botMessage];
                        console.log('📚 Nový stav messages:', newMessages.length, 'zpráv');
                        return newMessages;
                    });
                    // Po zobrazení knih zakážeme auto-scroll pro produkty
                    setAutoScroll(false);
                };
                
                const onProductsReceived = (products: ProductRecommendation[]) => {
                    console.log('🛍️ onProductsReceived callback zavolán v komponentě!', {
                        productsCount: products.length,
                        targetMessageId: botMessageId
                    });
                    
                    // Aktualizujeme existující zprávu s produkty
                    setMessages(prev => {
                        const updatedMessages = prev.map(msg => 
                            msg.id === botMessageId 
                                ? { 
                                    ...msg, 
                                    productRecommendations: [
                                        ...(msg.productRecommendations || []),
                                        ...products
                                    ]
                                }
                                : msg
                        );
                        console.log('🛍️ Aktualizoval jsem zprávu s produkty:', updatedMessages.find(m => m.id === botMessageId)?.productRecommendations?.length);
                        return updatedMessages;
                    });
                };
                
                await performCombinedSearch(
                    promptForBackend,
                    sessionId,
                    newMessages.slice(0, -1),
                    currentMetadata,
                    onBooksReceived,
                    onProductsReceived
                );
                
            }
            // === POUZE DATABÁZE KNIH ===
            else if (chatbotSettings.book_database) {
                console.log('📚 Používám pouze webhook pro databázi knih - IGNORUJI produktová doporučení...');
                
                const webhookResult = await sendMessageToAPI(promptForBackend, sessionId, newMessages.slice(0, -1), currentMetadata);
                
                const botMessage: ChatMessage = { 
                    id: (Date.now() + 1).toString(), 
                    role: 'bot', 
                    text: webhookResult.text, 
                    sources: webhookResult.sources || [],
                    // NIKDY nepředávat produktová doporučení pokud je zapnutá pouze databáze knih
                    productRecommendations: undefined
                };
                
                setMessages(prev => [...prev, botMessage]);
                
            }
            // === POUZE PRODUKTOVÉ DOPORUČENÍ - HYBRIDNÍ SYSTÉM ===
            else if (chatbotSettings.product_recommendations) {
                console.log('🛍️ Používám hybridní systém pro produktové doporučení...');
                
                try {
                    // Použij nový hybridní systém s nastavením feedů
                    const useFeed1 = chatbotSettings.use_feed_1 !== false; // default true
                    const useFeed2 = chatbotSettings.use_feed_2 !== false; // default true
                    
                    const hybridProducts = await getHybridProductRecommendations(
                        text.trim(), 
                        sessionId,
                        10,
                        useFeed1,
                        useFeed2
                    );
                    
                    // Konvertuj hybridní produkty na standardní ProductRecommendation formát
                    const productRecommendations: ProductRecommendation[] = hybridProducts.map((product, index) => ({
                        id: product.id || index + 1,
                        product_code: product.product_code,
                        product_name: product.product_name,
                        description: product.description,
                        category: product.category,
                        price: product.price,
                        currency: product.currency,
                        product_url: product.product_url,
                        image_url: product.image_url,
                        similarity_score: product.similarity_score
                    }));
                    
                    const botMessage: ChatMessage = { 
                        id: (Date.now() + 1).toString(), 
                        role: 'bot', 
                        text: productRecommendations.length > 0 ? 
                            `🎯 Našel jsem ${productRecommendations.length} doporučených produktů podle vašich potřeb:` : 
                            '🔍 Bohužel jsem nenašel žádné produkty odpovídající vašemu dotazu.',
                        sources: [],
                        productRecommendations: productRecommendations.length > 0 ? productRecommendations : undefined
                    };
                    
                    setMessages(prev => [...prev, botMessage]);
                    // Po zobrazení produktů zakážeme auto-scroll
                    setAutoScroll(false);
                    
                } catch (error) {
                    console.error('❌ Chyba při hybridním vyhledávání produktů:', error);
                    const errorMessage: ChatMessage = { 
                        id: (Date.now() + 1).toString(), 
                        role: 'bot', 
                        text: `❌ Chyba při vyhledávání produktů: ${error instanceof Error ? error.message : 'Neznámá chyba'}`
                    };
                    setMessages(prev => [...prev, errorMessage]);
                }
            }
            // === ŽÁDNÝ ZDROJ NENÍ ZAPNUTÝ ===
            else {
                console.log('⚠️ Žádný zdroj dat není zapnutý');
                const errorMessage: ChatMessage = { 
                    id: (Date.now() + 1).toString(), 
                    role: 'bot', 
                    text: '⚠️ Není zapnutý žádný zdroj dat. Prosím, zapněte buď databázi knih nebo produktová doporučení v nastavení chatbota.'
                };
                setMessages(prev => [...prev, errorMessage]);
            }
            
        } catch (error) {
            console.error('❌ Chyba v handleSendMessage:', error);
            const errorMessageText = error instanceof Error ? error.message : 'Omlouvám se, došlo k neznámé chybě.';
            const errorMessage: ChatMessage = { id: (Date.now() + 1).toString(), role: 'bot', text: errorMessageText };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    }, [sessionId, messages, selectedLanguage, selectedCategories, selectedLabels, selectedPublicationTypes, chatbotSettings]);
    
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
            
            console.log('Sending silent prompt with current metadata:', currentMetadata);
            
            const instruction = languageInstructions[selectedLanguage];
            const promptForBackend = `${text.trim()} ${instruction}`;
            const { text: botText, sources, productRecommendations } = await sendMessageToAPI(promptForBackend, sessionId, messages, currentMetadata);
            const botMessage: ChatMessage = { 
                id: (Date.now() + 1).toString(), 
                role: 'bot', 
                text: botText, 
                sources: sources,
                productRecommendations: productRecommendations
            };
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


    return (
        <div className="flex flex-col h-full font-sans">
            <main className="flex-1 flex flex-col w-full min-h-0">
                <div id="chat-container-for-pdf" className="w-full flex-1 min-h-0 relative">
                     <ChatWindow 
                        messages={messages} 
                        isLoading={isLoading} 
                        onSilentPrompt={handleSilentPrompt} 
                        shouldAutoScroll={autoScroll} 
                        chatbotSettings={chatbotSettings}
                        sessionId={sessionId}
                     />
                </div>
                <div className="w-full max-w-4xl p-4 md:p-6 bg-bewit-gray flex-shrink-0 border-t border-slate-200 mx-auto">
                    <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
                </div>
            </main>
        </div>
    );
};

const SanaChat: React.FC<SanaChatProps> = ({ 
    selectedCategories, 
    selectedLabels, 
    selectedPublicationTypes,
    chatbotSettings = { 
        product_recommendations: false, 
        product_button_recommendations: false, 
        book_database: true,
        use_feed_1: true,
        use_feed_2: true
    },
    onClose
}) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [sessionId, setSessionId] = useState<string>('');
    const [selectedLanguage, setSelectedLanguage] = useState<string>('cs');
    const [autoScroll, setAutoScroll] = useState<boolean>(true);
    const [isFilterPanelVisible, setIsFilterPanelVisible] = useState<boolean>(false);

    useEffect(() => {
        setSessionId(generateSessionId());
    }, []);

    const handleSendMessage = useCallback(async (text: string) => {
        if (!text.trim() || !sessionId) return;

        const userMessage: ChatMessage = { id: Date.now().toString(), role: 'user', text: text };
        const newMessages: ChatMessage[] = [...messages, userMessage];
        setMessages(newMessages);
        setIsLoading(true);
        
        // Zapneme auto-scroll při novém dotazu uživatele
        setAutoScroll(true);

        try {
            console.log('🎯 Chatbot settings v SanaChat:', {
                book_database: chatbotSettings.book_database,
                product_recommendations: chatbotSettings.product_recommendations,
                willUseCombinedSearch: chatbotSettings.book_database && chatbotSettings.product_recommendations
            });
            
            // Připravíme metadata pro filtry
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
            
            // === KOMBINOVANÉ VYHLEDÁVÁNÍ - OBA ZDROJE NAJEDNOU ===
            if (chatbotSettings.book_database && chatbotSettings.product_recommendations) {
                console.log('🚀 Kombinované vyhledávání: knihy + produkty současně s prioritizací knih');
                
                // Použijeme kombinovanou službu s callback pro postupné zobrazování
                let botMessageId = (Date.now() + 1).toString();
                
                const onBooksReceived = (booksResult: Partial<{ text: string; sources: any[]; productRecommendations: ProductRecommendation[] }>) => {
                    console.log('📚 onBooksReceived callback zavolán v komponentě!', {
                        textLength: booksResult.text?.length || 0,
                        sourcesCount: booksResult.sources?.length || 0,
                        productsCount: booksResult.productRecommendations?.length || 0
                    });
                    
                    const botMessage: ChatMessage = { 
                        id: botMessageId, 
                        role: 'bot', 
                        text: booksResult.text || '', 
                        sources: booksResult.sources || [],
                        productRecommendations: booksResult.productRecommendations
                    };
                    
                    console.log('📚 Přidávám zprávu do messages:', botMessage);
                    setMessages(prev => {
                        const newMessages = [...prev, botMessage];
                        console.log('📚 Nový stav messages:', newMessages.length, 'zpráv');
                        return newMessages;
                    });
                    // Po zobrazení knih zakážeme auto-scroll pro produkty
                    setAutoScroll(false);
                };
                
                const onProductsReceived = (products: ProductRecommendation[]) => {
                    console.log('🛍️ onProductsReceived callback zavolán v komponentě!', {
                        productsCount: products.length,
                        targetMessageId: botMessageId
                    });
                    
                    // Aktualizujeme existující zprávu s produkty
                    setMessages(prev => {
                        const updatedMessages = prev.map(msg => 
                            msg.id === botMessageId 
                                ? { 
                                    ...msg, 
                                    productRecommendations: [
                                        ...(msg.productRecommendations || []),
                                        ...products
                                    ]
                                }
                                : msg
                        );
                        console.log('🛍️ Aktualizoval jsem zprávu s produkty:', updatedMessages.find(m => m.id === botMessageId)?.productRecommendations?.length);
                        return updatedMessages;
                    });
                };
                
                await performCombinedSearch(
                    promptForBackend,
                    sessionId,
                    newMessages.slice(0, -1),
                    currentMetadata,
                    onBooksReceived,
                    onProductsReceived
                );
                
            }
            // === POUZE DATABÁZE KNIH ===
            else if (chatbotSettings.book_database) {
                console.log('📚 Používám pouze webhook pro databázi knih - IGNORUJI produktová doporučení...');
                
                const webhookResult = await sendMessageToAPI(promptForBackend, sessionId, newMessages.slice(0, -1), currentMetadata);
                
                const botMessage: ChatMessage = { 
                    id: (Date.now() + 1).toString(), 
                    role: 'bot', 
                    text: webhookResult.text, 
                    sources: webhookResult.sources || [],
                    // NIKDY nepředávat produktová doporučení pokud je zapnutá pouze databáze knih
                    productRecommendations: undefined
                };
                
                setMessages(prev => [...prev, botMessage]);
                
            }
            // === POUZE PRODUKTOVÉ DOPORUČENÍ - HYBRIDNÍ SYSTÉM ===
            else if (chatbotSettings.product_recommendations) {
                console.log('🛍️ Používám hybridní systém pro produktové doporučení...');
                
                try {
                    // Použij nový hybridní systém s nastavením feedů
                    const useFeed1 = chatbotSettings.use_feed_1 !== false; // default true
                    const useFeed2 = chatbotSettings.use_feed_2 !== false; // default true
                    
                    const hybridProducts = await getHybridProductRecommendations(
                        text.trim(), 
                        sessionId,
                        10,
                        useFeed1,
                        useFeed2
                    );
                    
                    // Konvertuj hybridní produkty na standardní ProductRecommendation formát
                    const productRecommendations: ProductRecommendation[] = hybridProducts.map((product, index) => ({
                        id: product.id || index + 1,
                        product_code: product.product_code,
                        product_name: product.product_name,
                        description: product.description,
                        category: product.category,
                        price: product.price,
                        currency: product.currency,
                        product_url: product.product_url,
                        image_url: product.image_url,
                        similarity_score: product.similarity_score
                    }));
                    
                    const botMessage: ChatMessage = { 
                        id: (Date.now() + 1).toString(), 
                        role: 'bot', 
                        text: productRecommendations.length > 0 ? 
                            `🎯 Našel jsem ${productRecommendations.length} doporučených produktů podle vašich potřeb:` : 
                            '🔍 Bohužel jsem nenašel žádné produkty odpovídající vašemu dotazu.',
                        sources: [],
                        productRecommendations: productRecommendations.length > 0 ? productRecommendations : undefined
                    };
                    
                    setMessages(prev => [...prev, botMessage]);
                    // Po zobrazení produktů zakážeme auto-scroll
                    setAutoScroll(false);
                    
                } catch (error) {
                    console.error('❌ Chyba při hybridním vyhledávání produktů:', error);
                    const errorMessage: ChatMessage = { 
                        id: (Date.now() + 1).toString(), 
                        role: 'bot', 
                        text: `❌ Chyba při vyhledávání produktů: ${error instanceof Error ? error.message : 'Neznámá chyba'}`
                    };
                    setMessages(prev => [...prev, errorMessage]);
                }
            }
            // === ŽÁDNÝ ZDROJ NENÍ ZAPNUTÝ ===
            else {
                console.log('⚠️ Žádný zdroj dat není zapnutý');
                const errorMessage: ChatMessage = { 
                    id: (Date.now() + 1).toString(), 
                    role: 'bot', 
                    text: '⚠️ Není zapnutý žádný zdroj dat. Prosím, zapněte buď databázi knih nebo produktová doporučení v nastavení chatbota.'
                };
                setMessages(prev => [...prev, errorMessage]);
            }
            
        } catch (error) {
            console.error('❌ Chyba v handleSendMessage:', error);
            const errorMessageText = error instanceof Error ? error.message : 'Omlouvám se, došlo k neznámé chybě.';
            const errorMessage: ChatMessage = { id: (Date.now() + 1).toString(), role: 'bot', text: errorMessageText };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    }, [sessionId, messages, selectedLanguage, selectedCategories, selectedLabels, selectedPublicationTypes, chatbotSettings]);
    
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
            
            console.log('Sending silent prompt with current metadata:', currentMetadata);
            
            const instruction = languageInstructions[selectedLanguage];
            const promptForBackend = `${text.trim()} ${instruction}`;
            const { text: botText, sources, productRecommendations } = await sendMessageToAPI(promptForBackend, sessionId, messages, currentMetadata);
            const botMessage: ChatMessage = { 
                id: (Date.now() + 1).toString(), 
                role: 'bot', 
                text: botText, 
                sources: sources,
                productRecommendations: productRecommendations
            };
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
                onToggleFilters={() => setIsFilterPanelVisible(!isFilterPanelVisible)}
                isFilterPanelVisible={isFilterPanelVisible}
                chatbotSettings={chatbotSettings}
                onClose={onClose}
            />
            <main className="flex-1 flex flex-col w-full min-h-0">
                {isProductSyncVisible ? (
                    <div className="w-full h-full flex-1 overflow-y-auto p-6">
                        <ProductSyncAdmin />
                    </div>
                ) : (
                    <>
                        <div id="chat-container-for-pdf" className="w-full flex-1 min-h-0 relative">
                             <ChatWindow 
                                messages={messages} 
                                isLoading={isLoading} 
                                onSilentPrompt={handleSilentPrompt} 
                                shouldAutoScroll={autoScroll} 
                                chatbotSettings={chatbotSettings}
                                sessionId={sessionId}
                             />
                        </div>
                        <div className="w-full max-w-4xl p-4 md:p-6 bg-bewit-gray flex-shrink-0 border-t border-slate-200 mx-auto">
                            <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
                        </div>
                    </>
                )}
            </main>
        </div>
    );
};

// --- KOMPONENTA S FILTERY ---
interface FilteredSanaChatProps {
    chatbotSettings?: {
        product_recommendations: boolean;
        product_button_recommendations: boolean;
        book_database: boolean;
        use_feed_1?: boolean;
        use_feed_2?: boolean;
    };
    onClose?: () => void;
}

const FilteredSanaChat: React.FC<FilteredSanaChatProps> = ({ 
    chatbotSettings = { 
        product_recommendations: false, 
        product_button_recommendations: false, 
        book_database: true,
        use_feed_1: true,
        use_feed_2: true
    },
    onClose
}) => {
    // Uložíme nastavení do state pro správný scope v useCallback
    const [settings, setSettings] = useState(chatbotSettings);
    
    // Aktualizujeme settings když se chatbotSettings změní
    useEffect(() => {
        setSettings(chatbotSettings);
    }, [chatbotSettings]);
    
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
    
    // State pro jazyk a funkce hlavičky
    const [selectedLanguage, setSelectedLanguage] = useState<string>('cs');

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
            
            console.log('🔄 Nastaveny výchozí hodnoty pro filtry (vše zaškrtnuté):', {
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
                
                console.log('📊 Načtená metadata z databáze do Sana chatu:');
                console.log('- Štítky:', labels);
                console.log('- Kategorie:', categories);
                console.log('- Typy publikací:', publicationTypes);
                
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
                console.error('Chyba při načítání metadat z databáze, zůstávám u fallback hodnot:', error);
            }
        };
        
        loadMetadata();
    }, []);

    const toggleFilter = (value: string, selected: string[], setter: (values: string[]) => void) => {
        console.log('Toggle filter:', { value, currentSelected: selected });
        if (selected.includes(value)) {
            const newSelection = selected.filter(item => item !== value);
            console.log('Removing filter, new selection:', newSelection);
            setter(newSelection);
        } else {
            const newSelection = [...selected, value];
            console.log('Adding filter, new selection:', newSelection);
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

    const handleNewChat = useCallback(() => {
        // Reset chat - tady by byla logika pro vymazání zpráv v SanaChatContent
        console.log('🔄 Nový chat v FilteredSanaChat');
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
                                {/* Filter toggle switch */}
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
                                <SanaAILogo className="h-20 w-20 text-white" />
                            </div>
                            
                            {/* Pravá část s funkcemi */}
                            <div className="flex items-center space-x-2 sm:space-x-4">
                                {/* Jazyky */}
                                <div className="flex items-center space-x-2">
                                    {languages.map(lang => (
                                        <button
                                            key={lang.code}
                                            onClick={() => setSelectedLanguage(lang.code)}
                                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                                                selectedLanguage === lang.code
                                                    ? 'bg-white text-bewit-blue ring-2 ring-offset-2 ring-offset-bewit-blue ring-white'
                                                    : 'bg-white/20 hover:bg-white/30 text-white'
                                            }`}
                                            aria-label={`Změnit jazyk na ${lang.label}`}
                                        >
                                            {lang.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="h-6 w-px bg-white/20 hidden sm:block"></div>
                                {/* Funkce tlačítka */}
                                <div className="flex items-center space-x-2">
                                    <button 
                                        onClick={toggleProductSync} 
                                        className={`flex items-center justify-center h-9 w-9 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white ${isProductSyncVisible ? 'bg-white/20 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`} 
                                        aria-label={isProductSyncVisible ? 'Skrýt produkty' : 'Spravovat produkty'} 
                                        title={isProductSyncVisible ? 'Skrýt produkty' : 'Spravovat produkty BEWIT'}
                                    >
                                        <ProductIcon className="h-5 w-5" />
                                    </button>
                                    <button onClick={handleNewChat} className="flex items-center justify-center h-9 w-9 bg-white/10 hover:bg-white/20 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white" aria-label="Nový chat" title="Nový chat">
                                        <NewChatIcon className="h-5 w-5" />
                                    </button>
                                    <button onClick={handleExportPdf} className="flex items-center justify-center h-9 w-9 bg-white/10 hover:bg-white/20 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white" aria-label="Export do PDF" title="Export do PDF">
                                        <ExportPdfIcon className="h-5 w-5" />
                                    </button>
                                    {onClose && (
                                        <button onClick={onClose} className="flex items-center justify-center h-9 w-9 bg-white/10 hover:bg-white/20 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white" aria-label="Zavřít chat" title="Zavřít chat">
                                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Chat komponenta nebo ProductSync */}
                <div className="flex-1 bg-bewit-gray min-h-0">
                    {isProductSyncVisible ? (
                        <div className="w-full h-full flex-1 overflow-y-auto p-6">
                            <ProductSyncAdmin />
                        </div>
                    ) : (
                        <SanaChatContent 
                            selectedCategories={selectedCategories}
                            selectedLabels={selectedLabels}
                            selectedPublicationTypes={selectedPublicationTypes}
                            chatbotSettings={settings}
                            onClose={onClose}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export { SanaChat, SanaChatContent, FilteredSanaChat };
export default FilteredSanaChat;
