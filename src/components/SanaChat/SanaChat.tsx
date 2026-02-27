
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { supabase as supabaseClient } from '../../lib/supabase';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import ProductSyncAdmin from './ProductSync';
import { ProductCarousel } from '../ProductCarousel';
import { ProductRecommendationButton } from '../ProductRecommendationButton';
import { ProductFunnelMessage } from '../ProductFunnelMessage';  // NEW Product Funnel UI
import { ManualFunnelButton } from '../ManualFunnelButton';  // NEW Manuální funnel spouštěč
import { ProductRecommendation } from '../../services/productSearchService';
import { generateProductResponse, convertChatHistoryToGPT } from '../../services/gptService';
import { quickVectorSearchTest } from '../../services/vectorDiagnostics';
import { runCompleteVectorTest } from '../../services/testVectorSearch';
import { requestProductRecommendations, convertWebhookProductsToCarousel } from '../../services/webhookProductService';
import { performCombinedSearch } from '../../services/combinedSearchService';
import { getHybridProductRecommendations, HybridProductRecommendation } from '../../services/hybridProductService';
// 🆕 Intent Routing pro Wany Chat (routing agent - rozhoduje směr: chat vs funnel)
import { routeUserIntent, extractProductsFromHistory, enrichFunnelProductsFromDatabase, RecommendedProduct } from '../../services/intentRoutingService';
// 🆕 Inline Product Screening & Matching (product pills)
import { screenTextForProducts } from '../../services/inlineProductScreeningService';
import { matchProductNames } from '../../services/productNameMatchingService';
// FunnelProduct typ pro metadata ve zprávě
import type { FunnelProduct } from '../../services/productFunnelService';
// 🆕 Jednotná hlavička chatu
import ChatHeader from '../ui/ChatHeader';
// 🆕 LoadingPhrases pro animované loading texty
import LoadingPhrases from './LoadingPhrases';
// 🆕 WaveLoader - animovaný loader s pulzujícími kroužky
import WaveLoader from './WaveLoader';
// 🆕 User typ pro informace o přihlášeném uživateli
import { User } from '../../services/customAuthService';
// 🆕 Chat History Service - ukládání párů otázka-odpověď
import { saveChatPairToHistory } from '../../utils/chatHistoryUtils';
// 🆕 JEDNODUCHÁ SUMARIZACE
import { createSimpleSummary } from '../../services/simpleChatSummary';
// 🔗 Product Link Service - pro přidání tokenu do URL
import { openBewitProductLink } from '../../services/productLinkService';
// 🔗 Problem Classification & Pairing Service - párování produktů s kombinacemi
import { classifyProblemFromUserMessage } from '../../services/problemClassificationService';
import { matchProductCombinationsWithProblems } from '../../services/productPairingService';
// 🌿 EO Směsi Workflow Service - zpracování EO Směsi dotazů
import { processEoSmesiQuery, processEoSmesiQueryWithKnownProblem } from '../../services/eoSmesiWorkflowService';
// 🔍 Problem Selection Form - formulář pro výběr problému (EO Směsi Chat)
import { ProblemSelectionForm } from './ProblemSelectionForm';
// 🔍 Feed Agent - vyhledávač produktů
import { searchProductsAutocomplete } from '../../feedAgent/feedAgentService';
// Chatbot Settings Service - načítání nastavení chatbotů z databáze
import { ChatbotSettingsService } from '../../services/chatbotSettingsService';

// Declare global variables from CDN scripts for TypeScript
declare const jspdf: any;
declare const html2canvas: any;

// 🆕 Custom sanitize schema - přidáme product:// protokol do whitelist
const customSanitizeSchema = structuredClone(defaultSchema);
// Přidáme 'product' do povolených protokolů pro href
if (customSanitizeSchema.protocols && customSanitizeSchema.protocols.href) {
    customSanitizeSchema.protocols.href.push('product');
} else if (customSanitizeSchema.protocols) {
    customSanitizeSchema.protocols.href = ['http', 'https', 'mailto', 'product'];
} else {
    customSanitizeSchema.protocols = {
        href: ['http', 'https', 'mailto', 'product']
    };
}

// API functions for loading metadata
const api = {
    async getLabels(): Promise<Array<{id: string, name: string}>> {
        const { data, error } = await supabaseClient
            .from('labels')
            .select('id, name')
            .order('name');
        if (error) {
            return [];
        }
        return data || [];
    },
    
    async getCategories(): Promise<Array<{id: string, name: string}>> {
        const { data, error} = await supabaseClient
            .from('categories')
            .select('id, name')
            .order('name');
        if (error) {
            return [];
        }
        return data || [];
    },
    
    async getPublicationTypes(): Promise<Array<{id: string, name: string}>> {
        const { data, error } = await supabaseClient
            .from('publication_types')
            .select('id, name')
            .order('name');
        if (error) {
            return [];
        }
        return data || [];
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
  matchedProducts?: any[]; // 🆕 Matched produkty z name matching
  // NEW Product Funnel data (pro Wany Chat)
  isFunnelMessage?: boolean;
  funnelProducts?: FunnelProduct[];
  symptomList?: string[];
  // Intent type pro update funnel
  isUpdateFunnel?: boolean;        // Uživatel chce změnit výběr v existujícím funnelu
  // NEW Flag pro žlutý callout (více než 2 produkty)
  hasCallout?: boolean;             // True = zobrazil se žlutý callout "Potřebujete přesnější doporučení?"
  // 🔗 Pairing info - párování produktů s kombinacemi z leceni
  pairingInfo?: {
    prawteins: string[];
    tcmWans: string[];
    aloe: boolean;
    aloeProductName?: string;  // Konkrétní název Aloe produktu (např. "Aloe Vera Immunity")
    merkaba: boolean;
    aloeUrl?: string;    // URL pro Aloe produkt (textový odkaz)
    merkabaUrl?: string; // URL pro Merkaba produkt (textový odkaz)
    companionProducts?: Array<{ name: string; url?: string | null; thumbnail?: string | null; category?: string }>;  // Doprovodné produkty (Panacea) - is_companion=true
  };
  // SEARCH Problem Selection Form (pro EO Směsi Chat - mezikrok)
  requiresProblemSelection?: boolean;  // Flag: zobrazit formulář pro výběr problému?
  problemSelectionSubmitted?: boolean; // Flag: formulář byl odeslán, tlačítko se zablokuje
  uncertainProblems?: string[];        // Seznam problémů k výběru
  hideProductCallout?: boolean;        // Skryje "Související produkty BEWIT" callout (produkty jsou jen jako pills v textu)
}

// Rozhraní pro metadata filtrace
interface ChatMetadata {
  categories?: string[];
  labels?: string[];
  publication_types?: string[];
}

// Props pro SanaChat komponentu
interface SanaChatProps {
  currentUser?: User;  // NEW Přihlášený uživatel
  selectedCategories: string[];
  selectedLabels: string[];
  selectedPublicationTypes: string[];
  chatbotSettings?: {
    product_recommendations: boolean;
    product_button_recommendations: boolean;  // NEW Produktové doporučení na tlačítko
    inline_product_links?: boolean;  // NEW Inline produktové linky (ChatGPT styl)
    book_database: boolean;
    use_feed_1?: boolean;  // NEW Použít Feed 1 (zbozi.xml)
    use_feed_2?: boolean;  // NEW Použít Feed 2 (Product Feed 2)
    webhook_url?: string;  // NEW N8N webhook URL pro tento chatbot
    enable_product_router?: boolean;  // NEW Zapnutí/vypnutí automatického produktového routeru
    enable_manual_funnel?: boolean;   // NEW Zapnutí manuálního funnel spouštěče
    summarize_history?: boolean;  // NEW Automatická sumarizace historie pro N8N webhook
    allowed_product_categories?: string[];  // NEW Povolené produktové kategorie pro filtrování Product Pills
    show_sources?: boolean;  // NEW Zobrazovat zdroje v odpovědích
    group_products_by_category?: boolean;  // NEW Grupování produktů podle kategorií
    enable_product_pairing?: boolean;  // NEW Párování kombinací produktů
    enable_product_search?: boolean;   // SEARCH Vyhledávač produktů (Feed Agent toggle)
  };
  chatbotId?: string;  // NEW ID chatbota (pro Sana 2 markdown rendering)
  originalChatbotId?: string;  // NEW Původní ID chatbota před přepnutím
  onClose?: () => void;
  onSessionReady?: (sessionId: string) => void;  // Callback při vytvoření session (pro feedback)
  onSwitchToUniversal?: () => void;  // Přepnutí na Universal chatbot (tlačítko Poradce)
  modeSwitch?: React.ReactNode;  // SEARCH Toggle UI - předaný zvenku
  searchMode?: boolean;           // SEARCH Vyhledávací mód - přepnutí chování inputu
  externalUserInfo?: {  // NEW External user data z iframe embedu
    external_user_id?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    position?: string;
    token_eshop?: string;  // NEW E-shop token z Bewit webu
    [key: string]: any;
  };
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

const UserIcon: React.FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);

const FlaskIcon: React.FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M9 3h6M10 9h4M10 3v6l-4 8a2.5 2.5 0 0 0 2 3.5h8a2.5 2.5 0 0 0 2-3.5l-4-8V3" />
    </svg>
);

// --- TOGGLE BUTTON COMPONENT ---
const AdvisorToggleButton: React.FC<{
    chatbotId?: string;
    onClick: () => void;
}> = ({ chatbotId, onClick }) => {
    const isUniversal = chatbotId === 'universal';
    
    return (
        <div className="mt-3 flex justify-end">
            <button
                onClick={onClick}
                className="group relative h-10 w-48 rounded-lg border border-bewit-blue text-bewit-blue bg-transparent hover:bg-bewit-blue/5 transition-all duration-300 overflow-hidden shadow-sm hover:shadow-md"
            >
                {/* Přední strana: Obecný poradce */}
                <div 
                    className={`absolute inset-0 flex items-center justify-center gap-2 transition-all duration-500 ease-in-out ${
                        isUniversal 
                            ? '-translate-y-full opacity-0' 
                            : 'translate-y-0 opacity-100'
                    }`}
                >
                    <UserIcon className="w-4 h-4" />
                    <span className="text-sm font-semibold">Obecný poradce</span>
                </div>
                
                {/* Zadní strana: Poradce Bewit produktů */}
                <div 
                    className={`absolute inset-0 flex items-center justify-center gap-2 transition-all duration-500 ease-in-out ${
                        isUniversal 
                            ? 'translate-y-0 opacity-100' 
                            : 'translate-y-full opacity-0'
                    }`}
                >
                    <FlaskIcon className="w-4 h-4" />
                    <span className="text-sm font-semibold">Poradce Bewit produktů</span>
                </div>
            </button>
        </div>
    );
};

const SendIcon: React.FC<IconProps> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
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

const SanaAILogo: React.FC<React.ImgHTMLAttributes<HTMLImageElement>> = (props) => (
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

const SparklesIcon: React.FC<IconProps> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="m12 3 1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3Z" />
        <path d="M5 3v4" />
        <path d="M19 17v4" />
        <path d="M3 5h4" />
        <path d="M17 19h4" />
    </svg>
);

const CheckIcon: React.FC<IconProps> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const FilterIcon: React.FC<IconProps> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
    </svg>
);

// --- CHAT SERVICE (from services/chatService.ts) ---
// Default webhook URL (fallback pro starší chatboty bez nastaveného webhook_url)
const DEFAULT_N8N_WEBHOOK_URL = 'https://n8n.srv980546.hstgr.cloud/webhook/97dc857e-352b-47b4-91cb-bc134afc764c/chat';

// N8N někdy vrací globální disclaimer na začátku odpovědi – nechceme ho zobrazovat v UI.
const stripN8nDisclaimerPrefix = (text: string): string => {
    const trimmed = text.trimStart();
    if (!/^Upozornění\s*:/i.test(trimmed)) return text;

    // Odfiltruj jen ten konkrétní standardní blok, ne libovolné "Upozornění" v běžném obsahu.
    const looksLikeStandardDisclaimer =
        /Tento nástroj slouží výhradně k vzdělávacím/i.test(trimmed) &&
        /nenahrazuje odborné lékařské doporučení/i.test(trimmed);

    if (!looksLikeStandardDisclaimer) return text;

    let out = trimmed.replace(
        /^Upozornění\s*:\s*[\s\S]*?může obsahovat nepřesnosti\.?\s*(\r?\n){2,}/i,
        ''
    );

    // Fallback: pokud se neshodl konec věty, odřízni první blok po dvojitém odřádkování.
    if (out === trimmed) {
        out = trimmed.replace(/^Upozornění\s*:\s*[\s\S]*?(\r?\n){2,}/i, '');
    }

    return out.trimStart();
};

// Stará trigger funkce odstraněna - používáme createSimpleSummary

const sendMessageToAPI = async (
    message: string, 
    sessionId: string, 
    history: ChatMessage[], 
    metadata?: ChatMetadata, 
    webhookUrl?: string, 
    chatbotId?: string,
    intent?: 'chat' | 'funnel' | 'update_funnel',  // NEW Intent pro N8N routing
    detectedSymptoms?: string[],  // NEW Symptomy pro N8N (i když je intent chat)
    currentUser?: User,  // NEW Informace o přihlášeném uživateli
    externalUserInfo?: {  // NEW External user data z iframe embedu
        external_user_id?: string;
        first_name?: string;
        last_name?: string;
        email?: string;
        position?: string;
        token_eshop?: string;  // NEW E-shop token z Bewit webu
        [key: string]: any;
    },
    summarizedHistory?: string[],  // NEW Sumarizovaná historie (místo plné historie)
    allowedProductCategories?: string[],  // NEW Povolené produktové kategorie pro filtrování
    pairedProductNames?: string[],  // NEW Názvy produktů z SQL párování
    enableProductScreening?: boolean  // NEW Pokud false, přeskočí screening produktů z textu
): Promise<{ text: string; sources: Source[]; productRecommendations?: ProductRecommendation[]; matchedProducts?: any[] }> => {
    try {
        // Log message info
        console.log('📤 Sending message:', message.substring(0, 100) + (message.length > 100 ? '...' : ''));
        
        // Použij webhook URL z nastavení chatbota (pokud je nastavený), jinak fallback na default
        const N8N_WEBHOOK_URL = webhookUrl || DEFAULT_N8N_WEBHOOK_URL;
        
        const payload: any = {
            sessionId: sessionId,
            action: "sendMessage",
            chatInput: message,
            chatHistory: history,  // HOT Historie už je připravená (buď sumarizace nebo normální zprávy)
            intent: intent || 'chat',
        };
        
        // NEW Pokud byly detekovány symptomy, přidáme je do payloadu (i pro chat intent)
        if (detectedSymptoms && detectedSymptoms.length > 0) {
            payload.detectedSymptoms = detectedSymptoms;
        }

        // Přidej metadata pouze pokud obsahují zaškrtnuté filtry
        if (metadata && Object.keys(metadata).length > 0) {
            payload.metadata = metadata;
        }

        // NEW VŽDY přidej pole user (prázdné nebo plné) - stejná struktura jako Wany.chat
        // Priorita: localStorage (BEWIT_USER_DATA) > externalUserInfo (z iframe embedu) > currentUser (přihlášený) > prázdné
        
        // SAVE NOVÉ: Načti data z localStorage (fallback pro situace, kdy postMessage nefungoval)
        let localStorageUser = null;
        try {
            const stored = localStorage.getItem('BEWIT_USER_DATA');
            if (stored) {
                localStorageUser = JSON.parse(stored);
            }
        } catch (e) {
            // Silent fail
        }
        
        // OK PRIORITA: localStorage > externalUserInfo > currentUser > prázdné
        payload.user = localStorageUser ? {
            id: String(localStorageUser.id || ""),
            email: localStorageUser.email || "",
            firstName: localStorageUser.firstName || "",
            lastName: localStorageUser.lastName || "",
            role: localStorageUser.position || "",  // position se mapuje na role
            tokenEshop: localStorageUser.tokenEshop || ""  // NEW E-shop token
        } : externalUserInfo ? {
            id: externalUserInfo.external_user_id || "",
            email: externalUserInfo.email || "",
            firstName: externalUserInfo.first_name || "",
            lastName: externalUserInfo.last_name || "",
            role: externalUserInfo.position || "",  // position se mapuje na role
            tokenEshop: externalUserInfo.token_eshop || ""  // NEW E-shop token
        } : currentUser ? {
            id: currentUser.id,
            email: currentUser.email,
            firstName: currentUser.firstName,
            lastName: currentUser.lastName,
            role: currentUser.role,
            tokenEshop: ""  // Prázdný pro interní uživatele
        } : {
            id: "",
            email: "",
            firstName: "",
            lastName: "",
            role: "",
            tokenEshop: ""  // Prázdný pro anonymní
        };
        
        
        let responsePayload;
        
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
        let botText = responsePayload?.output ||  // NEW Pro Sana 2 markdown (priorita)
                     responsePayload?.html || 
                     responsePayload?.text || 
                     responsePayload?.content ||
                     responsePayload?.response ||
                     responsePayload?.message ||
                     responsePayload?.result;
                     
        if (typeof botText !== 'string') {
             const fallbackMessage = 'Odpověď ze serveru neobsahovala text nebo byl ve špatném formátu.';
             const debugInfo = `<br/><br/><small style="color: #6b7280; font-family: sans-serif;">Přijatá data: <code style="background-color: #f3f4f6; padding: 2px 4px; border-radius: 4px; font-family: monospace;">${JSON.stringify(data, null, 2)}</code></small>`;
             throw new Error(fallbackMessage + debugInfo);
        }
        
        // Správné zpracování odpovědi z N8N
        let finalBotText = botText;
        
        // Pokud přišlo HTML z N8N (ne markdown), zpracuj ho
        if (responsePayload?.html || (botText.includes('<style>') || botText.includes('<div class="chatgpt-text">'))) {
            // Odstraň pouze <style> bloky
            finalBotText = botText
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                .trim();
                
            // Pokud je obsah wrapenovan v div class="chatgpt-text", extrahuj obsah
            const chatgptMatch = finalBotText.match(/<div class="chatgpt-text"[^>]*>([\s\S]*)<\/div>\s*$/i);
            if (chatgptMatch) {
                finalBotText = chatgptMatch[1].trim();
            }
        }
        
        // NEW Pro markdown (Sana 2): Odstraň sekci "Zdroje:" pokud jsou sources v samostatném poli
        if (responsePayload?.sources && responsePayload.sources.length > 0 && finalBotText.includes('### Zdroje:')) {
            // Odstraň vše od "### Zdroje:" až do konce
            finalBotText = finalBotText.replace(/###\s*Zdroje:[\s\S]*$/i, '').trim();
        }

        // 🧹 Odstraň standardní disclaimer prefix, pokud ho N8N přidá do odpovědi
        finalBotText = stripN8nDisclaimerPrefix(finalBotText);

        // NEW PRODUCT NAME MATCHING - Screening produktů a matching proti databázi
        let matchedProducts: any[] = [];
        
        if (enableProductScreening !== false) try {
            // 1. Screening - extrakce názvů produktů z textu pomocí GPT
            const screeningResult = await screenTextForProducts(finalBotText);
            
            // 2. Spojení názvů z textu + názvů z SQL párování
            const allProductNames = [
                ...(screeningResult.success ? screeningResult.products : []),
                ...(pairedProductNames || [])
            ];
            
            if (allProductNames.length > 0) {
                
                // 3. Matching - vyhledání VŠECH produktů v databázi (včetně párovaných!)
                // NEW PŘEDÁVÁME POVOLENÉ KATEGORIE pro filtrování PŘED matchingem
                const matchingResult = await matchProductNames(allProductNames, allowedProductCategories);
                
                if (matchingResult.success && matchingResult.matches.length > 0) {
                    
                    // Produkty jsou už vyfiltrované podle kategorií v matchProductNames
                    matchedProducts = matchingResult.matches;
                    
                    // NEW PŘIDAT PRODUKTY INLINE PŘÍMO DO TEXTU
                    // Odstraň duplicity (stejný product_code)
                    const uniqueProducts = matchedProducts.filter((product, index, self) =>
                        index === self.findIndex((p) => p.product_code === product.product_code)
                    );
                    
                    // Pro každý produkt najdeme výskyt v textu a vložíme tlačítko HNED ZA NÍM
                    uniqueProducts.forEach((product) => {
                        const searchTerms = [
                            product.matched_from, // Původní název z GPT
                            product.pinyin_name,   // Pinyin název
                            product.product_name   // Název produktu
                        ].filter(Boolean);
                        
                        let inserted = false;
                        for (const term of searchTerms) {
                            // Escapujeme speciální znaky v term
                            const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                            
                            // Najdeme výskyt term v textu
                            const termRegex = new RegExp(`\\b${escapedTerm}\\b`, 'i');
                            const match = finalBotText.match(termRegex);
                            
                            if (match && !inserted) {
                                const matchStart = match.index!;
                                let matchEnd = matchStart + match[0].length;
                                
                                // NEW DŮLEŽITÉ: Musíme přeskočit markdown formátování za názvem produktu
                                // Hledáme **, *, ___, __, _ apod. které ukončují bold/italic
                                let afterMatch = finalBotText.substring(matchEnd);
                                let markdownEndOffset = 0;
                                
                                // Zkontroluj, jestli následuje ** (bold)
                                if (afterMatch.startsWith('**')) {
                                    markdownEndOffset = 2;
                                }
                                // Zkontroluj, jestli následuje * (italic)
                                else if (afterMatch.startsWith('*')) {
                                    markdownEndOffset = 1;
                                }
                                // Zkontroluj, jestli následuje __ (bold)
                                else if (afterMatch.startsWith('__')) {
                                    markdownEndOffset = 2;
                                }
                                // Zkontroluj, jestli následuje _ (italic)
                                else if (afterMatch.startsWith('_')) {
                                    markdownEndOffset = 1;
                                }
                                
                                // Posun pozici za markdown markup
                                matchEnd += markdownEndOffset;
                                
                                // NEW Vytvoříme speciální marker pro produkt
                                // Formát: <<<PRODUCT:{code}|||{url}|||{name}|||{pinyin}>>>
                                const productMarker = ` <<<PRODUCT:${product.product_code}|||${product.url}|||${product.product_name}|||${product.pinyin_name}>>>`;
                                
                                // Vložíme marker hned za název produktu (a za markdown markup)
                                finalBotText = finalBotText.slice(0, matchEnd) + productMarker + finalBotText.slice(matchEnd);
                                
                                inserted = true;
                                break;
                            }
                        }
                    });
                } else {
                }
            } else {
            }
        } catch (screeningError) {
            // Screening chyba není kritická - nezpůsobí selhání celé odpovědi
        }

        return {
            text: finalBotText,
            sources: responsePayload?.sources || [],
            productRecommendations: undefined,
            matchedProducts: matchedProducts, // 🆕 Přidáme matched produkty pro inline zobrazení
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
        
        // Pro chyby z našeho vlastního error handlingu (již obsahují HTML formátování)
        if (error instanceof Error && error.message.includes('N8N workflow selhalo')) {
            throw error;
        }
        
        if (error instanceof Error) throw error;
        throw new Error('Došlo k neznámé chybě při komunikaci se serverem.');
    }
};
const startNewChatOnAPI = () => {};


// --- UI COMPONENTS (from components/*.tsx) ---

const SourcePill: React.FC<{ source: Source }> = ({ source }) => (
    <a href={source.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 bg-bewit-lightBlue text-bewit-blue text-xs font-medium px-3 py-1.5 rounded-full hover:bg-blue-200/70 transition-colors">
        <LinkIcon className="h-3 w-3" />
        <span>{source.title || new URL(source.uri).hostname}</span>
    </a>
);

// Tlačítko "Chci o produktech vědět víc" - pošle produkty do EO Směsi chatu a zobrazí odpověď v chatu
const EoSmesiLearnMoreButton: React.FC<{
    matchedProducts: any[];
    sessionId?: string;
    onAddMessage?: (message: ChatMessage) => void;
    companionProducts?: Array<{ name: string; url?: string | null; thumbnail?: string | null; category?: string }>;
    isCompanionOpen?: boolean;
}> = ({ matchedProducts, sessionId, onAddMessage, companionProducts, isCompanionOpen }) => {
    const [isLoading, setIsLoading] = React.useState(false);
    const [isDone, setIsDone] = React.useState(false);

    const handleClick = async () => {
        if (isLoading || isDone) return;
        setIsLoading(true);
        try {
            const mainNames = matchedProducts
                .map((p: any) => p.product_name || p.productName)
                .filter(Boolean)
                .join(', ');
            const companionNames = isCompanionOpen && companionProducts?.length
                ? ', ' + companionProducts.map(p => p.name).join(', ')
                : '';
            const chatInput = `najdi mi informace k těmto produktům: ${mainNames}${companionNames}. Odpověz v češtině.`;

            let userData = { id: '', email: '', firstName: '', lastName: '', role: '', tokenEshop: '' };
            try {
                const stored = localStorage.getItem('BEWIT_USER_DATA');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    userData = {
                        id: String(parsed.id || ''),
                        email: parsed.email || '',
                        firstName: parsed.firstName || '',
                        lastName: parsed.lastName || '',
                        role: parsed.position || '',
                        tokenEshop: parsed.tokenEshop || ''
                    };
                }
            } catch (_e) {}

            const EO_SMESI_WEBHOOK = 'https://n8n.srv980546.hstgr.cloud/webhook/20826009-b007-46b2-8d90-0c461113d263/chat';
            const payload = {
                sessionId: sessionId || '',
                action: 'sendMessage',
                chatInput,
                chatHistory: [],
                intent: 'chat',
                metadata: {
                    categories: ['CnC', 'EO_Smesi', 'Prawteiny', 'Wany'],
                    publication_types: ['internal_bewit', 'public_clients', 'students']
                },
                user: userData
            };

            console.log('📤 N8N Webhook Payload (EO Směsi):', payload);

            const response = await fetch(EO_SMESI_WEBHOOK, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            const botText: string = data.output || data.text || data.message || '';

            if (onAddMessage && botText) {
                // Extrahujeme matchedProducts z odpovědi webhooku (pokud jsou)
                const webhookMatchedProducts: any[] = data.matchedProducts || [];

                // Sloučíme produkty z calloutu s produkty z webhooku (bez duplicit)
                const calloutProductCodes = new Set(
                    matchedProducts.map((p: any) => p.product_code).filter(Boolean)
                );
                const mergedProducts = [
                    ...matchedProducts,
                    ...webhookMatchedProducts.filter(
                        (p: any) => !calloutProductCodes.has(p.product_code)
                    )
                ];

                // Injektujeme <<<PRODUCT:>>> markery za nadpisy produktů v textu.
                // N8N text může mít nadpisy: "### 1. Nopa Nr", "**Frankincense Quattuor**", "3. PRAWTEIN Mig" atd.
                // N8N často zkracuje název (např. "Nopa Nr esenciální olej" → nadpis "1. Nopa Nr")
                // Proto: hledáme POUZE v nadpisových řádcích a matchujeme nejdistinktivnější slova produktu.
                // Logika: nadpis musí obsahovat aspoň 1 slovo z DB názvu (min. 4 znaky), které není obecné.
                // Obecná slova která ignorujeme: "olej", "esenciální", "směs", "směsi", "plus"
                const GENERIC_WORDS = new Set(['olej', 'esencialni', 'smesi', 'smes', 'plus', 'esenciální']);

                let enrichedText = botText;
                const lines = enrichedText.split('\n');
                const resultLines: string[] = [];
                const usedProductCodes = new Set<string>(); // každý produkt max jednou

                for (const line of lines) {
                    // Detekujeme zda jde o nadpisový řádek
                    const isHeading = /^#{1,4}\s/.test(line)         // ## Nadpis
                        || /^\*\*[^*]+\*\*\s*$/.test(line.trim())   // **Nadpis**
                        || /^\d+\.\s+\S/.test(line);                 // 1. Nadpis

                    resultLines.push(line);

                    if (!isHeading) continue;

                    const lineLower = line.toLowerCase();

                    // Pro každý produkt zkontrolujeme zda jeho distinktivní slova jsou v nadpisu
                    for (const product of mergedProducts) {
                        if (!product.product_name || !product.product_code || !product.url) continue;
                        if (usedProductCodes.has(product.product_code)) continue;

                        // Distinktivní slova: vše >= 4 znaky, co není obecné
                        const distinctWords = product.product_name
                            .split(/\s+/)
                            .filter((w: string) => {
                                const wl = w.toLowerCase().replace(/[^a-záčďéěíňóřšťůúýž]/g, '');
                                return wl.length >= 4 && !GENERIC_WORDS.has(wl);
                            });

                        if (distinctWords.length === 0) continue;

                        // Nadpis musí obsahovat VŠECHNA distinktivní slova
                        const allDistinctPresent = distinctWords.every((w: string) =>
                            lineLower.includes(w.toLowerCase())
                        );

                        if (allDistinctPresent) {
                            const marker = `<<<PRODUCT:${product.product_code}|||${product.url}|||${product.product_name}|||${product.pinyin_name || product.product_name}>>>`;
                            resultLines.push(marker);
                            usedProductCodes.add(product.product_code);
                            break;
                        }
                    }
                }

                enrichedText = resultLines.join('\n');

                const botMessage: ChatMessage = {
                    id: `eo-smesi-${Date.now()}`,
                    role: 'bot',
                    text: `> *Informace z EO Směsi chatu*\n\n${enrichedText}`,
                    sources: data.sources || [],
                    matchedProducts: mergedProducts,
                    hasCallout: false,
                    hideProductCallout: true,
                };
                onAddMessage(botMessage);
                setIsDone(true);
            } else if (!botText) {
                // Silent fail
            }
        } catch (err) {
            // Silent error
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="mt-4 pt-4 border-t border-blue-100 flex flex-col gap-2">
            <button
                onClick={handleClick}
                disabled={isLoading || isDone}
                className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3 bg-gradient-to-r from-bewit-blue to-blue-600 text-white rounded-xl text-sm font-bold hover:from-blue-700 hover:to-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-blue-200/50 active:scale-[0.98] border border-blue-400/20 group"
            >
                {isLoading ? (
                    <>
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span>Hledám informace...</span>
                    </>
                ) : isDone ? (
                    <>
                        <CheckIcon className="w-5 h-5" />
                        <span>Informace zobrazeny níže</span>
                    </>
                ) : (
                    <>
                        <SparklesIcon className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                        <span>Chci o těchto produktech vědět více</span>
                    </>
                )}
            </button>
        </div>
    );
};

// 🆕 Komponenta pro inline produktové tlačítko (ChatGPT style)
const ProductPill: React.FC<{ 
    productName: string; 
    pinyinName: string;
    url: string; 
    similarity?: number;
    token?: string;  // NEW Token z externalUserInfo
}> = ({ productName, pinyinName, url, similarity, token }) => {
    const [isHovered, setIsHovered] = React.useState(false);
    
    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        // 🔗 Otevřeme URL s tokenem (pokud existuje)
        openBewitProductLink(url, token, '_blank');
    };
    
    return (
        <a 
            href={url} 
            onClick={handleClick}
            className="relative overflow-hidden inline-flex items-center h-8 px-4 rounded-full bg-transparent text-gray-700 text-sm font-medium border border-gray-300 transition-all duration-300 cursor-pointer ml-1"
            title={similarity ? `${pinyinName} - Shoda: ${(similarity * 100).toFixed(0)}%` : pinyinName}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                position: 'relative',
                overflow: 'hidden',
                color: isHovered ? '#fff' : '#374151',
                borderColor: isHovered ? 'transparent' : '#d1d5db',
            }}
        >
            {/* Modrý gradient background - slides in on hover */}
            <div 
                style={{
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    borderRadius: 'inherit',
                    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)', // Modrý gradient podle aplikace
                    transform: isHovered ? 'scaleX(1)' : 'scaleX(0)',
                    transformOrigin: '0 50%',
                    transition: 'all 0.475s',
                    zIndex: 0,
                }}
            />
            <span className="relative z-10">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({node, ...props}) => <span {...props} />,
                    strong: ({node, ...props}) => <strong style={{fontWeight: 'bold'}} {...props} />,
                    em: ({node, ...props}) => <em style={{fontStyle: 'italic'}} {...props} />,
                  }}
                >
                  {productName}
                </ReactMarkdown>
            </span>
        </a>
    );
};

// 🆕 Komponenta pro produktové tlačítko v callout boxu (EO Směsi design)
const ProductCalloutButton: React.FC<{
    productName: string;
    pinyinName?: string;
    thumbnail?: string;
    url: string;
    token?: string;
}> = ({ productName, pinyinName, thumbnail, url, token }) => {
    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        openBewitProductLink(url, token, '_blank');
    };

    return (
        <button
            onClick={handleClick}
            className="w-full flex items-center gap-3 p-2.5 bg-white border border-slate-200 hover:border-blue-300 rounded-2xl transition-all duration-200 group text-left shadow-sm hover:shadow-md"
        >
            <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                {thumbnail ? (
                    <img src={thumbnail} alt={productName} className="w-full h-full object-cover" />
                ) : (
                    <span className="text-2xl opacity-50">🌿</span>
                )}
            </div>
            <div className="flex-grow min-w-0">
                <div className="text-sm font-semibold text-gray-800 group-hover:text-bewit-blue truncate">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({node, ...props}) => <span {...props} />,
                        strong: ({node, ...props}) => <strong style={{fontWeight: 'bold'}} {...props} />,
                        em: ({node, ...props}) => <em style={{fontStyle: 'italic'}} {...props} />,
                      }}
                    >
                      {productName}
                    </ReactMarkdown>
                </div>
                {pinyinName && pinyinName !== productName && (
                    <div className="text-[10px] text-gray-500 truncate mt-0.5">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({node, ...props}) => <span {...props} />,
                            strong: ({node, ...props}) => <strong style={{fontWeight: 'bold'}} {...props} />,
                            em: ({node, ...props}) => <em style={{fontStyle: 'italic'}} {...props} />,
                          }}
                        >
                          {pinyinName}
                        </ReactMarkdown>
                    </div>
                )}
            </div>
            <div className="text-bewit-blue opacity-30 group-hover:opacity-100 transition-opacity pr-1">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
            </div>
        </button>
    );
};

const TypingIndicator: React.FC = () => (
    <div className="flex items-start gap-3 max-w-4xl mx-auto justify-start">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-bewit-blue flex items-center justify-center text-white">
            <BotIcon className="w-5 h-5" />
        </div>
        <div className="px-4 py-3 rounded-2xl bg-white border border-slate-200 rounded-bl-none shadow-sm">
            <div className="flex items-center gap-3">
                {/* Animovaný wave loader */}
                <WaveLoader />
                {/* Animované loading fráze */}
                <LoadingPhrases changeInterval={7000} />
            </div>
        </div>
    </div>
);

// 🔍 PRODUCT SEARCH DRAWER - komponenta pro vyhledávání produktů
const ProductSearchDrawer: React.FC = () => {
    const [searchInput, setSearchInput] = useState('');
    const [searchResults, setSearchResults] = useState<ProductSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleSearch = async (query: string) => {
        setSearchInput(query);
        
        if (searchDebounce.current) {
            clearTimeout(searchDebounce.current);
        }
        
        if (query.trim().length < 2) {
            setSearchResults([]);
            return;
        }
        
        setIsSearching(true);
        searchDebounce.current = setTimeout(async () => {
            try {
                const found = await searchProductsAutocomplete(query.trim(), 20);
                setSearchResults(found);
            } catch (error) {
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 300);
    };

    return (
        <div className="p-4 flex flex-col h-full">
            {/* Vyhledávací pole */}
            <div className="mb-4">
                <div className="relative">
                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder="Např. Aloe Vera, esenciální olej..."
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bewit-blue/50 focus:border-bewit-blue transition-colors"
                    />
                </div>
            </div>

            {/* Loading indikátor */}
            {isSearching && (
                <div className="flex items-center justify-center py-8 gap-2">
                    {[0, 1, 2].map(i => (
                        <div key={i} className="w-2 h-2 bg-bewit-blue rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                    <span className="text-sm text-slate-400 ml-2">Hledám produkty...</span>
                </div>
            )}

            {/* Výsledky */}
            {!isSearching && searchResults.length === 0 && searchInput.trim().length > 0 && (
                <div className="text-center py-8 text-slate-500">
                    <p className="text-sm">Žádné produkty nebyly nalezeny</p>
                </div>
            )}

            {!isSearching && searchResults.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                        Nalezeno {searchResults.length} produktů
                    </p>
                    {searchResults.map((product) => (
                        <a
                            key={product.product_code}
                            href={product.url || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-bewit-blue hover:bg-blue-50 transition-all duration-200 group no-underline"
                        >
                            {product.thumbnail ? (
                                <img
                                    src={product.thumbnail}
                                    alt={product.product_name}
                                    className="w-12 h-12 rounded-lg object-contain flex-shrink-0 bg-gray-50"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                            ) : (
                                <div className="w-12 h-12 rounded-lg bg-slate-100 flex-shrink-0 flex items-center justify-center text-lg">📦</div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-800 group-hover:text-bewit-blue transition-colors truncate">
                                    {product.product_name}
                                </p>
                                {product.category && (
                                    <p className="text-xs text-slate-400 truncate">{product.category}</p>
                                )}
                            </div>
                            <svg className="w-4 h-4 text-slate-300 group-hover:text-bewit-blue flex-shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </a>
                    ))}
                </div>
            )}

            {/* Prázdný stav */}
            {!isSearching && searchInput.trim().length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
                    <svg className="w-12 h-12 mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <p className="text-sm font-medium mb-1">Začněte zadáním vyhledávacího termínu</p>
                    <p className="text-xs text-slate-400">Hledejte názvy produktů nebo kategorií</p>
                </div>
            )}
        </div>
    );
};

const Message: React.FC<{ 
    message: ChatMessage; 
    onSilentPrompt: (prompt: string) => void; 
    onProblemSelect?: (problem: string) => void;  // SEARCH Callback pro výběr problému (EO Směsi)
    chatbotSettings?: {
        product_recommendations: boolean;
        product_button_recommendations: boolean;
        inline_product_links?: boolean;  // NEW Inline produktové linky
        book_database: boolean;
        use_feed_1?: boolean;
        use_feed_2?: boolean;
        webhook_url?: string;  // NEW N8N webhook URL pro tento chatbot
        enable_product_router?: boolean;  // NEW Zapnutí/vypnutí produktového routeru
        enable_manual_funnel?: boolean;   // NEW Zapnutí manuálního funnel spouštěče
        group_products_by_category?: boolean;  // NEW Grupování produktů podle kategorií
        show_sources?: boolean;  // NEW Zobrazování zdrojů
        enable_product_pairing?: boolean;  // NEW Párování kombinací produktů
    };
    sessionId?: string;
    token?: string;  // NEW Token z externalUserInfo
    lastUserQuery?: string;
    chatbotId?: string;  // NEW Pro rozlišení Sana 2 (markdown rendering)
    // NEW Props pro manuální funnel
    recommendedProducts?: RecommendedProduct[];  // Produkty extrahované z historie
    chatHistory?: Array<{ id: string; role: string; text: string; }>;  // Historie konverzace
    metadata?: { categories: string[]; labels: string[]; publication_types: string[]; };  // Metadata
    onAddMessage?: (message: ChatMessage) => void;  // Callback pro přidání nové zprávy (EO Směsi "vědět víc")
    onSwitchToUniversal?: () => void;  // Přepnutí na Universal chatbot (tlačítko Poradce)
}> = ({ message, onSilentPrompt, onProblemSelect, chatbotSettings, sessionId, token, lastUserQuery, chatbotId, recommendedProducts = [], chatHistory = [], metadata = { categories: [], labels: [], publication_types: [] }, onAddMessage, onSwitchToUniversal }) => {
    const isUser = message.role === 'user';
    const usesMarkdown = chatbotId === 'sana_local_format' || chatbotId === 'vany_chat' || chatbotId === 'eo_smesi' || chatbotId === 'wany_chat_local' || chatbotId === 'universal_chat' || chatbotId === 'universal';  // NEW Sana Local Format, Vany Chat, EO-Smesi, Wany.Chat Local, Universal Chat a Universal používají markdown
    
    // NEW State pro obohacené produkty (obsahují category pro seskupení v ProductPills)
    const [enrichedProducts, setEnrichedProducts] = useState<RecommendedProduct[]>([]);
    const [productsLoading, setProductsLoading] = useState(false);
    
    // NEW State pro Aloe/Merkaba doporučení z párování
    const [pairingRecommendations, setPairingRecommendations] = useState<{
        aloe: boolean;
        merkaba: boolean;
    }>({ aloe: false, merkaba: false });
    
    // SEARCH State pro inline vyhledávač
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Array<{product_code: string; product_name: string; category?: string; url?: string; thumbnail?: string}>>([]);
    const [isSearching, setIsSearching] = useState(false);
    const searchDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const searchResultsRef = React.useRef<HTMLDivElement>(null);

    const handleInlineSearch = (query: string) => {
        setSearchQuery(query);
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        if (query.trim().length < 2) { setSearchResults([]); return; }
        setIsSearching(true);
        searchDebounceRef.current = setTimeout(async () => {
            try {
                const found = await searchProductsAutocomplete(query.trim(), 20);
                setSearchResults(found);
            } catch { setSearchResults([]); }
            finally { setIsSearching(false); }
        }, 300);
    };

    // Scroll na výsledky vyhledávání jakmile se načtou
    React.useEffect(() => {
        if (searchResults.length > 0 && searchResultsRef.current) {
            searchResultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [searchResults]);
    
    // State pro rozbalení sekce doprovodných produktů (Panacea / TČM wan)
    const [isCompanionProductsOpen, setIsCompanionProductsOpen] = useState(false);
    
    // NEW Prioritní kategorie pro řazení produktů BEWIT
    const PRIORITY_CATEGORIES = [
        'Směsi esenciálních olejů',
        'PRAWTEIN® – superpotravinové směsi',
        'TČM - Tradiční čínská medicína'
    ];
    
    // NEW Funkce pro získání priority kategorie
    const getCategoryPriority = (category: string | undefined): number => {
        if (!category) return 999;
        
        const index = PRIORITY_CATEGORIES.findIndex(priorityCategory => {
            const categoryLower = category.toLowerCase();
            const priorityLower = priorityCategory.toLowerCase();
            
            return categoryLower.includes(priorityLower) || priorityLower.includes(categoryLower);
        });
        
        return index === -1 ? 999 : index;
    };
    
    // NEW Funkce pro řazení produktů podle prioritních kategorií
    const sortProductsByPriorityCategories = (products: RecommendedProduct[]): RecommendedProduct[] => {
        return [...products].sort((a, b) => {
            const priorityA = getCategoryPriority(a.category);
            const priorityB = getCategoryPriority(b.category);
            
            // Seřadit podle priority kategorií
            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }
            
            // V rámci stejné kategorie zachovat původní pořadí
            return 0;
        });
    };
    
    // NEW State pro inline produktové linky
    
    // Vylepšené zpracování HTML pro lepší zobrazení obrázků a formátování
    
    // NEW useEffect pro načtení obohacených produktů z databáze
    useEffect(() => {
        const loadEnrichedProducts = async () => {
            // Načíst pouze pokud:
            // 1. Je to bot zpráva
            // 2. Jsou zapnuté inline product links NEBO je to EO Směsi chat (produkty se zobrazují jako pills vždy)
            // 3. Zpráva obsahuje matchedProducts
            const isEoSmesiChat = chatbotId === 'eo_smesi';
            if (message.role !== 'bot' || (!chatbotSettings?.inline_product_links && !isEoSmesiChat) || !message.matchedProducts) {
                return;
            }
            
            const products = message.matchedProducts;
            
            if (products.length === 0) {
                return;
            }
            setProductsLoading(true);
            
            try {
                // OK JEDNODUCHÉ ŘEŠENÍ: Použij enrichFunnelProductsFromDatabase pro VŠECHNY produkty
                // Tato funkce už umí pracovat s produkty z Product Extractor i z párování
                const enriched = await enrichFunnelProductsFromDatabase(products);
                // NEW Seřadíme produkty podle prioritních kategorií
                const sortedProducts = sortProductsByPriorityCategories(enriched);
                
                setEnrichedProducts(sortedProducts);
            } catch (error) {
                setEnrichedProducts(products); // Fallback na základní data
            } finally {
                setProductsLoading(false);
            }
        };
        
        loadEnrichedProducts();
    }, [message.matchedProducts, message.role, chatbotSettings?.inline_product_links, chatbotSettings?.enable_product_pairing]);
    
    // NEW Funkce pro extrakci všech product markerů z textu (pro horní sekci)
    /**
     * Extrahuje všechny product markery z textu zprávy
     * @returns Array objektů s daty produktů
     */
    const extractAllProductMarkers = () => {
        const text = message.text || '';
        const productMarkerRegex = /<<<PRODUCT:([^|]+)\|\|\|([^|]+)\|\|\|([^|]+)\|\|\|([^>]+)>>>/g;
        const products: Array<{
            productCode: string;
            productUrl: string;
            productName: string;
            pinyinName: string;
        }> = [];
        
        let match;
        while ((match = productMarkerRegex.exec(text)) !== null) {
            const [, productCode, productUrl, productName, pinyinName] = match;
            products.push({
                productCode: productCode.trim(),
                productUrl: productUrl.trim(),
                productName: productName.trim(),
                pinyinName: pinyinName.trim()
            });
        }
        
        return products;
    };
    
    // NEW Funkce pro rendering textu s inline produktovými linky + horní sekce
    /**
     * 🆕 Renderuje text s inline product buttons
     * Parsuje text s product markery: <<<PRODUCT:code|||url|||name|||pinyin>>>
     * a vytváří pole React elementů: [ReactMarkdown, ProductPill, ReactMarkdown, ...]
     * 
     * NOVINKA: Pokud je chatbotSettings.inline_product_links === true,
     * vloží sekci "Související produkty BEWIT" po prvním odstavci
     */
    const renderTextWithProductButtons = () => {
        const text = message.text || '';
        
        // Regex pro vyhledání product markerů
        // Formát: <<<PRODUCT:code|||url|||name|||pinyin>>>
        const productMarkerRegex = /<<<PRODUCT:([^|]+)\|\|\|([^|]+)\|\|\|([^|]+)\|\|\|([^>]+)>>>/g;
        
        // Nejdřív extrahujeme všechny produkty pro horní sekci
        const allProducts = chatbotSettings?.inline_product_links ? extractAllProductMarkers() : [];
        
        // Najdeme pozici prvního dvojitého nového řádku (konec prvního odstavce)
        const firstParagraphEnd = text.indexOf('\n\n');
        const insertProductsSectionAt = firstParagraphEnd > 0 ? firstParagraphEnd : -1;
        
        const segments: React.ReactNode[] = [];
        let lastIndex = 0;
        let match;
        let segmentIndex = 0;
        let productsSectionInserted = false; // Flag pro vložení horní sekce
        
        // Najdeme všechny product markery v textu
        while ((match = productMarkerRegex.exec(text)) !== null) {
            const matchStart = match.index;
            const matchEnd = match.index + match[0].length;
            
            // Text před product markerem - renderujeme přes ReactMarkdown
            if (matchStart > lastIndex) {
                const textSegment = text.substring(lastIndex, matchStart);
                
                // NEW Pokud máme produkty a ještě jsme je nevložili, zkontroluj, jestli jsme za prvním odstavcem
                // Pro n8n "vědět víc" odpovědi (hideProductCallout) sekci produktů NEZOBRAZUJEME - pills jsou přímo v textu
                if (!productsSectionInserted && allProducts.length > 0 && !message.hideProductCallout && insertProductsSectionAt > 0 && lastIndex <= insertProductsSectionAt && matchStart > insertProductsSectionAt) {
                    // Rozdělíme text na dvě části: před a po konci prvního odstavce
                    const beforeSection = textSegment.substring(0, insertProductsSectionAt - lastIndex);
                    const afterSection = textSegment.substring(insertProductsSectionAt - lastIndex);
                    
                    // První část textu (do konce prvního odstavce)
                    if (beforeSection.trim()) {
                        segments.push(
                            <ReactMarkdown
                                key={`text-${segmentIndex}`}
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeRaw, [rehypeSanitize, customSanitizeSchema]]}
                                components={{
                                    h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-4 mb-2" {...props} />,
                                    h2: ({node, ...props}) => <h2 className="text-xl font-bold mt-3 mb-2" {...props} />,
                                    h3: ({node, ...props}) => <h3 className="text-lg font-bold mt-2 mb-1" {...props} />,
                                    p: ({node, ...props}) => <p className="my-2 leading-relaxed" {...props} />,
                                    strong: ({node, ...props}) => <strong className="font-bold" {...props} />,
                                    a: ({node, ...props}) => <a className="text-bewit-blue hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
                                    ul: ({node, ...props}) => <ul className="list-disc list-inside my-2 space-y-1" {...props} />,
                                    ol: ({node, ...props}) => <ol className="list-decimal list-inside my-2 space-y-1" {...props} />,
                                    li: ({node, ...props}) => <li className="ml-4" {...props} />,
                                    code: ({node, inline, ...props}: any) => 
                                        inline ? (
                                            <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
                                        ) : (
                                            <code className="block bg-slate-100 text-slate-800 p-3 rounded-lg my-2 overflow-x-auto font-mono text-sm" {...props} />
                                        ),
                                    table: ({node, ...props}) => (
                                        <div className="overflow-x-auto my-4 rounded-lg shadow-sm border border-slate-200">
                                            <table className="min-w-full border-collapse bg-white" {...props} />
                                        </div>
                                    ),
                                    thead: ({node, ...props}) => <thead className="bg-gradient-to-r from-bewit-blue to-blue-700" {...props} />,
                                    tbody: ({node, ...props}) => <tbody className="divide-y divide-slate-200" {...props} />,
                                    tr: ({node, ...props}) => <tr className="hover:bg-slate-50 transition-colors" {...props} />,
                                    th: ({node, ...props}) => <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider" {...props} />,
                                    td: ({node, ...props}) => <td className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap" {...props} />,
                                }}
                            >
                                {beforeSection}
                            </ReactMarkdown>
                        );
                        segmentIndex++;
                    }
                    
                    // NEW VLOŽENÍ SEKCE "Související produkty BEWIT"

                    const useGroupedView = (chatbotSettings as any)?.group_products_by_category === true;
                    // 🔧 FIX: Zobraz produkty i když group_products_by_category není zapnuto
                    const productsToShow = enrichedProducts.length > 0 && !productsLoading
                        ? enrichedProducts
                        : null;

                    // Vždy stejný design: modrý box + ProductPills. Při group_products_by_category seskupíme podle kategorií.
                    if (productsToShow && productsToShow.length > 0) {
                        const byCategory = productsToShow.reduce<Record<string, typeof productsToShow>>((acc, p) => {
                            const cat = p.category?.trim() || 'Ostatní';
                            if (!acc[cat]) acc[cat] = [];
                            acc[cat].push(p);
                            return acc;
                        }, {});
                        
                        // NEW Seřadíme kategorie podle priority
                        const categories = Object.keys(byCategory).sort((catA, catB) => {
                            const priorityA = getCategoryPriority(catA);
                            const priorityB = getCategoryPriority(catB);
                            return priorityA - priorityB;
                        });
                        
                        segments.push(
                            <div key={`products-section`} className={`my-4 border rounded-2xl p-4 shadow-sm ${
                                chatbotId === 'eo_smesi' 
                                    ? "bg-blue-50/40 border-blue-100" 
                                    : "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200"
                            }`}>
                                <h4 className="text-sm font-semibold text-bewit-blue mb-3 flex items-center gap-2">
                                    <svg 
                                        width="18" 
                                        height="18" 
                                        viewBox="0 0 24 24" 
                                        fill="none" 
                                        stroke="currentColor" 
                                        strokeWidth="2.5" 
                                        strokeLinecap="round" 
                                        strokeLinejoin="round"
                                        className="text-bewit-blue"
                                    >
                                        <circle cx="9" cy="21" r="1"></circle>
                                        <circle cx="20" cy="21" r="1"></circle>
                                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                                    </svg>
                                    Související produkty BEWIT
                                    {productsLoading && <span className="text-xs text-gray-500 animate-pulse">(načítám...)</span>}
                                </h4>
                                <div className="flex flex-col gap-4">
                                    {categories.map((cat) => (
                                        <div key={cat}>
                                            <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">{cat}</p>
                                            <div className="flex flex-col gap-2.5">
                                                {byCategory[cat].map((product, index) => (
                                                    chatbotId === 'eo_smesi' ? (
                                                        <ProductCalloutButton
                                                            key={`${cat}-${index}`}
                                                            productName={product.product_name}
                                                            pinyinName={product.description || product.product_name}
                                                            thumbnail={product.thumbnail}
                                                            url={product.url || ''}
                                                            token={token}
                                                        />
                                                    ) : (
                                                        <ProductPill
                                                            key={`${cat}-${index}`}
                                                            productName={product.product_name}
                                                            pinyinName={product.description || product.product_name}
                                                            url={product.url || ''}
                                                            token={token}
                                                        />
                                                    )
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                {/* 🆕 Aloe/Merkaba indikátory (pokud je zapnuté párování) */}
                                {chatbotSettings?.enable_product_pairing && (pairingRecommendations.aloe || pairingRecommendations.merkaba) && (
                                    <div className="mt-4 pt-4 border-t border-blue-100">
                                        <p className="text-[11px] font-bold text-gray-500 mb-2 uppercase tracking-wide">Doplňkové doporučení:</p>
                                        <div className="flex flex-wrap gap-3 mb-3">
                                            {pairingRecommendations.aloe && (
                                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-bold border border-green-100/50 shadow-sm">
                                                    <span className="text-base leading-none">✅</span>
                                                    <span>Aloe Vera gel</span>
                                                </div>
                                            )}
                                            {pairingRecommendations.merkaba && (
                                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-bold border border-purple-100/50 shadow-sm">
                                                    <span className="text-base leading-none">✅</span>
                                                    <span>Merkaba</span>
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => setIsSearchOpen(true)}
                                            className="w-full py-2.5 px-4 bg-gradient-to-r from-bewit-blue to-blue-600 text-white rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-blue-500 transition-all duration-300 shadow-md hover:shadow-blue-200/50 flex items-center justify-center gap-2 group border border-blue-400/20"
                                            title="Otevřít vyhledávač produktů"
                                        >
                                            <SparklesIcon className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
                                            Chci o těchto produktech vědět více
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    } else {
                        segments.push(
                            <div key={`products-section`} className="my-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 shadow-sm">
                                <h4 className="text-sm font-semibold text-bewit-blue mb-3 flex items-center gap-2">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="9" cy="21" r="1"></circle>
                                        <circle cx="20" cy="21" r="1"></circle>
                                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                                    </svg>
                                    Související produkty BEWIT
                                    {productsLoading && <span className="text-xs text-gray-500">(načítám...)</span>}
                                </h4>
                                <div className="flex flex-col gap-2">
                                    {allProducts.map((product, index) => (
                                        <ProductPill
                                            key={`top-product-${index}`}
                                            productName={product.productName}
                                            pinyinName={product.pinyinName}
                                            url={product.productUrl}
                                            token={token}
                                        />
                                    ))}
                                </div>
                                
                                {/* 🆕 Aloe/Merkaba indikátory (pokud je zapnuté párování) */}
                                {chatbotSettings?.enable_product_pairing && (pairingRecommendations.aloe || pairingRecommendations.merkaba) && (
                                    <div className="mt-4 pt-4 border-t border-blue-200">
                                        <p className="text-xs font-medium text-gray-600 mb-2">Doplňkové doporučení:</p>
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {pairingRecommendations.aloe && (
                                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                                    <span className="text-base">💧</span>
                                                    <span>Aloe doporučeno</span>
                                                </div>
                                            )}
                                            {pairingRecommendations.merkaba && (
                                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                                                    <span className="text-base">✨</span>
                                                    <span>Merkaba doporučeno</span>
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => setIsSearchOpen(true)}
                                            className="w-full py-2.5 px-4 bg-gradient-to-r from-bewit-blue to-blue-600 text-white rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-blue-500 transition-all duration-300 shadow-md hover:shadow-blue-200/50 flex items-center justify-center gap-2 group border border-blue-400/20"
                                            title="Otevřít vyhledávač produktů"
                                        >
                                            <SparklesIcon className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
                                            Chci o těchto produktech vědět více
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    }
                    
                    segmentIndex++;
                    productsSectionInserted = true;
                    
                    // Druhá část textu (po sekci produktů)
                    if (afterSection.trim()) {
                        segments.push(
                            <ReactMarkdown
                                key={`text-${segmentIndex}`}
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeRaw, [rehypeSanitize, customSanitizeSchema]]}
                                components={{
                                    h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-4 mb-2" {...props} />,
                                    h2: ({node, ...props}) => <h2 className="text-xl font-bold mt-3 mb-2" {...props} />,
                                    h3: ({node, ...props}) => <h3 className="text-lg font-bold mt-2 mb-1" {...props} />,
                                    p: ({node, ...props}) => <p className="my-2 leading-relaxed" {...props} />,
                                    strong: ({node, ...props}) => <strong className="font-bold" {...props} />,
                                    a: ({node, ...props}) => <a className="text-bewit-blue hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
                                    ul: ({node, ...props}) => <ul className="list-disc list-inside my-2 space-y-1" {...props} />,
                                    ol: ({node, ...props}) => <ol className="list-decimal list-inside my-2 space-y-1" {...props} />,
                                    li: ({node, ...props}) => <li className="ml-4" {...props} />,
                                    code: ({node, inline, ...props}: any) => 
                                        inline ? (
                                            <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
                                        ) : (
                                            <code className="block bg-slate-100 text-slate-800 p-3 rounded-lg my-2 overflow-x-auto font-mono text-sm" {...props} />
                                        ),
                                    table: ({node, ...props}) => (
                                        <div className="overflow-x-auto my-4 rounded-lg shadow-sm border border-slate-200">
                                            <table className="min-w-full border-collapse bg-white" {...props} />
                                        </div>
                                    ),
                                    thead: ({node, ...props}) => <thead className="bg-gradient-to-r from-bewit-blue to-blue-700" {...props} />,
                                    tbody: ({node, ...props}) => <tbody className="divide-y divide-slate-200" {...props} />,
                                    tr: ({node, ...props}) => <tr className="hover:bg-slate-50 transition-colors" {...props} />,
                                    th: ({node, ...props}) => <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider" {...props} />,
                                    td: ({node, ...props}) => <td className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap" {...props} />,
                                }}
                            >
                                {afterSection}
                            </ReactMarkdown>
                        );
                    }
                } else {
                    // Normální rendering bez vložení sekce
                    segments.push(
                        <ReactMarkdown
                            key={`text-${segmentIndex}`}
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw, [rehypeSanitize, customSanitizeSchema]]}
                            components={{
                                h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-4 mb-2" {...props} />,
                                h2: ({node, ...props}) => <h2 className="text-xl font-bold mt-3 mb-2" {...props} />,
                                h3: ({node, ...props}) => <h3 className="text-lg font-bold mt-2 mb-1" {...props} />,
                                p: ({node, ...props}) => <p className="my-2 leading-relaxed" {...props} />,
                                strong: ({node, ...props}) => <strong className="font-bold" {...props} />,
                                a: ({node, ...props}) => <a className="text-bewit-blue hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
                                ul: ({node, ...props}) => <ul className="list-disc list-inside my-2 space-y-1" {...props} />,
                                ol: ({node, ...props}) => <ol className="list-decimal list-inside my-2 space-y-1" {...props} />,
                                li: ({node, ...props}) => <li className="ml-4" {...props} />,
                                code: ({node, inline, ...props}: any) => 
                                    inline ? (
                                        <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
                                    ) : (
                                        <code className="block bg-slate-100 text-slate-800 p-3 rounded-lg my-2 overflow-x-auto font-mono text-sm" {...props} />
                                    ),
                                table: ({node, ...props}) => (
                                    <div className="overflow-x-auto my-4 rounded-lg shadow-sm border border-slate-200">
                                        <table className="min-w-full border-collapse bg-white" {...props} />
                                    </div>
                                ),
                                thead: ({node, ...props}) => <thead className="bg-gradient-to-r from-bewit-blue to-blue-700" {...props} />,
                                tbody: ({node, ...props}) => <tbody className="divide-y divide-slate-200" {...props} />,
                                tr: ({node, ...props}) => <tr className="hover:bg-slate-50 transition-colors" {...props} />,
                                th: ({node, ...props}) => <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider" {...props} />,
                                td: ({node, ...props}) => <td className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap" {...props} />,
                            }}
                        >
                            {textSegment}
                        </ReactMarkdown>
                    );
                }
            }
            
            // Product button - parsujeme data z markeru
            const [, productCode, productUrl, productName, productPinyin] = match;
            segments.push(
                <div key={`product-${segmentIndex}`} className="my-1.5">
                    <ProductPill
                        productName={productName}
                        pinyinName={productPinyin}
                        url={productUrl}
                        token={token}
                    />
                </div>
            );
            
            lastIndex = matchEnd;
            segmentIndex++;
        }
        
        // Zbytek textu po posledním markeru
        if (lastIndex < text.length) {
            const textSegment = text.substring(lastIndex);
            segments.push(
                <ReactMarkdown
                    key={`text-${segmentIndex}`}
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw, [rehypeSanitize, customSanitizeSchema]]}
                    components={{
                        h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-4 mb-2" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-xl font-bold mt-3 mb-2" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-lg font-bold mt-2 mb-1" {...props} />,
                        p: ({node, ...props}) => <p className="my-2 leading-relaxed" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-bold" {...props} />,
                        a: ({node, ...props}) => <a className="text-bewit-blue hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc list-inside my-2 space-y-1" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal list-inside my-2 space-y-1" {...props} />,
                        li: ({node, ...props}) => <li className="ml-4" {...props} />,
                        code: ({node, inline, ...props}: any) => 
                            inline ? (
                                <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
                            ) : (
                                <code className="block bg-slate-100 text-slate-800 p-3 rounded-lg my-2 overflow-x-auto font-mono text-sm" {...props} />
                            ),
                        table: ({node, ...props}) => (
                            <div className="overflow-x-auto my-4 rounded-lg shadow-sm border border-slate-200">
                                <table className="min-w-full border-collapse bg-white" {...props} />
                            </div>
                        ),
                        thead: ({node, ...props}) => <thead className="bg-gradient-to-r from-bewit-blue to-blue-700" {...props} />,
                        tbody: ({node, ...props}) => <tbody className="divide-y divide-slate-200" {...props} />,
                        tr: ({node, ...props}) => <tr className="hover:bg-slate-50 transition-colors" {...props} />,
                        th: ({node, ...props}) => <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider" {...props} />,
                        td: ({node, ...props}) => <td className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap" {...props} />,
                    }}
                >
                    {textSegment}
                </ReactMarkdown>
            );
        }
        
        // Pokud nebyl nalezen žádný marker, vrátíme celý text přes ReactMarkdown
        if (segments.length === 0) {
            return (
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw, [rehypeSanitize, customSanitizeSchema]]}
                    components={{
                        h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-4 mb-2" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-xl font-bold mt-3 mb-2" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-lg font-bold mt-2 mb-1" {...props} />,
                        p: ({node, ...props}) => <p className="my-2 leading-relaxed" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-bold" {...props} />,
                        a: ({node, ...props}) => <a className="text-bewit-blue hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc list-inside my-2 space-y-1" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal list-inside my-2 space-y-1" {...props} />,
                        li: ({node, ...props}) => <li className="ml-4" {...props} />,
                        code: ({node, inline, ...props}: any) => 
                            inline ? (
                                <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
                            ) : (
                                <code className="block bg-slate-100 text-slate-800 p-3 rounded-lg my-2 overflow-x-auto font-mono text-sm" {...props} />
                            ),
                        table: ({node, ...props}) => (
                            <div className="overflow-x-auto my-4 rounded-lg shadow-sm border border-slate-200">
                                <table className="min-w-full border-collapse bg-white" {...props} />
                            </div>
                        ),
                        thead: ({node, ...props}) => <thead className="bg-gradient-to-r from-bewit-blue to-blue-700" {...props} />,
                        tbody: ({node, ...props}) => <tbody className="divide-y divide-slate-200" {...props} />,
                        tr: ({node, ...props}) => <tr className="hover:bg-slate-50 transition-colors" {...props} />,
                        th: ({node, ...props}) => <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider" {...props} />,
                        td: ({node, ...props}) => <td className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap" {...props} />,
                    }}
                >
                    {text}
                </ReactMarkdown>
            );
        }
        
        return <>{segments}</>;
    };
    
    return (
        <div className={`flex items-start gap-3 max-w-4xl mx-auto group ${isUser ? 'justify-end ml-auto pl-12' : 'justify-start'}`}>
            {!isUser && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-bewit-blue flex items-center justify-center text-white">
                    <BotIcon className="w-5 h-5" />
                </div>
            )}
            <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                {/* 🎯 FUNNEL MESSAGE: Speciální grafický design pro produktový funnel */}
                {!isUser && message.isFunnelMessage ? (
                    <ProductFunnelMessage
                        funnelText={message.text || ''}
                        selectedProducts={message.funnelProducts || []}
                        symptomList={message.symptomList || []}
                        token={token}
                    />
                ) : (
                <div className={`px-4 py-3 rounded-2xl max-w-xl md:max-w-2xl lg:max-w-3xl shadow-sm ${isUser ? 'bg-bewit-blue text-white rounded-br-none' : 'bg-white text-bewit-dark border border-slate-200 rounded-bl-none'}`}>
                    {/* 🆕 PRODUCT BUTTONS INLINE: Pro Sana 2 s product markery */}
                    {!isUser && usesMarkdown && message.text?.includes('<<<PRODUCT:') ? (
                        <div className="markdown-content">
                            {renderTextWithProductButtons()}
                        </div>
                    ) : !isUser ? (
                        /* ReactMarkdown rendering pro všechny bot zprávy - podporuje **bold** formátování */
                        <div className="markdown-content">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeRaw, [rehypeSanitize, customSanitizeSchema]]}
                                components={{
                                    h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-4 mb-2" {...props} />,
                                    h2: ({node, ...props}) => <h2 className="text-xl font-bold mt-3 mb-2" {...props} />,
                                    h3: ({node, ...props}) => <h3 className="text-lg font-bold mt-2 mb-1" {...props} />,
                                    h4: ({node, ...props}) => <h4 className="text-base font-bold mt-2 mb-1" {...props} />,
                                    h5: ({node, ...props}) => <h5 className="text-sm font-bold mt-1 mb-1" {...props} />,
                                    h6: ({node, ...props}) => <h6 className="text-xs font-bold mt-1 mb-1" {...props} />,
                                    p: ({node, ...props}) => <p className="my-2 leading-relaxed" {...props} />,
                                    strong: ({node, ...props}) => <strong className="font-bold" {...props} />,
                                    em: ({node, ...props}) => <em className="italic" {...props} />,
                                    a: ({node, ...props}) => <a className="text-bewit-blue hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
                                    ul: ({node, ...props}) => <ul className="list-disc list-inside my-2 space-y-1" {...props} />,
                                    ol: ({node, ...props}) => <ol className="list-decimal list-inside my-2 space-y-1" {...props} />,
                                    li: ({node, ...props}) => <li className="ml-4" {...props} />,
                                    img: ({node, ...props}) => (
                                        <img 
                                            className="max-w-full h-auto rounded-lg my-3 shadow-md block" 
                                            loading="lazy"
                                            {...props} 
                                        />
                                    ),
                                    code: ({node, inline, ...props}: any) => 
                                        inline ? (
                                            <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
                                        ) : (
                                            <code className="block bg-slate-100 text-slate-800 p-3 rounded-lg my-2 overflow-x-auto font-mono text-sm" {...props} />
                                        ),
                                    pre: ({node, ...props}) => <pre className="bg-slate-100 p-3 rounded-lg my-2 overflow-x-auto" {...props} />,
                                    blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-bewit-blue pl-4 my-2 italic text-slate-600" {...props} />,
                                    hr: ({node, ...props}) => <hr className="my-4 border-slate-200" {...props} />,
                                    table: ({node, ...props}) => (
                                        <div className="overflow-x-auto my-4 rounded-lg shadow-sm border border-slate-200">
                                            <table className="min-w-full border-collapse bg-white" {...props} />
                                        </div>
                                    ),
                                    thead: ({node, ...props}) => <thead className="bg-gradient-to-r from-bewit-blue to-blue-700" {...props} />,
                                    tbody: ({node, ...props}) => <tbody className="divide-y divide-slate-200" {...props} />,
                                    tr: ({node, ...props}) => <tr className="hover:bg-slate-50 transition-colors" {...props} />,
                                    th: ({node, ...props}) => <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider" {...props} />,
                                    td: ({node, ...props}) => <td className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap" {...props} />,
                                }}
                            >
                                {message.text || ''}
                            </ReactMarkdown>
                        </div>
                    ) : isUser ? (
                        /* User zprávy - obyčejný text bez Markdownu */
                        <div>{message.text || ''}</div>
                    ) : null}
                    
                    {/* 🔍 EO SMĚSI: Formulář pro výběr problému (mezikrok) */}
                    {!isUser && message.requiresProblemSelection && message.uncertainProblems && message.uncertainProblems.length > 0 && onProblemSelect && (
                        <ProblemSelectionForm
                            problems={message.uncertainProblems}
                            onSelect={onProblemSelect}
                            disabled={message.problemSelectionSubmitted}
                        />
                    )}
                    
                    {/* 🌿 EO SMĚSI: N8N odpověď "vědět víc" - produkty jako jednoduché pills bez callout boxu */}
                    {!isUser && usesMarkdown && message.hideProductCallout && !message.text?.includes('<<<PRODUCT:') && enrichedProducts.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {(() => {
                                const filteredProducts = chatbotId === 'eo_smesi'
                                    ? enrichedProducts.filter(p => !p.category?.includes('TČM') && !p.category?.includes('Tradiční čínská medicína'))
                                    : enrichedProducts;
                                return filteredProducts.map((product, index) => (
                                    <ProductPill
                                        key={index}
                                        productName={product.product_name}
                                        pinyinName={product.description || product.product_name}
                                        url={product.url || ''}
                                        token={token}
                                    />
                                ));
                            })()}
                        </div>
                    )}

                    {/* 🌿 EO SMĚSI: Callout box "Související produkty BEWIT" - pouze pro první odpověď (bez hideProductCallout) */}
                    {!isUser && usesMarkdown && !message.hideProductCallout && !message.text?.includes('<<<PRODUCT:') && enrichedProducts.length > 0 && (
                        <div className={`mt-4 border rounded-2xl p-4 shadow-sm ${
                            chatbotId === 'eo_smesi' 
                                ? "bg-blue-50/40 border-blue-100" 
                                : "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200"
                        }`}>
                            <h4 className="text-sm font-semibold text-bewit-blue mb-3 flex items-center gap-2">
                                <svg 
                                    width="18" 
                                    height="18" 
                                    viewBox="0 0 24 24" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    strokeWidth="2.5" 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round"
                                    className="text-bewit-blue"
                                >
                                    <circle cx="9" cy="21" r="1"></circle>
                                    <circle cx="20" cy="21" r="1"></circle>
                                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                                </svg>
                                Související produkty BEWIT
                            </h4>
                            <div className="flex flex-col gap-4">
                                {(() => {
                                    // 🔧 FILTRUJ TČM produkty (pouze pro EO Směsi chat)
                                    const filteredProducts = chatbotId === 'eo_smesi' 
                                        ? enrichedProducts.filter(p => !p.category?.includes('TČM') && !p.category?.includes('Tradiční čínská medicína'))
                                        : enrichedProducts;
                                    
                                    const byCategory = filteredProducts.reduce<Record<string, typeof filteredProducts>>((acc, p) => {
                                        const cat = p.category?.trim() || 'Ostatní';
                                        if (!acc[cat]) acc[cat] = [];
                                        acc[cat].push(p);
                                        return acc;
                                    }, {});
                                    
                                    const categories = Object.keys(byCategory).sort((catA, catB) => {
                                        const priorityA = getCategoryPriority(catA);
                                        const priorityB = getCategoryPriority(catB);
                                        return priorityA - priorityB;
                                    });
                                    
                                    return categories.map((cat) => (
                                        <div key={cat}>
                                            <p className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-wider">{cat}</p>
                                            <div className="flex flex-col gap-2.5">
                                                {byCategory[cat].map((product, index) => (
                                                    chatbotId === 'eo_smesi' ? (
                                                        <ProductCalloutButton
                                                            key={`${cat}-${index}`}
                                                            productName={product.product_name}
                                                            pinyinName={product.description || product.product_name}
                                                            thumbnail={product.thumbnail}
                                                            url={product.url || ''}
                                                            token={token}
                                                        />
                                                    ) : (
                                                        <ProductPill
                                                            key={`${cat}-${index}`}
                                                            productName={product.product_name}
                                                            pinyinName={product.description || product.product_name}
                                                            url={product.url || ''}
                                                            token={token}
                                                        />
                                                    )
                                                ))}
                                            </div>
                                        </div>
                                    ));
                                })()}
                            </div>
                            
                            {/* Aloe/Merkaba textové odkazy */}
                            {chatbotSettings?.enable_product_pairing && message.pairingInfo && (message.pairingInfo.aloe || message.pairingInfo.merkaba) && (
                                <div className="mt-4 pt-4 border-t border-blue-100">
                                    <p className="text-[11px] font-bold text-gray-500 mb-2 uppercase tracking-wide">Doplňkové doporučení:</p>
                                    <div className="flex flex-wrap gap-3">
                                        {message.pairingInfo.aloe && (
                                            message.pairingInfo.aloeUrl ? (
                                                <a href={`${message.pairingInfo.aloeUrl}${message.pairingInfo.aloeUrl?.includes('?') ? '&' : '?'}utm_source=chatbot`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-bold border border-green-100/50 shadow-sm hover:bg-green-100 transition-colors">
                                                    <span className="text-base leading-none">✅</span>
                                                    <span>{message.pairingInfo.aloeProductName || 'Aloe Vera gel'}</span>
                                                </a>
                                            ) : (
                                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-bold border border-green-100/50 shadow-sm">
                                                    <span className="text-base leading-none">✅</span>
                                                    <span>{message.pairingInfo.aloeProductName || 'Aloe Vera gel'}</span>
                                                </div>
                                            )
                                        )}
                                        {message.pairingInfo.merkaba && (
                                            message.pairingInfo.merkabaUrl ? (
                                                <a href={`${message.pairingInfo.merkabaUrl}${message.pairingInfo.merkabaUrl?.includes('?') ? '&' : '?'}utm_source=chatbot`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-bold border border-purple-100/50 shadow-sm hover:bg-purple-100 transition-colors">
                                                    <span className="text-base leading-none">✅</span>
                                                    <span>Merkaba</span>
                                                </a>
                                            ) : (
                                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-bold border border-purple-100/50 shadow-sm">
                                                    <span className="text-base leading-none">✅</span>
                                                    <span>Merkaba</span>
                                                </div>
                                            )
                                        )}
                                        {/* Tlačítko "Další doprovodné produkty" (Panacea) */}
                                        {(message.pairingInfo.companionProducts?.length ?? 0) > 0 && (
                                            <button
                                                onClick={() => setIsCompanionProductsOpen(v => !v)}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-50 text-gray-500 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-100 transition-colors"
                                            >
                                                <span>Další doprovodné produkty</span>
                                                <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${isCompanionProductsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>

                                    {/* Rozbalovací sekce s doprovodými produkty - skupinované podle kategorie */}
                                    {isCompanionProductsOpen && (message.pairingInfo.companionProducts?.length ?? 0) > 0 && (
                                        <div className="mt-3 pt-3 border-t border-blue-50 flex flex-col gap-4">
                                            {(() => {
                                                const byCategory: Record<string, typeof message.pairingInfo.companionProducts> = {};
                                                message.pairingInfo.companionProducts!.forEach(p => {
                                                    const cat = p.category || 'Ostatní';
                                                    if (!byCategory[cat]) byCategory[cat] = [];
                                                    byCategory[cat]!.push(p);
                                                });
                                                return Object.entries(byCategory).map(([cat, products]) => (
                                                    <div key={cat}>
                                                        <p className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-wider">{cat}</p>
                                                        <div className="flex flex-col gap-2.5">
                                                            {products!.map((p, i) => (
                                                                <ProductCalloutButton
                                                                    key={`companion-${cat}-${i}`}
                                                                    productName={p.name}
                                                                    thumbnail={p.thumbnail || undefined}
                                                                    url={p.url || ''}
                                                                    token={token}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                ));
                                            })()}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Tlačítko "Chci o produktech vědět víc" - pouze pro EO Směsi chat a pouze pokud nejde o odpověď n8n */}
                            {chatbotId === 'eo_smesi' && !message.hideProductCallout && (
                                <EoSmesiLearnMoreButton
                                    matchedProducts={enrichedProducts}
                                    sessionId={sessionId}
                                    onAddMessage={onAddMessage}
                                    companionProducts={message.pairingInfo?.companionProducts}
                                    isCompanionOpen={isCompanionProductsOpen}
                                />
                            )}
                            
                            {/* 🔍 Animovaný search box */}
                            <div className="mt-3">
                                <style>{`
                                    .psw-wrap {
                                        position: relative;
                                        height: 38px;
                                        width: 100%;
                                    }
                                    .psw-box {
                                        position: absolute;
                                        left: 0;
                                        top: 0;
                                        height: 38px;
                                        width: 200px;
                                        background: transparent;
                                        transition: width 0.5s cubic-bezier(.73,.14,.4,1.58);
                                        display: flex;
                                        align-items: center;
                                        overflow: hidden;
                                    }
                                    .psw-wrap.open .psw-box {
                                        width: 100%;
                                    }
                                    .psw-border {
                                        position: absolute;
                                        inset: 0;
                                        border: 1.5px solid #cbd5e1;
                                        border-radius: 12px;
                                        pointer-events: none;
                                        transition: border-color 0.3s;
                                    }
                                    .psw-wrap.open .psw-border {
                                        border-color: #005b96;
                                    }
                                    .psw-label-init {
                                        position: absolute;
                                        inset: 0;
                                        display: flex;
                                        align-items: center;
                                        padding: 0 12px;
                                        gap: 8px;
                                        cursor: pointer;
                                        z-index: 2;
                                        color: #94a3b8;
                                        opacity: 1;
                                        transition: opacity 0.2s 0.2s; /* Zpoždění při zavírání, aby se nepletl do inputu */
                                    }
                                    .psw-wrap.open .psw-label-init {
                                        opacity: 0;
                                        pointer-events: none;
                                        transition: opacity 0.1s 0s; /* Okamžité skrytí při otevírání */
                                    }
                                    .psw-label-init span {
                                        font-size: 13px;
                                        white-space: nowrap;
                                    }
                                    .psw-input {
                                        width: 100%;
                                        height: 100%;
                                        padding: 0 35px 0 35px;
                                        background: transparent;
                                        border: none;
                                        outline: none;
                                        font-size: 14px;
                                        color: #1e293b;
                                        opacity: 0;
                                        transition: opacity 0.1s 0s; /* Okamžité skrytí při zavírání */
                                    }
                                    .psw-wrap.open .psw-input {
                                        opacity: 1;
                                        transition: opacity 0.3s 0.3s; /* Zpožděné zobrazení při otevírání */
                                    }
                                    .psw-icon-active {
                                        position: absolute;
                                        left: 12px;
                                        top: 50%;
                                        transform: translateY(-50%);
                                        color: #005b96;
                                        opacity: 0;
                                        transition: opacity 0.1s 0s;
                                    }
                                    .psw-wrap.open .psw-icon-active {
                                        opacity: 1;
                                        transition: opacity 0.3s 0.3s;
                                    }
                                    .psw-close {
                                        position: absolute;
                                        right: 10px;
                                        top: 50%;
                                        transform: translateY(-50%);
                                        width: 20px;
                                        height: 20px;
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        cursor: pointer;
                                        color: #94a3b8;
                                        opacity: 0;
                                        transition: opacity 0.1s 0s;
                                        z-index: 3;
                                    }
                                    .psw-wrap.open .psw-close {
                                        opacity: 1;
                                        transition: opacity 0.3s 0.4s;
                                    }
                                `}</style>

                                <div className={`psw-wrap ${isSearchOpen ? 'open' : ''}`}>
                                    <div className="psw-box">
                                        <div className="psw-border" />
                                        
                                        <div 
                                            className="psw-label-init"
                                            onClick={() => setIsSearchOpen(true)}
                                        >
                                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                                            </svg>
                                            <span>Vyhledat další produkty</span>
                                        </div>

                                        <div className="psw-icon-active">
                                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                                            </svg>
                                        </div>

                                        <input
                                            className="psw-input"
                                            type="text"
                                            value={searchQuery}
                                            onChange={e => handleInlineSearch(e.target.value)}
                                            placeholder="Vyhledat další produkty..."
                                            ref={el => { if (el && isSearchOpen) el.focus(); }}
                                        />

                                        <div 
                                            className="psw-close"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsSearchOpen(false);
                                                setSearchQuery('');
                                                setSearchResults([]);
                                            }}
                                        >
                                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                                {isSearchOpen && (
                                    <div ref={searchResultsRef} className="mt-1 border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                                        {isSearching && (
                                            <div className="flex items-center justify-center gap-2 py-3 text-slate-400 text-sm">
                                                {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 bg-bewit-blue rounded-full animate-bounce" style={{animationDelay: `${i*0.15}s`}} />)}
                                                <span>Hledám...</span>
                                            </div>
                                        )}
                                        {!isSearching && searchResults.length > 0 && (
                                            <div className="max-h-56 overflow-y-auto divide-y divide-slate-50">
                                                {searchResults.map(p => (
                                                    <a key={p.product_code} href={p.url || '#'} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors no-underline group">
                                                        {p.thumbnail
                                                            ? <img src={p.thumbnail} alt={p.product_name} className="w-9 h-9 rounded-lg object-contain flex-shrink-0 bg-gray-50" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                                            : <div className="w-9 h-9 rounded-lg bg-slate-100 flex-shrink-0 flex items-center justify-center text-sm">📦</div>
                                                        }
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-slate-800 truncate group-hover:text-bewit-blue">{p.product_name}</p>
                                                            {p.category && <p className="text-xs text-slate-400 truncate">{p.category}</p>}
                                                        </div>
                                                        <span className="text-slate-300 group-hover:text-bewit-blue flex-shrink-0 text-sm">→</span>
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                        {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
                                            <p className="text-center text-sm text-slate-400 py-3">Žádné produkty nenalezeny</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Produktová doporučení - zobrazí se pokud jsou zapnutá v nastavení chatbotu */}
                    {!isUser && message.productRecommendations && message.productRecommendations.length > 0 && 
                     chatbotSettings?.product_recommendations && (
                        <div className="mt-4">
                            <ProductCarousel 
                                products={message.productRecommendations} 
                                showSimilarity={true}
                                title="🛍️ Doporučené produkty"
                                token={token}
                            />
                        </div>
                    )}
                    
                    {/* Produktové doporučení na tlačítko - zobrazí se pokud je zapnuté v nastavení */}
                    {!isUser && chatbotSettings?.product_button_recommendations && sessionId && lastUserQuery && (
                        <div className="mt-4">
                            <ProductRecommendationButton
                                userQuery={lastUserQuery}
                                botResponse={message.text}
                                sessionId={sessionId}
                                token={token}
                            />
                        </div>
                    )}
                    
                    {/* 🆕 Žlutý callout NEBO manuální funnel tlačítko - zobrazí se když zpráva má flag hasCallout = true */}
                    {!isUser && message.hasCallout && (
                        <>
                        {chatbotSettings?.enable_manual_funnel ? (
                            /* 🆕 Manuální funnel spouštěč - tlačítko místo calloutu */
                            <ManualFunnelButton
                                recommendedProducts={recommendedProducts}
                                sessionId={sessionId || ''}
                                token={token}
                                metadata={metadata}
                                chatHistory={chatHistory}
                            />
                        ) : (
                            /* Původní žlutý callout */
                            <div className="mt-4 p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg">
                                <div className="flex items-start gap-2">
                                    <span className="text-amber-500 text-lg flex-shrink-0">💡</span>
                                    <p className="text-sm text-amber-800">
                                        <strong>Potřebujete přesnější doporučení?</strong>
                                        <br />
                                        <span className="text-amber-700">
                                            Napište nám více o svých symptomech nebo potřebách, abychom mohli produkty lépe zacílit přímo pro vás.
                                        </span>
                                    </p>
                                </div>
                                
                                {/* Aloe/Merkaba doporučení na spodku calloutu */}
                                {chatbotSettings?.enable_product_pairing && message.pairingInfo && (message.pairingInfo.aloe || message.pairingInfo.merkaba) && (
                                    <div className="mt-3 pt-3 border-t border-amber-200">
                                        <p className="text-xs font-medium text-amber-700 mb-2">Doplňkové doporučení:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {message.pairingInfo.aloe && (
                                                message.pairingInfo.aloeUrl ? (
                                                    <a href={`${message.pairingInfo.aloeUrl}${message.pairingInfo.aloeUrl?.includes('?') ? '&' : '?'}utm_source=chatbot`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-xs font-medium hover:bg-green-200 transition-colors">
                                                        <span className="text-base">💧</span>
                                                        <span>{message.pairingInfo.aloeProductName || 'Aloe Vera gel'}</span>
                                                    </a>
                                                ) : (
                                                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                                        <span className="text-base">💧</span>
                                                        <span>{message.pairingInfo.aloeProductName || 'Aloe Vera gel'}</span>
                                                    </div>
                                                )
                                            )}
                                            {message.pairingInfo.merkaba && (
                                                message.pairingInfo.merkabaUrl ? (
                                                    <a href={`${message.pairingInfo.merkabaUrl}${message.pairingInfo.merkabaUrl?.includes('?') ? '&' : '?'}utm_source=chatbot`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-800 rounded-full text-xs font-medium hover:bg-purple-200 transition-colors">
                                                        <span className="text-base">✨</span>
                                                        <span>Merkaba doporučeno</span>
                                                    </a>
                                                ) : (
                                                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                                                        <span className="text-base">✨</span>
                                                        <span>Merkaba doporučeno</span>
                                                    </div>
                                                )
                                            )}
                                            {/* Tlačítko "Další doprovodné produkty" - Panacea / TČM wan */}
                                            {(message.pairingInfo.companionProducts?.length ?? 0) > 0 && (
                                                <button
                                                    onClick={() => setIsCompanionProductsOpen(v => !v)}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-600 border border-amber-200 rounded-full text-xs font-medium hover:bg-amber-100 transition-colors"
                                                >
                                                    <span>Další doprovodné produkty</span>
                                                    <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${isCompanionProductsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>

                                        {/* Rozbalovací sekce s doprovodými produkty - skupinované podle kategorie */}
                                        {isCompanionProductsOpen && (message.pairingInfo.companionProducts?.length ?? 0) > 0 && (
                                            <div className="mt-2 pt-2 border-t border-amber-100 flex flex-col gap-4">
                                                {(() => {
                                                    const byCategory: Record<string, typeof message.pairingInfo.companionProducts> = {};
                                                    message.pairingInfo.companionProducts!.forEach(p => {
                                                        const cat = p.category || 'Ostatní';
                                                        if (!byCategory[cat]) byCategory[cat] = [];
                                                        byCategory[cat]!.push(p);
                                                    });
                                                    return Object.entries(byCategory).map(([cat, products]) => (
                                                        <div key={cat}>
                                                            <p className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-wider">{cat}</p>
                                                            <div className="flex flex-col gap-2.5">
                                                                {products!.map((p, i) => (
                                                                    <ProductCalloutButton
                                                                        key={`companion-${cat}-${i}`}
                                                                        productName={p.name}
                                                                        thumbnail={p.thumbnail || undefined}
                                                                        url={p.url || ''}
                                                                        token={token}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ));
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Tlačítko "Chci o produktech vědět víc" - vždy zobrazeno pod calloutem */}
                                <EoSmesiLearnMoreButton
                                    matchedProducts={message.matchedProducts || []}
                                    sessionId={sessionId}
                                    onAddMessage={onAddMessage}
                                    companionProducts={message.pairingInfo?.companionProducts}
                                    isCompanionOpen={isCompanionProductsOpen}
                                />
                            </div>
                        )
                        }
                        </>
                    )}
                    
                    {/* Standardní zdroje uvnitř bubble (pro ostatní chatboty) */}
                    {/* Zdroje UVNITŘ bubble - pro všechny chatboty (včetně Sana Local Format) - VŽDY NAPOSLED */}
                    {!isUser && message.sources && message.sources.length > 0 && chatbotSettings?.show_sources !== false && (
                        <div className={`mt-4 pt-4 border-t ${isUser ? 'border-t-white/30' : 'border-t-slate-200'}`}>
                            <h4 className={`text-xs font-semibold mb-2 uppercase tracking-wider ${isUser ? 'text-white/80' : 'text-slate-500'}`}>
                                Zdroje
                            </h4>
                            <div className="flex flex-col gap-1">
                                {message.sources.map((source, index) => (
                                    <div key={index} className={`text-xs ${isUser ? 'text-white/90' : 'text-slate-600'}`}>
                                        - {source.title}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                )}
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
    onProblemSelect?: (problem: string) => void;
    shouldAutoScroll?: boolean;
    chatbotSettings?: {
        product_recommendations: boolean;
        product_button_recommendations: boolean;
        inline_product_links?: boolean;
        book_database: boolean;
        use_feed_1?: boolean;
        use_feed_2?: boolean;
        webhook_url?: string;  // NEW N8N webhook URL pro tento chatbot
        enable_product_router?: boolean;  // NEW Zapnutí/vypnutí produktového routeru
        enable_manual_funnel?: boolean;   // NEW Zapnutí manuálního funnel spouštěče
        show_sources?: boolean;  // NEW Zobrazování zdrojů
        group_products_by_category?: boolean;  // NEW Grupování produktů podle kategorií
        enable_product_pairing?: boolean;  // NEW Párování kombinací produktů
    };
    sessionId?: string;
    token?: string;  // NEW Token z externalUserInfo
    chatbotId?: string;  // NEW Pro Sana 2 markdown rendering
    selectedCategories?: string[];  // NEW Pro manuální funnel metadata
    selectedLabels?: string[];      // NEW Pro manuální funnel metadata
    selectedPublicationTypes?: string[];  // NEW Pro manuální funnel metadata
    onAddMessage?: (message: ChatMessage) => void;  // Callback pro přidání zprávy z EO Směsi "vědět víc"
    onSwitchToUniversal?: () => void;  // Přepnutí na Universal chatbot (tlačítko Poradce)
}> = ({ messages, isLoading, onSilentPrompt, onProblemSelect, shouldAutoScroll = true, chatbotSettings, sessionId, token, chatbotId, selectedCategories = [], selectedLabels = [], selectedPublicationTypes = [], onAddMessage, onSwitchToUniversal }) => {
    const chatEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const [lastMessageCount, setLastMessageCount] = useState(0);
    const [showScrollButton, setShowScrollButton] = useState(false);
    
    useEffect(() => {
        // NO AUTOMATICKÝ SCROLL ZAKÁZÁN - uživatel scrolluje pouze manuálně
        // Pouze sledujeme změny zpráv pro potenciální zobrazení indikátoru
        const newMessageAdded = messages.length > lastMessageCount;
        
        if (newMessageAdded) {
            // Zobrazíme tlačítko pro scroll dolů, pokud uživatel není na konci
            if (chatContainerRef.current) {
                const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
                const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50;
                if (!isAtBottom) {
                    setShowScrollButton(true);
                }
            }
        }
        
        setLastMessageCount(messages.length);
    }, [messages, lastMessageCount]);
    
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
                    
                    // NEW Pro ManualFunnelButton - extrahujeme produkty z celé historie
                    const historyForFunnel = messages.slice(0, index + 1).map(m => ({
                        id: m.id,
                        role: m.role,
                        text: m.text,
                        hasCallout: m.hasCallout
                    }));
                    const recommendedProductsForFunnel = extractProductsFromHistory(historyForFunnel);
                    const chatHistoryForFunnel = historyForFunnel.map(m => ({
                        id: m.id,
                        role: m.role,
                        text: m.text.replace(/<<<PRODUCT:[^>]+>>>/g, '').trim()
                    }));
                    
                    return (
                        <Message 
                            key={msg.id} 
                            message={msg} 
                            onSilentPrompt={onSilentPrompt} 
                            onProblemSelect={onProblemSelect}
                            chatbotSettings={chatbotSettings}
                            sessionId={sessionId}
                            token={token}
                            lastUserQuery={lastUserQuery}
                            chatbotId={chatbotId}
                            // NEW Props pro ManualFunnelButton
                            recommendedProducts={recommendedProductsForFunnel}
                            chatHistory={chatHistoryForFunnel}
                            metadata={{
                                categories: selectedCategories,
                                labels: selectedLabels,
                                publication_types: selectedPublicationTypes
                            }}
                            onAddMessage={onAddMessage}
                            onSwitchToUniversal={onSwitchToUniversal}
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

interface ProductSearchResult {
    product_code: string;
    product_name: string;
    category?: string;
    url?: string;
    thumbnail?: string;
}

const ChatInput: React.FC<{
    onSendMessage: (text: string) => void;
    isLoading: boolean;
    modeSwitch?: React.ReactNode;
    searchMode?: boolean;
    chatbotId?: string;
}> = ({ onSendMessage, isLoading, modeSwitch, searchMode, chatbotId }) => {
    const [input, setInput] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    // Vyhledávač stav
    const [searchResults, setSearchResults] = useState<ProductSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchMode) return;
        if (input.trim() && !isLoading) {
            onSendMessage(input);
            setInput('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (searchMode) return;
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

    // Při přepnutí módu vyčisti vstup a výsledky
    useEffect(() => {
        setInput('');
        setSearchResults([]);
    }, [searchMode]);

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setInput(val);
        if (!searchMode) return;
        if (searchDebounce.current) clearTimeout(searchDebounce.current);
        if (val.trim().length < 2) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        searchDebounce.current = setTimeout(async () => {
            try {
                const found = await searchProductsAutocomplete(val.trim(), 20);
                setSearchResults(found);
            } catch {
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 300);
    };

    const placeholder = searchMode
        ? 'Hledejte produkty...'
        : chatbotId === 'universal'
            ? 'Máte dotaz na TČM? Které oleje provoní váš domov? Napište, co vás zajímá...'
            : 'Popište co vás trápí...';

    return (
        <div className="relative">
            {/* Toggle NAD polem */}
            {modeSwitch && (
                <div className="flex justify-end mb-2">
                    {modeSwitch}
                </div>
            )}

            {/* Výsledky vyhledávání — nad inputem */}
            {searchMode && (searchResults.length > 0 || isSearching) && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50 max-h-80 overflow-y-auto">
                    {isSearching ? (
                        <div className="flex items-center justify-center py-6 gap-2 text-slate-400">
                            {[0,1,2].map(i => (
                                <div key={i} className="w-2 h-2 bg-bewit-blue rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                            ))}
                            <span className="text-sm ml-1">Hledám...</span>
                        </div>
                    ) : (
                        <>
                            <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Produkty</span>
                                <span className="text-xs text-slate-400">{searchResults.length} výsledků</span>
                            </div>
                            {searchResults.map((product) => (
                                <a
                                    key={product.product_code}
                                    href={product.url || '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors no-underline group border-b border-slate-50 last:border-0"
                                >
                                    {product.thumbnail ? (
                                        <img
                                            src={product.thumbnail}
                                            alt={product.product_name}
                                            className="w-10 h-10 rounded-lg object-contain flex-shrink-0 bg-gray-50"
                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex-shrink-0 flex items-center justify-center text-base">📦</div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-800 truncate group-hover:text-bewit-blue transition-colors">{product.product_name}</p>
                                        {product.category && <p className="text-xs text-slate-400 truncate">{product.category}</p>}
                                    </div>
                                    <svg className="w-4 h-4 text-slate-300 group-hover:text-bewit-blue flex-shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                </a>
                            ))}
                        </>
                    )}
                </div>
            )}

            <form onSubmit={handleSubmit} className="relative">
                <div className={`flex items-center bg-white border rounded-xl shadow-sm transition-all duration-200 p-3 ${
                    searchMode
                        ? 'border-bewit-blue ring-2 ring-bewit-blue/20'
                        : 'border-slate-300 focus-within:ring-2 focus-within:ring-bewit-blue'
                }`}>
                    {searchMode && (
                        <svg className="w-4 h-4 text-bewit-blue mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                    )}
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        className="w-full flex-1 px-2 py-2 bg-transparent resize-none focus:outline-none text-bewit-dark placeholder-slate-400 leading-5"
                        rows={1}
                        style={{ maxHeight: '120px', minHeight: '40px' }}
                        disabled={isLoading && !searchMode}
                    />
                    {!searchMode && (
                        <button type="submit" disabled={isLoading || !input.trim()} className="ml-3 flex-shrink-0 w-10 h-10 rounded-lg bg-bewit-blue text-white flex items-center justify-center transition-colors duration-200 disabled:bg-slate-300 disabled:cursor-not-allowed hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bewit-blue" aria-label="Odeslat zprávu">
                            {isLoading ? (<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>) : (<SendIcon className="w-5 h-5" />)}
                        </button>
                    )}
                </div>
            </form>
        </div>
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
        inline_product_links?: boolean;  // NEW Inline produktové linky
        book_database: boolean;
        use_feed_1?: boolean;
        use_feed_2?: boolean;
        webhook_url?: string;  // NEW N8N webhook URL pro tento chatbot
        group_products_by_category?: boolean;  // NEW Grupování produktů podle kategorií
        enable_product_pairing?: boolean;  // NEW Párování kombinací produktů
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
    currentUser,  // NEW Přihlášený uživatel
    selectedCategories, 
    selectedLabels, 
    selectedPublicationTypes,
    chatbotSettings = { 
        product_recommendations: false, 
        product_button_recommendations: false, 
        inline_product_links: false,  // NEW Inline produktové linky
        book_database: true,
        use_feed_1: true,
        use_feed_2: true,
        enable_product_router: true,   // NEW Defaultně zapnutý
        enable_manual_funnel: false,    // NEW Defaultně vypnutý
        summarize_history: false,       // NEW Defaultně vypnutá sumarizace
        allowed_product_categories: []  // NEW Defaultně všechny kategorie povoleny
    },
    chatbotId,  // NEW Pro Sana 2 markdown rendering
    originalChatbotId, // 🆕 Původní ID chatbota před přepnutím
    onClose,
    onSessionReady,
    onSwitchToUniversal,
    modeSwitch,  // SEARCH Toggle UI
    searchMode,  // SEARCH Vyhledávací mód
    externalUserInfo  // NEW External user data z iframe embedu
}) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [sessionId, setSessionId] = useState<string>('');
    const [selectedLanguage, setSelectedLanguage] = useState<string>('cs');
    const [autoScroll, setAutoScroll] = useState<boolean>(true);
    
    // 🔗 Token z externalUserInfo pro prokliknutí produktů
    const userToken = externalUserInfo?.token_eshop;
    
    // NEW State pro sumarizovanou historii (pro N8N webhook)
    const [summarizedHistory, setSummarizedHistory] = useState<string[]>([]);
    // HOT useRef pro okamžitý přístup k sumarizacím (React state je asynchronní!)
    const summarizedHistoryRef = useRef<string[]>([]);

    useEffect(() => {
        const newSessionId = generateSessionId();
        setSessionId(newSessionId);
        onSessionReady?.(newSessionId);
        
        // Log chatbot info
        console.group('🚀 Chat Session Started');
        console.log('Session ID:', newSessionId);
        console.log('Chatbot ID:', chatbotId);
        console.log('Chatbot Settings:', {
            product_recommendations: chatbotSettings?.product_recommendations,
            product_button_recommendations: chatbotSettings?.product_button_recommendations,
            enable_product_router: chatbotSettings?.enable_product_router,
            enable_manual_funnel: chatbotSettings?.enable_manual_funnel,
            summarize_history: chatbotSettings?.summarize_history,
            show_sources: chatbotSettings?.show_sources
        });
        console.log('User Info:', {
            userId: currentUser?.id || externalUserInfo?.external_user_id || 'anonymous',
            email: currentUser?.email || externalUserInfo?.email || 'N/A',
            firstName: currentUser?.firstName || externalUserInfo?.first_name || 'N/A',
            lastName: currentUser?.lastName || externalUserInfo?.last_name || 'N/A',
            role: currentUser?.role || externalUserInfo?.position || 'N/A'
        });
        console.groupEnd();
        
        // Spustíme KOMPLETNÍ diagnostiku vektorové databáze při prvním načtení
        if (chatbotSettings.product_recommendations) {
            
            // Nejprve rychlý test
            quickVectorSearchTest().catch(() => {
                // Silent fail
            });
            
            // Pak kompletní test po 3 sekundách
            setTimeout(() => {
                runCompleteVectorTest().catch(() => {
                    // Silent fail
                });
            }, 3000);
        }
    }, [chatbotSettings.product_recommendations]);

    // SEARCH Callback pro výběr problému z formuláře (EO Směsi Chat)
    const handleProblemSelection = useCallback(async (selectedProblem: string) => {
        console.log('🎯 handleProblemSelection:', selectedProblem);
        setIsLoading(true);
        
        // Zablokuj formulář výběru – zabráníme opakovanému odeslání při rerenderu
        setMessages(prev => prev.map(msg =>
            msg.requiresProblemSelection ? { ...msg, problemSelectionSubmitted: true } : msg
        ));

        try {
            console.log('🔄 Volám processEoSmesiQueryWithKnownProblem...');
            const eoSmesiResult = await processEoSmesiQueryWithKnownProblem(selectedProblem);
            console.log('✅ eoSmesiResult:', eoSmesiResult);
            
            if (eoSmesiResult.shouldShowTable && eoSmesiResult.medicineTable) {
                const matchedProducts = eoSmesiResult.medicineTable.products.map(p => ({
                    productName: p.name,
                    pinyinName: '',
                    productUrl: p.url || '',
                    product_code: p.code,
                    category: p.category
                }));
                
                const botMessage: ChatMessage = {
                    id: Date.now().toString(),
                    role: 'bot',
                    text: `Doporučili bychom vám tyto produkty:`,
                    matchedProducts: matchedProducts,
                    pairingInfo: {
                        prawteins: eoSmesiResult.medicineTable.prawtein ? [eoSmesiResult.medicineTable.prawtein] : [],
                        tcmWans: [],
                        aloe: eoSmesiResult.medicineTable.aloe,
                        aloeProductName: eoSmesiResult.medicineTable.aloeProductName || undefined,
                        merkaba: eoSmesiResult.medicineTable.merkaba,
                        aloeUrl: eoSmesiResult.medicineTable.aloeUrl || undefined,
                        merkabaUrl: eoSmesiResult.medicineTable.merkabaUrl || undefined,
                        companionProducts: eoSmesiResult.medicineTable.companionProducts || []
                    }
                };
                
                setMessages(prev => [...prev, botMessage]);
                
                if (currentUser?.id || externalUserInfo?.external_user_id) {
                    const userId = currentUser?.id || externalUserInfo?.external_user_id!;
                    await saveChatPairToHistory(
                        sessionId,
                        userId,
                        chatbotId || 'eo_smesi',
                        selectedProblem,
                        botMessage.text,
                        { categories: selectedCategories, labels: selectedLabels, publication_types: selectedPublicationTypes }
                    );
                }
            } else {
                const botMessage: ChatMessage = {
                    id: Date.now().toString(),
                    role: 'bot',
                    text: `Pro váš výběr jsem bohužel nenašel odpovídající kombinaci v naší databázi.`
                };
                setMessages(prev => [...prev, botMessage]);
            }
        } catch (error) {
            console.error('❌ handleProblemSelection error:', error);
            const errorMessage: ChatMessage = {
                id: Date.now().toString(),
                role: 'bot',
                text: 'Omlouvám se, při zpracování vašeho výběru došlo k chybě. Zkuste to prosím znovu.'
            };
            
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    }, [currentUser, externalUserInfo, chatbotId, sessionId, selectedCategories, selectedLabels, selectedPublicationTypes]);

    const handleSendMessage = useCallback(async (text: string) => {
        if (!text.trim() || !sessionId) return;

        // 🚫 KONTROLA DENNÍHO LIMITU ZPRÁV
        try {
            const { supabase } = await import('../../lib/supabase');
            const { data: limits, error } = await supabase
                .from('message_limits')
                .select('chatbot_id, daily_limit, current_count')
                .or(`chatbot_id.eq.${chatbotId},chatbot_id.is.null`);

            if (!error && limits && limits.length > 0) {
                // 1️⃣ Kontrola GLOBÁLNÍHO limitu (má přednost!)
                const globalLimit = limits.find(l => l.chatbot_id === null || !l.chatbot_id);
                if (globalLimit && globalLimit.daily_limit !== null && globalLimit.current_count >= globalLimit.daily_limit) {
                    const errorMessage: ChatMessage = {
                        id: Date.now().toString(),
                        role: 'bot',
                        text: 'Omlouváme se, ale denní počet zpráv je již vyčerpán. Nový limit bude dnes od 0:00.'
                    };
                    setMessages(prev => [...prev, errorMessage]);
                    setIsLoading(false);
                    return;
                }

                // 2️⃣ Kontrola INDIVIDUÁLNÍHO limitu chatbota
                const chatbotLimit = limits.find(l => l.chatbot_id === chatbotId);
                if (chatbotLimit && chatbotLimit.daily_limit !== null && chatbotLimit.current_count >= chatbotLimit.daily_limit) {
                    const errorMessage: ChatMessage = {
                        id: Date.now().toString(),
                        role: 'bot',
                        text: 'Omlouváme se, ale denní počet zpráv je již vyčerpán. Nový limit bude dnes od 0:00.'
                    };
                    setMessages(prev => [...prev, errorMessage]);
                    setIsLoading(false);
                    return;
                }
            }
        } catch (limitError) {
            // Pokračuj i při chybě (fail-open) - lepší je poslat zprávu než blokovat kvůli chybě
        }

        const userMessage: ChatMessage = { id: Date.now().toString(), role: 'user', text: text };
        const newMessages: ChatMessage[] = [...messages, userMessage];
        setMessages(newMessages);
        setIsLoading(true);
        
        // Zapneme auto-scroll při novém dotazu uživatele
        setAutoScroll(true);

        // Připravíme metadata pro ukládání (uložíme až po odpovědi bota)
        const currentMetadataForHistory: any = {};
        if (selectedCategories.length > 0) currentMetadataForHistory.categories = selectedCategories;
        if (selectedLabels.length > 0) currentMetadataForHistory.labels = selectedLabels;
        if (selectedPublicationTypes.length > 0) currentMetadataForHistory.publication_types = selectedPublicationTypes;

        try {
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
            
            // ═══════════════════════════════════════════════════════════════
            // 🌿 EO SMĚSI CHAT WORKFLOW - ZPRACOVÁNÍ VIA eoSmesiWorkflowService
            // ═══════════════════════════════════════════════════════════════
            // Pokud v historii je již EO Směsi "Chci vědět víc" odpověď,
            // přeskočíme EO Směsi flow a chatujeme přímo přes webhook (bez nového calloutu)
            const hasEoSmesiLearnMoreResponse = messages.some(m => m.hideProductCallout === true);
            if (chatbotId === 'eo_smesi' && !hasEoSmesiLearnMoreResponse) {
                try {
                    const eoSmesiResult = await processEoSmesiQuery(text.trim(), sessionId);
                    
                    // SEARCH SITUACE A: Agent si NENÍ jistý → dotazník nebo přímé zpracování
                    if (eoSmesiResult.problemClassification.requiresUserSelection && 
                        eoSmesiResult.problemClassification.uncertainProblems &&
                        eoSmesiResult.problemClassification.uncertainProblems.length > 0) {
                        
                        const uncertainProblems = eoSmesiResult.problemClassification.uncertainProblems;
                        
                        // Pokud je jen 1 možnost, přeskočíme dotazník a zpracujeme přímo
                        if (uncertainProblems.length === 1) {
                            const directResult = await processEoSmesiQueryWithKnownProblem(uncertainProblems[0]);
                            if (directResult.shouldShowTable && directResult.medicineTable) {
                                const matchedProducts = directResult.medicineTable.products.map(p => ({
                                    productName: p.name,
                                    pinyinName: '',
                                    productUrl: p.url || '',
                                    product_code: p.code,
                                    category: p.category
                                }));
                                const botMessage: ChatMessage = {
                                    id: Date.now().toString(),
                                    role: 'bot',
                                    text: `Doporučili bychom vám tyto produkty:`,
                                    matchedProducts,
                                    pairingInfo: {
                                        prawteins: directResult.medicineTable.prawtein ? [directResult.medicineTable.prawtein] : [],
                                        tcmWans: [],
                                        aloe: directResult.medicineTable.aloe,
                                        aloeProductName: directResult.medicineTable.aloeProductName || undefined,
                                        merkaba: directResult.medicineTable.merkaba,
                                        aloeUrl: directResult.medicineTable.aloeUrl || undefined,
                                        merkabaUrl: directResult.medicineTable.merkabaUrl || undefined,
                                        companionProducts: directResult.medicineTable.companionProducts || []
                                    }
                                };
                                setMessages(prev => [...prev, botMessage]);
                                setIsLoading(false);
                                return;
                            }
                        }
                        
                        // Více možností → zobrazíme formulář pro výběr
                        const botMessage: ChatMessage = {
                            id: Date.now().toString(),
                            role: 'bot',
                            text: `Nalezl jsem více možných příčin. Prosím vyberte tu, která nejlépe odpovídá vašemu stavu:`,
                            requiresProblemSelection: true,
                            uncertainProblems
                        };
                        
                        setMessages(prev => [...prev, botMessage]);
                        setIsLoading(false);
                        return;
                    }
                    
                    // 🟢 SITUACE B: Agent JE si jistý → zobrazíme callout s produkty (existující flow)
                    if (eoSmesiResult.shouldShowTable && eoSmesiResult.medicineTable) {
                        // Připravíme matchedProducts ve formátu, který používá existující "Související produkty BEWIT" rendering
                        const matchedProducts = eoSmesiResult.medicineTable.products.map(p => ({
                            productName: p.name,
                            pinyinName: '', // EO Směsi nemají pinyin
                            productUrl: p.url || '',
                            product_code: p.code,  // OK snake_case pro enrichFunnelProductsFromDatabase
                            category: p.category
                        }));
                        
                        const botMessage: ChatMessage = {
                            id: Date.now().toString(),
                            role: 'bot',
                            text: `Doporučili bychom vám tyto produkty:`,
                            matchedProducts: matchedProducts,
                            pairingInfo: {
                                prawteins: eoSmesiResult.medicineTable.prawtein ? [eoSmesiResult.medicineTable.prawtein] : [],
                                tcmWans: [],
                                aloe: eoSmesiResult.medicineTable.aloe,
                                aloeProductName: eoSmesiResult.medicineTable.aloeProductName || undefined,
                                merkaba: eoSmesiResult.medicineTable.merkaba,
                                aloeUrl: eoSmesiResult.medicineTable.aloeUrl || undefined,
                                merkabaUrl: eoSmesiResult.medicineTable.merkabaUrl || undefined,
                                companionProducts: eoSmesiResult.medicineTable.companionProducts || []
                            }
                        };
                        
                        setMessages(prev => [...prev, botMessage]);
                        
                        if (currentUser?.id || externalUserInfo?.external_user_id) {
                            const userId = currentUser?.id || externalUserInfo?.external_user_id!;
                            await saveChatPairToHistory(
                                userId,
                                chatbotId,
                                text.trim(),
                                botMessage.text,
                                currentMetadataForHistory
                            );
                        }
                    } else {
                        const botMessage: ChatMessage = {
                            id: Date.now().toString(),
                            role: 'bot',
                            text: `Pro váš dotaz jsem bohužel nenašel odpovídající kombinaci v naší databázi léčebných receptur. Můžete zkusit přeformulovat dotaz nebo se zeptat na konkrétní zdravotní problém.`
                        };
                        
                        setMessages(prev => [...prev, botMessage]);
                        
                        if (currentUser?.id || externalUserInfo?.external_user_id) {
                            const userId = currentUser?.id || externalUserInfo?.external_user_id!;
                            await saveChatPairToHistory(
                                userId,
                                chatbotId,
                                text.trim(),
                                botMessage.text,
                                currentMetadataForHistory
                            );
                        }
                    }
                    
                    setIsLoading(false);
                    return;
                    
                } catch (error) {
                    const errorMessage: ChatMessage = {
                        id: Date.now().toString(),
                        role: 'bot',
                        text: `Omlouvám se, při zpracování vašeho dotazu došlo k chybě. Zkuste to prosím znovu.`
                    };
                    
                    setMessages(prev => [...prev, errorMessage]);
                    setIsLoading(false);
                    return;
                }
            }
            
            // ═══════════════════════════════════════════════════════════════
            // 🔀 INTENT ROUTING PRO WANY CHAT (vany_chat) - MUSÍ BÝT PRVNÍ!
            // ═══════════════════════════════════════════════════════════════
            // NEW Kontrola enable_product_router - pokud je false, přeskočíme intent routing
            const enableProductRouter = chatbotSettings?.enable_product_router !== false;
            if (chatbotId === 'vany_chat' && enableProductRouter) {
                
                // Získáme poslední zprávu bota
                const lastBotMessage = messages.filter(m => m.role === 'bot').pop();
                const lastBotText = lastBotMessage?.text || '';
                
                // NEW KRITICKÉ: Intent routing se aktivuje POUZE pokud je žlutý callout v historii
                // A ZÁROVEŇ není zapnutý manuální funnel (ten má vlastní logiku)
                // Kontrolujeme FLAG hasCallout místo hledání textu!
                const hasCallout = messages.some(m => m.role === 'bot' && m.hasCallout === true);
                const enableManualFunnel = chatbotSettings?.enable_manual_funnel === true;
                // Pokud je zapnutý manuální funnel, nepouštíme automatický intent routing
                // Uživatel musí použít tlačítko ManualFunnelButton
                if (!hasCallout || enableManualFunnel) {
                    // NO ŽÁDNÝ CALLOUT NEBO MANUÁLNÍ FUNNEL → Standardní chat, nepoužívat intent routing
                    if (enableManualFunnel && hasCallout) {
                    } else {
                    }
                    // Pokračujeme standardním flow níže (mimo tento blok)
                } else {
                    // OK CALLOUT DETEKOVÁN → Spustit intent routing
                    // Extrahujeme produkty z historie
                    const conversationHistory = messages.map(m => ({ 
                        role: m.role, 
                        text: m.text,
                        hasCallout: m.hasCallout // 🆕 Přidáme flag pro callout
                    }));
                    const recommendedProducts = extractProductsFromHistory(conversationHistory);
                    // Zavoláme intent routing (LLM rozhodne)
                    const intentResult = await routeUserIntent(
                        text.trim(),
                        conversationHistory,
                        lastBotText,
                        recommendedProducts
                    );
                if (intentResult.symptomList && intentResult.symptomList.length > 0) {
                }
                
                // Diagnostika rozhodnutí - ZJEDNODUŠENO: pouze chat/funnel/update_funnel
                const shouldBeFunnel = intentResult.intent === 'funnel';
                const shouldUpdateFunnel = intentResult.intent === 'update_funnel';
                const hasProducts = recommendedProducts.length > 0;
                // ═══════════════════════════════════════════════════════════════
                // 🔄 UPDATE FUNNEL - Uživatel chce změnit produkty v existujícím funnelu
                // ═══════════════════════════════════════════════════════════════
                // Pro update_funnel pokračujeme do N8N - ten rozhodne jak aktualizovat
                // Intent se pošle jako součást payloadu do N8N
                
                // ═══════════════════════════════════════════════════════════════
                // 🎯 FUNNEL MODE: Spustit produktový funnel přes N8N webhook
                // ═══════════════════════════════════════════════════════════════
                // NEW Podporujeme jak 'funnel' tak 'update_funnel'!
                if ((intentResult.intent === 'funnel' || intentResult.intent === 'update_funnel') && recommendedProducts.length > 0) {
                    // ═══════════════════════════════════════════════════════════════
                    // 🎯 PRODUCT FUNNEL MODE - PŘÍPRAVA DAT PRO N8N WEBHOOK
                    // ═══════════════════════════════════════════════════════════════
                    // === 1. SEZNAM SYMPTOMŮ ===
                    const symptoms = intentResult.symptomList && intentResult.symptomList.length > 0 
                        ? intentResult.symptomList 
                        : [text.trim()];
                    symptoms.forEach((symptom, index) => {
                    });
                    // === 2. SEZNAM PRODUKTŮ Z PRODUCT PILLS ===
                    recommendedProducts.forEach((product, index) => {
                        if (product.description) {
                        }
                    });
                    // === 3. SYSTEM PROMPT PRO FUNNEL ===
                    const FUNNEL_SYSTEM_PROMPT = `Jsi expert na tradiční čínskou medicínu (TČM) a produkty BEWIT.

## TVŮJ ÚKOL
Na základě symptomů uživatele vyber PŘESNĚ 2 NEJLEPŠÍ produkty z poskytnutého seznamu a vytvoř detailní doporučení.

## ⚠️ KRITICKÉ PRAVIDLO - POUZE PRODUKTY ZE SEZNAMU!
NESMÍŠ doporučovat žádné jiné produkty než ty, které jsou uvedeny v seznamu "Vybrané produkty"!
Pokud v seznamu jsou např. "009 - Čistý dech" a "200 - Volné meridiány", MUSÍŠ pracovat POUZE s těmito produkty.
NIKDY nedoporučuj produkty, které nejsou v seznamu - ani je nezmiňuj.

## PRAVIDLA
1. Vyber PŘESNĚ 2 produkty z poskytnutého seznamu, které nejlépe odpovídají symptomům
2. Pro každý produkt vysvětli PROČ je vhodný pro dané symptomy
3. Uveď jak produkt používat (dávkování, aplikace)
4. Buď konkrétní a praktický
5. Piš v češtině, přátelským tónem
6. NIKDY nedoporučuj produkty mimo poskytnutý seznam!

## FORMÁT ODPOVĚDI
Vytvoř krásně formátovanou odpověď v markdown s doporučením obou vybraných produktů z poskytnutého seznamu.`;
                    FUNNEL_SYSTEM_PROMPT.split('\n').forEach(line => {
                    });
                    // === 4. SESTAVENÍ chatInput PRO FUNNEL ===
                    // Formát IDENTICKÝ jako běžný chat, jen obsah je strukturovaný
                    
                    // Seznam produktů - formátujeme přehledně s pinyin názvy pokud jsou dostupné
                    const productList = recommendedProducts.map(p => {
                        if (p.description) {
                            // Máme pinyin název (z Product Pills)
                            return `${p.product_name} (${p.description})`;
                        }
                        return p.product_name;
                    });
                    
                    // Pouze unikátní názvy pro přehlednost
                    const uniqueProductNames = [...new Set(productList)];
                    const productNamesString = uniqueProductNames.join(', ');
                    
                    // Seznam symptomů
                    const symptomsList = symptoms.join(', ');
                    
                    // Sestavíme chatInput ve formátu, který N8N očekává
                    // ⚠️ DŮLEŽITÉ: Explicitně zdůrazňujeme, že se má pracovat POUZE s vybranými produkty
                    const funnelChatInput = `⚠️ OMEZENÍ: Pracuj POUZE s těmito vybranými produkty, NEDOPORUČUJ žádné jiné!

Vybrané produkty (POUZE TYTO): ${productNamesString}

Symptomy zákazníka: ${symptomsList}

ÚKOL: Z výše uvedených ${recommendedProducts.length} produktů (${productNamesString}) vyber 2 nejlepší pro dané symptomy.
- Detailně rozepiš proč jsou vhodné
- Uveď jak je používat
- NEDOPORUČUJ žádné jiné produkty mimo tento seznam!`;

                    // Přidáme jazykovou instrukci
                    const instruction = languageInstructions[selectedLanguage];
                    const funnelChatInputWithLang = `${funnelChatInput} ${instruction}`;
                    
                    // === 5. KOMPLETNÍ PAYLOAD PRO N8N WEBHOOK ===
                    // IDENTICKÁ struktura jako běžný chat!
                    const WANY_WEBHOOK_URL = 'https://n8n.srv980546.hstgr.cloud/webhook/22856d03-acea-4174-89ae-1b6f0c8ede71/chat';
                    
                    // Očistíme historii - N8N potřebuje POUZE id, role, text
                    // Odstraníme markery a všechna extra pole (matchedProducts, sources, atd.)
                    const cleanedHistory = newMessages.slice(0, -1).map(msg => ({
                        id: msg.id,
                        role: msg.role,
                        text: msg.text.replace(/<<<PRODUCT:[^>]+>>>/g, '').trim()
                    }));
                    
                    const funnelPayload = {
                        sessionId: sessionId,
                        action: "sendMessage",
                        chatInput: funnelChatInputWithLang,
                        chatHistory: cleanedHistory,
                        metadata: {
                            categories: selectedCategories,
                            labels: selectedLabels,
                            publication_types: selectedPublicationTypes
                        }
                    };
                    // === 6. VOLÁNÍ N8N WEBHOOKU ===
                    try {
                        console.log('📤 N8N Webhook Payload (Wany Chat):', funnelPayload);
                        
                        const response = await fetch(WANY_WEBHOOK_URL, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(funnelPayload)
                        });
                        if (!response.ok) {
                            throw new Error(`N8N webhook error: ${response.status} ${response.statusText}`);
                        }
                        
                        const data = await response.json();
                        // Zpracování odpovědi z N8N
                        let responsePayload = Array.isArray(data) ? data[0] : data;
                        if (responsePayload?.json) responsePayload = responsePayload.json;
                        
                        const botText = responsePayload?.output || responsePayload?.html || responsePayload?.text || responsePayload?.response || 'Nepodařilo se získat odpověď.';
                        
                        // 🔄 OBOHACENÍ PRODUKTŮ Z DATABÁZE product_feed_2
                        // Toto zajistí správné obrázky, ceny a URL z databáze
                        // Vezmeme max 2 produkty a obohacíme je o data z databáze
                        const productsToEnrich = recommendedProducts.slice(0, 2);
                        const enrichedProducts = await enrichFunnelProductsFromDatabase(productsToEnrich);
                        
                        // Připravíme produkty pro funnel UI - s obohacenými daty
                        const funnelProductsWithDetails: FunnelProduct[] = enrichedProducts.map(p => ({
                            product_code: p.product_code,
                            product_name: p.product_name,
                            description: p.description,
                            description_short: p.description,
                            price: p.price,
                            currency: p.currency || 'CZK',
                            // URL a obrázek z databáze product_feed_2
                            url: p.url || `https://bewit.love/produkt/${p.product_code}`,
                            thumbnail: p.thumbnail  // 🖼️ OBRÁZEK Z DATABÁZE!
                        }));
                        
                        const botMessage: ChatMessage = {
                            id: (Date.now() + 1).toString(),
                            role: 'bot',
                            text: botText,
                            sources: responsePayload?.sources || [],
                            isFunnelMessage: true,
                            funnelProducts: funnelProductsWithDetails,
                            symptomList: symptoms
                        };
                        
                        setMessages(prev => [...prev, botMessage]);
                        
                        // SAVE Uložíme PAR otázka-odpověď do historie
                        saveChatPairToHistory(
                            sessionId,
                            currentUser?.id,
                            chatbotId,
                            text.trim(),  // Otázka uživatele
                            botText,      // Odpověď bota
                            Object.keys(currentMetadataForHistory).length > 0 ? currentMetadataForHistory : undefined,
                            {
                                sources: responsePayload?.sources,
                                isFunnelMessage: true,
                                funnelProducts: funnelProductsWithDetails,
                                symptomList: symptoms,
                                user_info: externalUserInfo  // NEW External user data z iframe
                            }
                        );
                        
                        setIsLoading(false);
                        return; // ⚠️ UKONČIT - FUNNEL MODE ZPRACOVÁN
                        
                    } catch (funnelError) {
                        // Fallback na standardní chat mode
                    }
                } else {
                    // CHAT MODE po intent routingu: Pokračovat normálním webhook flow (níže)
                }
                }
                // Konec if (hasCallout)
                
                // STANDARDNÍ CHAT pokračuje normálním flow (níže)
            }
            
            // === KOMBINOVANÉ VYHLEDÁVÁNÍ - OBA ZDROJE NAJEDNOU ===
            if (chatbotSettings.book_database && chatbotSettings.product_recommendations) {
                // Použijeme kombinovanou službu s callback pro postupné zobrazování
                let botMessageId = (Date.now() + 1).toString();
                
                const onBooksReceived = (booksResult: Partial<{ text: string; sources: any[]; productRecommendations: ProductRecommendation[] }>) => {
                    const botMessage: ChatMessage = { 
                        id: botMessageId, 
                        role: 'bot', 
                        text: booksResult.text || '', 
                        sources: booksResult.sources || [],
                        productRecommendations: booksResult.productRecommendations
                    };
                    setMessages(prev => {
                        const newMessages = [...prev, botMessage];
                        return newMessages;
                    });
                    // Po zobrazení knih zakážeme auto-scroll pro produkty
                    setAutoScroll(false);
                };
                
                const onProductsReceived = (products: ProductRecommendation[]) => {
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
                // HOT SUMARIZACE: Pokud je zapnutá, vytvoříme sumarizovanou historii MÍSTO plné historie
                // Používáme REF protože React state je asynchronní!
                let historyToSend;
                if (chatbotSettings.summarize_history && summarizedHistoryRef.current.length > 0) {
                    // Převedeme sumarizace do formátu ChatMessage
                    historyToSend = summarizedHistoryRef.current.map((summary, index) => ({
                        id: `summary-${index}`,
                        role: 'summary' as const,
                        text: summary
                    }));
                } else {
                    // Normální historie zpráv
                    historyToSend = newMessages.slice(0, -1);
                }
                
                // Standardní chat - bez intent routingu (žádný callout v historii)
                // N8N sám přidá žlutý callout pokud detekuje zdravotní symptomy
                
                // 🔗 KLASIFIKACE PROBLÉMU - Pokud je zapnuté párování, klasifikuj problém PARALELNĚ s webhookem
                let classifiedProblems: string[] = [];
                if (chatbotSettings.enable_product_pairing) {
                    try {
                        const classificationResult = await classifyProblemFromUserMessage(text.trim());
                        if (classificationResult.success) {
                            classifiedProblems = classificationResult.problems;
                            // 🔀 DETEKCE VÍCE PROBLÉMŮ: Uživatel zmínil více problémů najednou
                            if (classificationResult.multipleProblems && classificationResult.allMentionedProblems && classificationResult.allMentionedProblems.length > 0) {
                                const firstProblem = classificationResult.allMentionedProblems[0];
                                const multiProblemMessage: ChatMessage = {
                                    id: (Date.now() + 1).toString(),
                                    role: 'bot',
                                    text: `Pojďme se nejprve zaměřit na jeden problém a následně vyřešíme druhý. Souhlasíte?\n\nZačneme s: **${firstProblem}**`,
                                    sources: [],
                                    matchedProducts: [],
                                    hasCallout: false
                                };
                                setMessages(prev => [...prev, multiProblemMessage]);
                            }
                        }
                    } catch (classificationError) {
                    }
                } else {
                }
                
                // 🔗 KROK 2: SQL PÁROVÁNÍ (PŘED voláním N8N webhooku!)
                // Získáme NÁZVY produktů z SQL, které se pak spojí s extrahovanými názvy
                let pairedProductNames: string[] = [];
                let pairingMetadata: any = null;
                
                if (chatbotSettings.enable_product_pairing && classifiedProblems.length > 0) {
                    try {
                        const pairingResult = await matchProductCombinationsWithProblems(classifiedProblems);
                        
                        if (pairingResult.products.length > 0) {
                            // Hlavní produkty jdou do N8N, companion (Panacea) se uloží zvlášť
                            const mainProducts = pairingResult.products.filter((p: any) => !p.is_companion);
                            const companionProducts = pairingResult.products.filter((p: any) => p.is_companion);
                            pairedProductNames = mainProducts.map((p: any) => p.matched_product_name);
                            pairingMetadata = {
                                aloe: pairingResult.aloe,
                                merkaba: pairingResult.merkaba,
                                productCount: mainProducts.length,
                                companionProducts: companionProducts.map((p: any) => ({
                                    name: p.matched_product_name,
                                    url: p.matched_product_url,
                                    thumbnail: p.matched_thumbnail,
                                    category: p.matched_category
                                }))
                            };
                        } else {
                        }
                    } catch (pairingError) {
                    }
                }
                
                const webhookResult = await sendMessageToAPI(
                    promptForBackend, 
                    sessionId, 
                    historyToSend,  // HOT BUĎTO sumarizace NEBO celá historie
                    currentMetadata, 
                    chatbotSettings.webhook_url, 
                    chatbotId,
                    undefined,  // intent
                    undefined,  // detectedSymptoms
                    currentUser,  // NEW Přidáno: informace o uživateli
                    externalUserInfo,  // NEW External user data z iframe
                    undefined,  // Tenhle parametr už nepoužíváme - posíláme přímo v history
                    chatbotSettings.allowed_product_categories,  // NEW Povolené produktové kategorie
                    pairedProductNames,  // NEW Názvy produktů z SQL párování
                    !!(chatbotSettings.inline_product_links || chatbotSettings.enable_product_pairing)  // NEW Screening jen když je zapnutý
                );
                
                // 🔗 Přidáme párování metadata do výsledku (pokud existují)
                let pairingInfo: any = null;
                if (pairingMetadata) {
                    pairingInfo = {
                        ...pairingMetadata,
                        mergedCount: webhookResult.matchedProducts?.length || 0
                    };
                }
                
                // Detekce calloutu - pokud máme více než 2 produkty, zobraz callout
                // Ale pokud v historii je EO Směsi "Chci vědět víc" odpověď, callout se nezobrazí
                const shouldShowCallout = !hasEoSmesiLearnMoreResponse && (webhookResult.matchedProducts?.length || 0) > 2;
                const botMessage: ChatMessage = { 
                    id: (Date.now() + 1).toString(), 
                    role: 'bot', 
                    text: shouldShowCallout ? 'Doporučili bychom vám tyto produkty:' : webhookResult.text, 
                    sources: webhookResult.sources || [],
                    productRecommendations: undefined,
                    matchedProducts: webhookResult.matchedProducts || [],
                    hasCallout: shouldShowCallout,
                    pairingInfo: pairingInfo || undefined
                };
                
                setMessages(prev => [...prev, botMessage]);
                
                // SAVE Uložíme PAR otázka-odpověď do historie
                saveChatPairToHistory(
                    sessionId,
                    currentUser?.id,
                    chatbotId,
                    text.trim(),
                    webhookResult.text,
                    Object.keys(currentMetadataForHistory).length > 0 ? currentMetadataForHistory : undefined,
                    {
                        sources: webhookResult.sources,
                        matchedProducts: webhookResult.matchedProducts,
                        hasCallout: shouldShowCallout,
                        user_info: externalUserInfo
                    }
                );
                
                // HOT OKAMŽITĚ vytvoříme sumarizaci AKTUÁLNÍ Q&A páru (na pozadí)
                // Sumarizace se přidá do REF i STATE - REF je okamžitě dostupný!
                if (chatbotSettings.summarize_history) {
                    createSimpleSummary(text.trim(), webhookResult.text).then(summary => {
                        if (summary) {
                            // Aktualizuj REF (okamžitě dostupné) - max 2 nejnovější sumarizace
                            const updatedRef = [...summarizedHistoryRef.current, summary];
                            summarizedHistoryRef.current = updatedRef.slice(-2);
                            
                            // Aktualizuj STATE (pro React rendering) - max 2 nejnovější
                            setSummarizedHistory(prev => {
                                const newHistory = [...prev, summary];
                                return newHistory.slice(-2);
                            });
                        }
                    }).catch(err => {
                    });
                }
                
            }
            // === POUZE PRODUKTOVÉ DOPORUČENÍ - HYBRIDNÍ SYSTÉM ===
            else if (chatbotSettings.product_recommendations) {
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
                    const productRecommendations: ProductRecommendation[] = hybridProducts.map((product) => ({
                        product_code: product.product_code,
                        product_name: product.product_name,
                        description: product.description,
                        product_url: product.product_url,
                        image_url: product.image_url,
                        price: product.price || null,
                        currency: product.currency || 'CZK',
                        category: product.category,
                        similarity: product.similarity_score
                    }));
                    
                    // 🔗 PÁROVÁNÍ KOMBINACÍ - Pokud máme produkty, hledej kombinace v leceni
                    let pairingInfo: any = null;
                    if (productRecommendations.length > 0 && chatbotSettings.enable_product_pairing) {
                        try {
                            const productCodes = productRecommendations
                                .filter(p => p.category === 'Esenciální oleje' || p.product_code)
                                .map(p => p.product_code);
                            
                            if (productCodes.length > 0) {
                                const combinations = await findCombinationsForEOs(productCodes);
                                if (combinations.length > 0) {
                                    pairingInfo = extractPairingProducts(combinations);
                                }
                            }
                        } catch (pairingError) {
                        }
                    }
                    
                    const botMessage: ChatMessage = { 
                        id: (Date.now() + 1).toString(), 
                        role: 'bot', 
                        text: productRecommendations.length > 0 ? 
                            `🎯 Našel jsem ${productRecommendations.length} doporučených produktů podle vašich potřeb:` : 
                            '🔍 Bohužel jsem nenašel žádné produkty odpovídající vašemu dotazu.',
                        sources: [],
                        productRecommendations: productRecommendations.length > 0 ? productRecommendations : undefined,
                        pairingInfo: pairingInfo || undefined
                    };
                    
                    setMessages(prev => [...prev, botMessage]);
                    // Po zobrazení produktů zakážeme auto-scroll
                    setAutoScroll(false);
                    
                } catch (error) {
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
                const errorMessage: ChatMessage = { 
                    id: (Date.now() + 1).toString(), 
                    role: 'bot', 
                    text: '⚠️ Není zapnutý žádný zdroj dat. Prosím, zapněte buď databázi knih nebo produktová doporučení v nastavení chatbota.'
                };
                setMessages(prev => [...prev, errorMessage]);
            }
            
        } catch (error) {
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
            const instruction = languageInstructions[selectedLanguage];
            const promptForBackend = `${text.trim()} ${instruction}`;
            const { text: botText, sources, productRecommendations, matchedProducts } = await sendMessageToAPI(
                promptForBackend, 
                sessionId, 
                messages, 
                currentMetadata, 
                chatbotSettings.webhook_url, 
                chatbotId,
                undefined,  // intent
                undefined,  // detectedSymptoms
                currentUser,  // NEW Přidáno: informace o uživateli
                externalUserInfo,  // NEW External user data z iframe
                chatbotSettings.summarize_history ? summarizedHistory : undefined,  // NEW Sumarizovaná historie
                chatbotSettings.allowed_product_categories,  // NEW Povolené produktové kategorie
                undefined,  // pairedProductNames
                !!(chatbotSettings.inline_product_links || chatbotSettings.enable_product_pairing)  // NEW Screening jen když je zapnutý
            );
            const botMessage: ChatMessage = { 
                id: (Date.now() + 1).toString(), 
                role: 'bot', 
                text: botText, 
                sources: sources,
                productRecommendations: productRecommendations,
                matchedProducts: matchedProducts // 🆕 Přidáme matched produkty
            };
            setMessages(prev => [...prev, botMessage]);
            
            // HOT SUMARIZACE - pokud je zapnutá v nastavení - max 2 nejnovější
            if (chatbotSettings.summarize_history) {
                const summary = await createSimpleSummary(text.trim(), botText);
                if (summary) {
                    setSummarizedHistory(prev => {
                        const newHistory = [...prev, summary].slice(-2);
                        return newHistory;
                    });
                }
            }
        } catch (error) {
            const errorMessageText = error instanceof Error ? error.message : 'Omlouvám se, došlo k neznámé chybě.';
            const errorMessage: ChatMessage = { id: (Date.now() + 1).toString(), role: 'bot', text: errorMessageText };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    }, [sessionId, messages, selectedLanguage, selectedCategories, selectedLabels, selectedPublicationTypes, summarizedHistory, chatbotSettings.summarize_history]);

    const handleAddMessage = useCallback((message: ChatMessage) => {
        setMessages(prev => [...prev, message]);
        // Pokud je zapnutá sumarizace, přidáme EO Směsi odpověď do summarizedHistoryRef - max 2 nejnovější
        if (chatbotSettings.summarize_history && message.role === 'bot' && message.text) {
            createSimpleSummary('Chci o produktech vědět víc', message.text).then(summary => {
                if (summary) {
                    const updatedRef = [...summarizedHistoryRef.current, summary];
                    summarizedHistoryRef.current = updatedRef.slice(-2);
                    setSummarizedHistory(prev => [...prev, summary].slice(-2));
                }
            });
        }
    }, [chatbotSettings.summarize_history]);

    const handleNewChat = useCallback(() => {
        setMessages([]);
        setSummarizedHistory([]);
        summarizedHistoryRef.current = [];
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
                        onProblemSelect={handleProblemSelection}
                        shouldAutoScroll={autoScroll} 
                        chatbotSettings={chatbotSettings}
                        sessionId={sessionId}
                        token={userToken}
                        chatbotId={chatbotId}
                        selectedCategories={selectedCategories}
                        selectedLabels={selectedLabels}
                        selectedPublicationTypes={selectedPublicationTypes}
                        onAddMessage={handleAddMessage}
                        onSwitchToUniversal={onSwitchToUniversal}
                     />
                </div>
                <div className="w-full max-w-4xl p-4 md:p-6 bg-bewit-gray flex-shrink-0 border-t border-slate-200 mx-auto">
                    <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} modeSwitch={modeSwitch} searchMode={searchMode} chatbotId={chatbotId} />
                </div>
            </main>

            {/* Popup: Doporučení nového chatu - dočasně znefunkčněno */}
        </div>
    );
};

const SanaChat: React.FC<SanaChatProps> = ({ 
    currentUser,  // NEW Přihlášený uživatel
    selectedCategories, 
    selectedLabels, 
    selectedPublicationTypes,
    chatbotSettings = { 
        product_recommendations: false, 
        product_button_recommendations: false, 
        inline_product_links: false,  // NEW Inline produktové linky
        book_database: true,
        use_feed_1: true,
        use_feed_2: true,
        enable_product_router: true,   // NEW Defaultně zapnutý
        enable_manual_funnel: false,    // NEW Defaultně vypnutý
        summarize_history: false       // NEW Defaultně vypnutá sumarizace
    },
    chatbotId,  // NEW Pro Sana 2 markdown rendering
    originalChatbotId, // 🆕 Původní ID chatbota před přepnutím
    onClose,
    onSwitchToUniversal,
    modeSwitch,  // SEARCH Toggle UI
    searchMode,  // SEARCH Vyhledávací mód
    externalUserInfo  // NEW External user data z iframe embedu
}) => {
    // 🚨 EXTREME DIAGNOSTIKA #1 - SANACHAT WRAPPER
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [sessionId, setSessionId] = useState<string>('');
    const [selectedLanguage, setSelectedLanguage] = useState<string>('cs');
    const [autoScroll, setAutoScroll] = useState<boolean>(true);
    const [isFilterPanelVisible, setIsFilterPanelVisible] = useState<boolean>(false);
    const [summarizedHistory, setSummarizedHistory] = useState<string[]>([]);
    const summarizedHistoryRef = useRef<string[]>([]);

    // Token z externalUserInfo pro prokliknutí produktů
    const userToken = externalUserInfo?.token_eshop;

    useEffect(() => {
        setSessionId(generateSessionId());
    }, []);

    const handleSendMessage = useCallback(async (text: string) => {
        if (!text.trim() || !sessionId) return;

        // 🚫 KONTROLA DENNÍHO LIMITU ZPRÁV
        try {
            const { supabase } = await import('../../lib/supabase');
            const { data: limits, error } = await supabase
                .from('message_limits')
                .select('chatbot_id, daily_limit, current_count')
                .or(`chatbot_id.eq.${chatbotId},chatbot_id.is.null`);

            if (!error && limits && limits.length > 0) {
                // 1️⃣ Kontrola GLOBÁLNÍHO limitu (má přednost!)
                const globalLimit = limits.find(l => l.chatbot_id === null || !l.chatbot_id);
                if (globalLimit && globalLimit.daily_limit !== null && globalLimit.current_count >= globalLimit.daily_limit) {
                    const errorMessage: ChatMessage = {
                        id: Date.now().toString(),
                        role: 'bot',
                        text: 'Omlouváme se, ale denní počet zpráv je již vyčerpán. Nový limit bude dnes od 0:00.'
                    };
                    setMessages(prev => [...prev, errorMessage]);
                    return;
                }

                // 2️⃣ Kontrola INDIVIDUÁLNÍHO limitu chatbota
                const chatbotLimit = limits.find(l => l.chatbot_id === chatbotId);
                if (chatbotLimit && chatbotLimit.daily_limit !== null && chatbotLimit.current_count >= chatbotLimit.daily_limit) {
                    const errorMessage: ChatMessage = {
                        id: Date.now().toString(),
                        role: 'bot',
                        text: 'Omlouváme se, ale denní počet zpráv je již vyčerpán. Nový limit bude dnes od 0:00.'
                    };
                    setMessages(prev => [...prev, errorMessage]);
                    return;
                }
            }
        } catch (limitError) {
            // Pokračuj i při chybě (fail-open) - lepší je poslat zprávu než blokovat kvůli chybě
        }

        const userMessage: ChatMessage = { id: Date.now().toString(), role: 'user', text: text };
        const newMessages: ChatMessage[] = [...messages, userMessage];
        setMessages(newMessages);
        setIsLoading(true);
        
        // Zapneme auto-scroll při novém dotazu uživatele
        setAutoScroll(true);

        try {
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
            
            
            // === KOMBINOVANÉ VYHLEDÁVÁNÍ - OBA ZDROJE NAJEDNOU ===
            if (chatbotSettings.book_database && chatbotSettings.product_recommendations) {
                // Použijeme kombinovanou službu s callback pro postupné zobrazování
                let botMessageId = (Date.now() + 1).toString();
                
                const onBooksReceived = (booksResult: Partial<{ text: string; sources: any[]; productRecommendations: ProductRecommendation[] }>) => {
                    const botMessage: ChatMessage = { 
                        id: botMessageId, 
                        role: 'bot', 
                        text: booksResult.text || '', 
                        sources: booksResult.sources || [],
                        productRecommendations: booksResult.productRecommendations
                    };
                    setMessages(prev => {
                        const newMessages = [...prev, botMessage];
                        return newMessages;
                    });
                    // Po zobrazení knih zakážeme auto-scroll pro produkty
                    setAutoScroll(false);
                };
                
                const onProductsReceived = (products: ProductRecommendation[]) => {
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
                // 🔗 KROK 1: KLASIFIKACE PROBLÉMU
                let classifiedProblems: string[] = [];
                if (chatbotSettings.enable_product_pairing) {
                    try {
                        const problemResult = await classifyProblemFromUserMessage(text.trim());
                        if (problemResult.success) {
                            // 🔀 DETEKCE VÍCE PROBLÉMŮ – zkontroluj PŘED přiřazením classifiedProblems
                            if (problemResult.multipleProblems && problemResult.allMentionedProblems && problemResult.allMentionedProblems.length > 0) {
                                const firstProblem = problemResult.allMentionedProblems[0];
                                const multiProblemMessage: ChatMessage = {
                                    id: (Date.now() + 1).toString(),
                                    role: 'bot',
                                    text: `Pojďme se nejprve zaměřit na jeden problém a následně vyřešíme druhý. Souhlasíte?\n\nZačneme s: **${firstProblem}**`,
                                    sources: [],
                                    matchedProducts: [],
                                    hasCallout: false
                                };
                                setMessages(prev => [...prev, multiProblemMessage]);
                            }

                            if (problemResult.problems.length > 0) {
                                classifiedProblems = problemResult.problems;
                            } else {
                            }
                        }
                    } catch (classificationError) {
                    }
                } else {
                }
                
                // HOT SUMARIZACE: Pokud je zapnutá, vytvoříme sumarizovanou historii MÍSTO plné historie
                // Používáme REF protože React state je asynchronní!
                let historyToSend;
                if (settings.summarize_history && summarizedHistoryRef.current.length > 0) {
                    historyToSend = summarizedHistoryRef.current.map((summary, index) => ({
                        id: `summary-${index}`,
                        role: 'summary' as const,
                        text: summary
                    }));
                } else {
                    historyToSend = newMessages.slice(0, -1);
                }
                
                // 🔗 KROK 2: SQL PÁROVÁNÍ (PŘED voláním N8N webhooku!)
                // Získáme NÁZVY produktů z SQL, které se pak spojí s extrahovanými názvy
                let pairedProductNames: string[] = [];
                let pairingMetadata: any = null;
                
                if (chatbotSettings.enable_product_pairing && classifiedProblems.length > 0) {
                    try {
                        const pairingResult = await matchProductCombinationsWithProblems(classifiedProblems);
                        
                        if (pairingResult.products.length > 0) {
                            const mainProducts = pairingResult.products.filter((p: any) => !p.is_companion);
                            const companionProducts = pairingResult.products.filter((p: any) => p.is_companion);
                            pairedProductNames = mainProducts.map((p: any) => p.matched_product_name);
                            pairingMetadata = {
                                aloe: pairingResult.aloe,
                                merkaba: pairingResult.merkaba,
                                productCount: mainProducts.length,
                                companionProducts: companionProducts.map((p: any) => ({
                                    name: p.matched_product_name,
                                    url: p.matched_product_url,
                                    thumbnail: p.matched_thumbnail,
                                    category: p.matched_category
                                }))
                            };
                        }
                    } catch (pairingError) {
                    }
                }
                
                const webhookResult = await sendMessageToAPI(
                    promptForBackend, 
                    sessionId, 
                    historyToSend,  // HOT BUĎTO sumarizace NEBO celá historie
                    currentMetadata, 
                    chatbotSettings.webhook_url, 
                    chatbotId,
                    undefined,  // intent
                    undefined,  // detectedSymptoms
                    currentUser,  // NEW Přidáno: informace o uživateli
                    externalUserInfo,  // NEW External user data z iframe
                    undefined,  // Tenhle parametr už nepoužíváme
                    chatbotSettings.allowed_product_categories,  // NEW Povolené produktové kategorie
                    pairedProductNames,  // NEW Názvy produktů z SQL párování
                    !!(chatbotSettings.inline_product_links || chatbotSettings.enable_product_pairing)  // NEW Screening jen když je zapnutý
                );
                
                // 🔗 Přidáme párování metadata do výsledku (pokud existují)
                let pairingInfo: any = null;
                if (pairingMetadata) {
                    pairingInfo = {
                        ...pairingMetadata,
                        mergedCount: webhookResult.matchedProducts?.length || 0
                    };
                }
                
                // Detekce calloutu - pokud máme více než 2 produkty, zobraz callout
                // Ale pokud v historii je EO Směsi "Chci vědět víc" odpověď, callout se nezobrazí
                const hasEoSmesiLearnMoreResponse = messages.some(m => m.hideProductCallout === true);
                const shouldShowCallout = !hasEoSmesiLearnMoreResponse && (webhookResult.matchedProducts?.length || 0) > 2;
                const botMessage: ChatMessage = { 
                    id: (Date.now() + 1).toString(), 
                    role: 'bot', 
                    text: shouldShowCallout ? 'Doporučili bychom vám tyto produkty:' : webhookResult.text, 
                    sources: webhookResult.sources || [],
                    productRecommendations: undefined,
                    matchedProducts: webhookResult.matchedProducts || [],
                    hasCallout: shouldShowCallout,
                    pairingInfo: pairingInfo || undefined
                };
                
                setMessages(prev => [...prev, botMessage]);
                
                // HOT OKAMŽITĚ vytvoříme sumarizaci AKTUÁLNÍ Q&A páru (na pozadí) - max 2 nejnovější
                if (settings.summarize_history) {
                    createSimpleSummary(text.trim(), webhookResult.text).then(summary => {
                        if (summary) {
                            // Aktualizuj REF (okamžitě dostupné) - max 2 nejnovější
                            const updatedRef = [...summarizedHistoryRef.current, summary];
                            summarizedHistoryRef.current = updatedRef.slice(-2);
                            
                            // Aktualizuj STATE (pro React rendering) - max 2 nejnovější
                            setSummarizedHistory(prev => {
                                const newHistory = [...prev, summary];
                                return newHistory.slice(-2);
                            });
                        }
                    }).catch(err => {
                    });
                }
                
            }
            // === POUZE PRODUKTOVÉ DOPORUČENÍ - HYBRIDNÍ SYSTÉM ===
            else if (chatbotSettings.product_recommendations) {
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
                    const productRecommendations: ProductRecommendation[] = hybridProducts.map((product) => ({
                        product_code: product.product_code,
                        product_name: product.product_name,
                        description: product.description,
                        product_url: product.product_url,
                        image_url: product.image_url,
                        price: product.price || null,
                        currency: product.currency || 'CZK',
                        category: product.category,
                        similarity: product.similarity_score
                    }));
                    
                    // 🔗 PÁROVÁNÍ KOMBINACÍ - Pokud máme produkty, hledej kombinace v leceni
                    let pairingInfo: any = null;
                    if (productRecommendations.length > 0 && chatbotSettings.enable_product_pairing) {
                        try {
                            const productCodes = productRecommendations
                                .filter(p => p.category === 'Esenciální oleje' || p.product_code)
                                .map(p => p.product_code);
                            
                            if (productCodes.length > 0) {
                                const combinations = await findCombinationsForEOs(productCodes);
                                if (combinations.length > 0) {
                                    pairingInfo = extractPairingProducts(combinations);
                                }
                            }
                        } catch (pairingError) {
                        }
                    }
                    
                    const botMessage: ChatMessage = { 
                        id: (Date.now() + 1).toString(), 
                        role: 'bot', 
                        text: productRecommendations.length > 0 ? 
                            `🎯 Našel jsem ${productRecommendations.length} doporučených produktů podle vašich potřeb:` : 
                            '🔍 Bohužel jsem nenašel žádné produkty odpovídající vašemu dotazu.',
                        sources: [],
                        productRecommendations: productRecommendations.length > 0 ? productRecommendations : undefined,
                        pairingInfo: pairingInfo || undefined
                    };
                    
                    setMessages(prev => [...prev, botMessage]);
                    // Po zobrazení produktů zakážeme auto-scroll
                    setAutoScroll(false);
                    
                } catch (error) {
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
                const errorMessage: ChatMessage = { 
                    id: (Date.now() + 1).toString(), 
                    role: 'bot', 
                    text: '⚠️ Není zapnutý žádný zdroj dat. Prosím, zapněte buď databázi knih nebo produktová doporučení v nastavení chatbota.'
                };
                setMessages(prev => [...prev, errorMessage]);
            }
            
        } catch (error) {
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
            const instruction = languageInstructions[selectedLanguage];
            const promptForBackend = `${text.trim()} ${instruction}`;
            const { text: botText, sources, productRecommendations, matchedProducts } = await sendMessageToAPI(
                promptForBackend, 
                sessionId, 
                messages, 
                currentMetadata, 
                chatbotSettings.webhook_url, 
                chatbotId,
                undefined,  // intent
                undefined,  // detectedSymptoms
                currentUser,  // NEW Přidáno: informace o uživateli
                externalUserInfo,  // NEW External user data z iframe
                chatbotSettings.summarize_history ? summarizedHistory : undefined,  // NEW Sumarizovaná historie
                chatbotSettings.allowed_product_categories,  // NEW Povolené produktové kategorie
                undefined,  // pairedProductNames
                !!(chatbotSettings.inline_product_links || chatbotSettings.enable_product_pairing)  // NEW Screening jen když je zapnutý
            );
            const botMessage: ChatMessage = { 
                id: (Date.now() + 1).toString(), 
                role: 'bot', 
                text: botText, 
                sources: sources,
                productRecommendations: productRecommendations,
                matchedProducts: matchedProducts // 🆕 Přidáme matched produkty
            };
            setMessages(prev => [...prev, botMessage]);
            
            // HOT SUMARIZACE - pokud je zapnutá v nastavení - max 2 nejnovější
            if (settings.summarize_history) {
                const summary = await createSimpleSummary(text.trim(), botText);
                if (summary) {
                    setSummarizedHistory(prev => {
                        const newHistory = [...prev, summary].slice(-2);
                        return newHistory;
                    });
                }
            }
        } catch (error) {
            const errorMessageText = error instanceof Error ? error.message : 'Omlouvám se, došlo k neznámé chybě.';
            const errorMessage: ChatMessage = { id: (Date.now() + 1).toString(), role: 'bot', text: errorMessageText };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    }, [sessionId, messages, selectedLanguage, selectedCategories, selectedLabels, selectedPublicationTypes, currentUser, summarizedHistory, settings.summarize_history]);

    const handleAddMessage = useCallback((message: ChatMessage) => {
        setMessages(prev => [...prev, message]);
        // Pokud je zapnutá sumarizace, přidáme EO Směsi odpověď do summarizedHistoryRef - max 2 nejnovější
        if (chatbotSettings.summarize_history && message.role === 'bot' && message.text) {
            createSimpleSummary('Chci o produktech vědět víc', message.text).then(summary => {
                if (summary) {
                    const updatedRef = [...summarizedHistoryRef.current, summary];
                    summarizedHistoryRef.current = updatedRef.slice(-2);
                    setSummarizedHistory(prev => [...prev, summary].slice(-2));
                }
            });
        }
    }, [chatbotSettings.summarize_history]);

    const handleNewChat = useCallback(() => {
        setMessages([]);
        setSummarizedHistory([]);  // NEW Vyčistíme i sumarizace
        summarizedHistoryRef.current = [];
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
                                token={userToken}
                                chatbotId={chatbotId}
                                selectedCategories={selectedCategories}
                                selectedLabels={selectedLabels}
                                selectedPublicationTypes={selectedPublicationTypes}
                                onAddMessage={handleAddMessage}
                                onSwitchToUniversal={onSwitchToUniversal}
                             />
                        </div>
                        <div className="w-full max-w-4xl p-4 md:p-6 bg-bewit-gray flex-shrink-0 border-t border-slate-200 mx-auto">
                            <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} modeSwitch={modeSwitch} searchMode={searchMode} chatbotId={chatbotId} />
                            {onSwitchToUniversal && (
                                <AdvisorToggleButton chatbotId={chatbotId} onClick={onSwitchToUniversal} />
                            )}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
};

// --- KOMPONENTA S FILTERY ---
interface FilteredSanaChatProps {
    currentUser?: User;  // NEW Přihlášený uživatel
    chatbotSettings?: {
        product_recommendations: boolean;
        product_button_recommendations: boolean;
        inline_product_links?: boolean;  // NEW Inline produktové linky
        book_database: boolean;
        use_feed_1?: boolean;
        use_feed_2?: boolean;
        webhook_url?: string;  // NEW N8N webhook URL pro tento chatbot
        allowed_categories?: string[];  // NEW Povolené kategorie (UUID)
        allowed_labels?: string[];  // NEW Povolené štítky (UUID)
        allowed_publication_types?: string[];  // NEW Povolené typy publikací (UUID)
        enable_product_router?: boolean;  // NEW Produktový router
        enable_manual_funnel?: boolean;   // NEW Manuální funnel
        summarize_history?: boolean;  // NEW Sumarizace historie
        allowed_product_categories?: string[];  // NEW Povolené produktové kategorie
        group_products_by_category?: boolean;  // NEW Grupování produktů
        show_sources?: boolean;  // NEW Zobrazování zdrojů
        enable_product_pairing?: boolean;  // NEW Párování kombinací produktů
        enable_product_search?: boolean;   // SEARCH Vyhledávač produktů (Feed Agent toggle)
    };
    chatbotId?: string;  // NEW Pro Sana 2 markdown rendering
    onClose?: () => void;
    onSessionReady?: (sessionId: string) => void;  // Callback při vytvoření session (pro feedback)
    externalUserInfo?: {  // NEW External user data z iframe embedu
        external_user_id?: string;
        first_name?: string;
        last_name?: string;
        email?: string;
        position?: string;
        token_eshop?: string;  // NEW E-shop token z Bewit webu
        [key: string]: any;
    };
}

const UNIVERSAL_CHATBOT_SETTINGS = {
    product_recommendations: false,
    product_button_recommendations: false,
    inline_product_links: false,
    book_database: true,
    use_feed_1: false,
    use_feed_2: false,
    webhook_url: 'https://n8n.srv980546.hstgr.cloud/webhook/ca8f84c6-f3af-4a98-ae34-f8b1e031a481/chat',
    enable_product_router: false,
    enable_manual_funnel: false,
    summarize_history: false,
    show_sources: false,
};

// ============================================================================
// VYHLEDÁVAČ PRODUKTŮ - inline komponenty pro FilteredSanaChat
// ============================================================================

type TripleMode = 'problem' | 'search' | 'universal';

const SearchIconInline: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);

const FlaskIconInline: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M9 3h6M10 9h4M10 3v6l-4 8a2.5 2.5 0 0 0 2 3.5h8a2.5 2.5 0 0 0 2-3.5l-4-8V3" />
    </svg>
);

const UserIconInline: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);

interface TripleModeSwitchProps {
    mode: TripleMode;
    onChange: (mode: TripleMode) => void;
}

const TripleModeSwitch: React.FC<TripleModeSwitchProps> = ({ mode, onChange }) => (
    <div className="inline-flex items-center bg-slate-100 rounded-full p-1 gap-0.5 shadow-inner">
        <button
            type="button"
            onClick={() => onChange('problem')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-250 ${
                mode === 'problem'
                    ? 'bg-white text-bewit-blue shadow-md ring-1 ring-slate-200/80'
                    : 'text-slate-400 hover:text-slate-600'
            }`}
        >
            <FlaskIconInline className="w-3.5 h-3.5" />
            Poradce Bewit produktů
        </button>
        <button
            type="button"
            onClick={() => onChange('universal')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-250 ${
                mode === 'universal'
                    ? 'bg-white text-bewit-blue shadow-md ring-1 ring-slate-200/80'
                    : 'text-slate-400 hover:text-slate-600'
            }`}
        >
            <UserIconInline className="w-3.5 h-3.5" />
            Obecný poradce
        </button>
    </div>
);

// ============================================================================

const FilteredSanaChat: React.FC<FilteredSanaChatProps> = ({ 
    currentUser,  // NEW Přihlášený uživatel
    chatbotSettings = { 
        product_recommendations: false, 
        product_button_recommendations: false, 
        inline_product_links: false,
        book_database: true,
        use_feed_1: true,
        use_feed_2: true,
        enable_product_router: true,   // NEW Defaultně zapnutý
        enable_manual_funnel: false,   // NEW Defaultně vypnutý
        summarize_history: false,      // NEW Defaultně vypnutá sumarizace
        show_sources: true             // NEW Defaultně zapnuté zobrazování zdrojů
    },
    chatbotId,  // NEW Pro Sana 2 markdown rendering
    onClose,
    onSessionReady,
    externalUserInfo  // NEW External user data z iframe embedu
}) => {
    // Uložíme nastavení do state pro správný scope v useCallback
    const [settings, setSettings] = useState(chatbotSettings);
    
    // chatKey slouží pro force remount SanaChatContent (nový chat)
    const [chatKey, setChatKey] = useState(0);
    // SEARCH Trojitý mód: poradce Bewit produktů / vyhledávač / obecný poradce
    const [tripleMode, setTripleMode] = useState<TripleMode>('problem');
    // activeChatbotId umožňuje přepnutí chatbota (např. na Universal)
    const [activeChatbotId, setActiveChatbotId] = useState(chatbotId);
    // Flag: true = uživatel přepnul na Universal, ignoruj přepsání z parenta
    const isSwitchedToUniversal = useRef(false);


    // Přepnutí na Universal chatbot nebo zpět na původní (podle aktuálního stavu)
    const handleSwitchToUniversal = useCallback(async () => {
        if (activeChatbotId === 'universal') {
            isSwitchedToUniversal.current = false;
            setSettings(chatbotSettings);
            setActiveChatbotId(chatbotId);
            setChatKey(k => k + 1);
        } else {
            isSwitchedToUniversal.current = true;
            
            // 🚀 UI FLIP OKAMŽITĚ (pro lepší UX)
            setActiveChatbotId('universal');
            setChatKey(k => k + 1);
            
            try {
                // Rychlá kontrola jestli 'universal' existuje, abychom se vyhnuli 406 chybě z .single()
                const { data: universalExists, error: checkError } = await supabaseClient
                    .from('chatbot_settings')
                    .select('chatbot_id')
                    .eq('chatbot_id', 'universal')
                    .maybeSingle();

                if (checkError) {
                }

                if (universalExists) {
                    const universalSettings = await ChatbotSettingsService.getChatbotSettings('universal');
                    if (universalSettings) {
                        setSettings({
                            product_recommendations: universalSettings.product_recommendations,
                            product_button_recommendations: universalSettings.product_button_recommendations,
                            inline_product_links: universalSettings.inline_product_links ?? false,
                            book_database: universalSettings.book_database,
                            use_feed_1: universalSettings.use_feed_1 ?? false,
                            use_feed_2: universalSettings.use_feed_2 ?? false,
                            webhook_url: universalSettings.webhook_url,
                            enable_product_router: universalSettings.enable_product_router ?? false,
                            enable_manual_funnel: universalSettings.enable_manual_funnel ?? false,
                            summarize_history: universalSettings.summarize_history ?? false,
                            show_sources: universalSettings.show_sources ?? false,
                            allowed_product_categories: universalSettings.allowed_product_categories ?? [],
                            enable_product_pairing: universalSettings.enable_product_pairing ?? false,
                            allowed_labels: [] // V embedu schováváme štítky i pro universal
                        });
                    } else {
                        setSettings(UNIVERSAL_CHATBOT_SETTINGS);
                    }
                } else {
                    setSettings(UNIVERSAL_CHATBOT_SETTINGS);
                }
            } catch (err) {
                setSettings(UNIVERSAL_CHATBOT_SETTINGS);
            }
        }
    }, [activeChatbotId, chatbotSettings, chatbotId]);

    // Handler pro TripleModeSwitch - přepíná mód a synchronizuje chatbota
    const handleTripleModeChange = useCallback(async (newMode: TripleMode) => {
        setTripleMode(newMode);
        if (newMode === 'universal' && activeChatbotId !== 'universal') {
            await handleSwitchToUniversal();
        } else if (newMode !== 'universal' && activeChatbotId === 'universal') {
            await handleSwitchToUniversal();
        }
    }, [activeChatbotId, handleSwitchToUniversal]);
    
    // HOT KRITICKÉ: Aktualizujeme settings když se chatbotSettings změní
    // Tento useEffect zajišťuje, že změny z databáze se VŽDY promítnou do chatu
    // ALE ignorujeme přepsání pokud uživatel přepnul na Universal (activeChatbotId === 'universal')
    useEffect(() => {
        if (activeChatbotId === 'universal') return; // Uživatel přepnul, neresetuj
        setSettings(chatbotSettings);
        setActiveChatbotId(chatbotId);
    }, [chatbotSettings, chatbotId]); // eslint-disable-line react-hooks/exhaustive-deps
    
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
    
    // Definice jazyků pro hlavičku
    const languages = [
        { code: 'cs', label: 'CZ' }, 
        { code: 'sk', label: 'SK' }, 
        { code: 'de', label: 'DE' }, 
        { code: 'en', label: 'UK' }
    ];

    // Načteme metadata z databáze při startu komponenty
    useEffect(() => {
        const loadMetadata = async () => {
            // Fallback hodnoty - budou se použít jen pokud selže načtení z DB
            const allFallbackCategories = ['Aromaterapie', 'Masáže', 'Akupunktura', 'Diagnostika', 'TČM', 'Wany'];
            const allFallbackLabels = ['Osobní', 'Chci přečíst'];
            const allFallbackTypes = ['public', 'students', 'internal_bewit'];
            
            // Fallback hodnoty - respektujeme nastavení z chatbotSettings
            // Pokud není definované allowed_* (undefined), zobrazíme vše
            // Pokud je prázdné ([]), nezobrazíme nic
            // Pokud obsahuje UUID, načteme z DB a filtrujeme
            const fallbackCategories = settings?.allowed_categories === undefined
                ? allFallbackCategories // Undefined = zobraz vše
                : (settings.allowed_categories.length === 0 ? [] : []); // Prázdné nebo UUID = čekáme na DB
                
            const fallbackLabels = settings?.allowed_labels === undefined
                ? allFallbackLabels // Undefined = zobraz vše
                : []; // Prázdné nebo UUID = použij nastavení (prázdné = skryté)
                
            const fallbackTypes = settings?.allowed_publication_types === undefined
                ? allFallbackTypes // Undefined = zobraz vše
                : (settings.allowed_publication_types.length === 0 ? [] : []); // Prázdné nebo UUID = čekáme na DB
            setAvailableCategories(fallbackCategories);
            setAvailableLabels(fallbackLabels);
            setAvailablePublicationTypes(fallbackTypes);
            
            // Defaultně vše zaškrtnuté (pouze povolené položky)
            setSelectedCategories([...fallbackCategories]);
            setSelectedLabels([...fallbackLabels]);
            setSelectedPublicationTypes([...fallbackTypes]);
            try {
                const [labels, categories, publicationTypes] = await Promise.all([
                    api.getLabels(),
                    api.getCategories(), 
                    api.getPublicationTypes()
                ]);
                
                // Filtrujeme metadata podle povolených hodnot v chatbotSettings
                // allowed_* obsahují UUID, takže porovnáváme podle ID
                // Filtrování podle chatbotSettings
                // Pokud není definované (undefined) = zobraz vše
                // Pokud je prázdné ([]) = nezobraz nic
                // Pokud obsahuje ID = zobraz pouze ty
                const allowedCategories = settings?.allowed_categories === undefined
                    ? categories.map(cat => cat.name) // Undefined = zobraz vše
                    : settings.allowed_categories.length === 0
                        ? [] // Prázdné = skryté
                        : categories.filter(cat => settings.allowed_categories.includes(cat.id)).map(cat => cat.name);
                
                const allowedLabels = settings?.allowed_labels === undefined
                    ? labels.map(label => label.name) // Undefined = zobraz vše
                    : settings.allowed_labels.length === 0
                        ? [] // Prázdné = skryté
                        : labels.filter(label => settings.allowed_labels.includes(label.id)).map(label => label.name);
                
                const allowedPublicationTypes = settings?.allowed_publication_types === undefined
                    ? publicationTypes.map(type => type.name) // Undefined = zobraz vše
                    : settings.allowed_publication_types.length === 0
                        ? [] // Prázdné = skryté
                        : publicationTypes.filter(type => settings.allowed_publication_types.includes(type.id)).map(type => type.name);
                // Pouze pokud se načetly data z databáze, aktualizuji je
                if (allowedLabels.length > 0) {
                    setAvailableLabels(allowedLabels);
                    setSelectedLabels([...allowedLabels]); // Defaultně vše zaškrtnuté
                }
                if (allowedCategories.length > 0) {
                    setAvailableCategories(allowedCategories);
                    setSelectedCategories([...allowedCategories]); // Defaultně vše zaškrtnuté
                }
                if (allowedPublicationTypes.length > 0) {
                    setAvailablePublicationTypes(allowedPublicationTypes);
                    setSelectedPublicationTypes([...allowedPublicationTypes]); // Defaultně vše zaškrtnuté
                }
                
            } catch (error) {
            }
        };
        
        loadMetadata();
    }, [settings]); // Znovu načteme pokud se změní nastavení

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

    const handleNewChat = useCallback(() => {
        setChatKey(k => k + 1);
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
                
                {/* Kategorie - zobrazí se jen pokud existují povolené kategorie */}
                {availableCategories.length > 0 && (
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
                )}

                {/* Typy publikací - zobrazí se jen pokud existují povolené typy */}
                {availablePublicationTypes.length > 0 && (
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
                )}

                {/* Štítky - zobrazí se jen pokud existují povolené štítky */}
                {availableLabels.length > 0 && (
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
                )}

                </div>
            </div>
            
            {/* Pravá část s chatem */}
            <div className="flex-1 flex flex-col w-full">
                {/* Header - Jednotná hlavička */}
                <ChatHeader
                  onClose={onClose}
                  languages={languages}
                  selectedLanguage={selectedLanguage}
                  onLanguageChange={setSelectedLanguage}
                  leftContent={
                    <div className="flex items-center space-x-4">
                      {/* Filter toggle switch */}
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isFilterPanelVisible}
                          onChange={toggleFilterPanel}
                          className="sr-only peer"
                          aria-label="Zobrazit/skrýt filtry"
                        />
                        <div className="relative w-11 h-6 bg-white/20 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-white/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-white/40"></div>
                      </label>
                      <div className="h-6 w-px bg-white/20"></div>
                      <SanaAILogo className="h-10 w-auto object-contain" />
                    </div>
                  }
                  buttons={[
                    // NO Ikona produktů (košík) byla odstraněna
                    {
                      icon: 'plus',
                      onClick: handleNewChat,
                      label: 'Nový chat',
                      tooltip: 'Nový chat'
                    },
                    {
                      icon: 'download',
                      onClick: handleExportPdf,
                      label: 'Export do PDF',
                      tooltip: 'Export do PDF'
                    }
                  ]}
                />
                
                {/* Chat komponenta nebo ProductSync nebo Vyhledávač */}
                <div className="flex-1 bg-bewit-gray min-h-0">
                    {isProductSyncVisible ? (
                        <div className="w-full h-full flex-1 overflow-y-auto p-6">
                            <ProductSyncAdmin />
                        </div>
                    ) : (
                        <SanaChatContent 
                            key={chatKey}
                            currentUser={currentUser}
                            selectedCategories={selectedCategories}
                            selectedLabels={selectedLabels}
                            selectedPublicationTypes={selectedPublicationTypes}
                            chatbotSettings={settings}
                            chatbotId={activeChatbotId}
                            originalChatbotId={chatbotId}
                            externalUserInfo={externalUserInfo}
                            onClose={onClose}
                            onSessionReady={onSessionReady}
                            onSwitchToUniversal={undefined}
                            modeSwitch={
                                <TripleModeSwitch mode={tripleMode} onChange={handleTripleModeChange} />
                            }
                            searchMode={tripleMode === 'search'}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export { SanaChat, SanaChatContent, FilteredSanaChat };
export default FilteredSanaChat;
