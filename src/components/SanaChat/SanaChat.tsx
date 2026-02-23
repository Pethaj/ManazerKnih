
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { supabase as supabaseClient } from '../../lib/supabase';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import ProductSyncAdmin from './ProductSync';
import { ProductCarousel } from '../ProductCarousel';
import { ProductRecommendationButton } from '../ProductRecommendationButton';
import { ProductFunnelMessage } from '../ProductFunnelMessage';  // 🆕 Product Funnel UI
import { ManualFunnelButton } from '../ManualFunnelButton';  // 🆕 Manuální funnel spouštěč
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
            console.error('Error loading labels:', error);
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
            console.error('Error loading categories:', error);
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
            console.error('Error loading publication types:', error);
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
  // 🆕 Product Funnel data (pro Wany Chat)
  isFunnelMessage?: boolean;
  funnelProducts?: FunnelProduct[];
  symptomList?: string[];
  // Intent type pro update funnel
  isUpdateFunnel?: boolean;        // Uživatel chce změnit výběr v existujícím funnelu
  // 🆕 Flag pro žlutý callout (více než 2 produkty)
  hasCallout?: boolean;             // True = zobrazil se žlutý callout "Potřebujete přesnější doporučení?"
  // 🔗 Pairing info - párování produktů s kombinacemi z leceni
  pairingInfo?: {
    prawteins: string[];
    tcmWans: string[];
    aloe: boolean;
    merkaba: boolean;
    aloeUrl?: string;    // 🆕 URL pro Aloe produkt (textový odkaz)
    merkabaUrl?: string; // 🆕 URL pro Merkaba produkt (textový odkaz)
  };
  // 🔍 Problem Selection Form (pro EO Směsi Chat - mezikrok)
  requiresProblemSelection?: boolean;  // Flag: zobrazit formulář pro výběr problému?
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
  currentUser?: User;  // 🆕 Přihlášený uživatel
  selectedCategories: string[];
  selectedLabels: string[];
  selectedPublicationTypes: string[];
  chatbotSettings?: {
    product_recommendations: boolean;
    product_button_recommendations: boolean;  // 🆕 Produktové doporučení na tlačítko
    inline_product_links?: boolean;  // 🆕 Inline produktové linky (ChatGPT styl)
    book_database: boolean;
    use_feed_1?: boolean;  // 🆕 Použít Feed 1 (zbozi.xml)
    use_feed_2?: boolean;  // 🆕 Použít Feed 2 (Product Feed 2)
    webhook_url?: string;  // 🆕 N8N webhook URL pro tento chatbot
    enable_product_router?: boolean;  // 🆕 Zapnutí/vypnutí automatického produktového routeru
    enable_manual_funnel?: boolean;   // 🆕 Zapnutí manuálního funnel spouštěče
    summarize_history?: boolean;  // 🆕 Automatická sumarizace historie pro N8N webhook
    allowed_product_categories?: string[];  // 🆕 Povolené produktové kategorie pro filtrování Product Pills
    show_sources?: boolean;  // 🆕 Zobrazovat zdroje v odpovědích
    group_products_by_category?: boolean;  // 🆕 Grupování produktů podle kategorií
    enable_product_pairing?: boolean;  // 🆕 Párování kombinací produktů
  };
  chatbotId?: string;  // 🆕 ID chatbota (pro Sana 2 markdown rendering)
  onClose?: () => void;
  onSwitchToUniversal?: () => void;  // Přepnutí na Universal chatbot (tlačítko Poradce)
  externalUserInfo?: {  // 🆕 External user data z iframe embedu
    external_user_id?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    position?: string;
    token_eshop?: string;  // 🆕 E-shop token z Bewit webu
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

const FilterIcon: React.FC<IconProps> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
    </svg>
);

// --- CHAT SERVICE (from services/chatService.ts) ---
// Default webhook URL (fallback pro starší chatboty bez nastaveného webhook_url)
const DEFAULT_N8N_WEBHOOK_URL = 'https://n8n.srv980546.hstgr.cloud/webhook/97dc857e-352b-47b4-91cb-bc134afc764c/chat';

// Stará trigger funkce odstraněna - používáme createSimpleSummary

const sendMessageToAPI = async (
    message: string, 
    sessionId: string, 
    history: ChatMessage[], 
    metadata?: ChatMetadata, 
    webhookUrl?: string, 
    chatbotId?: string,
    intent?: 'chat' | 'funnel' | 'update_funnel',  // 🆕 Intent pro N8N routing
    detectedSymptoms?: string[],  // 🆕 Symptomy pro N8N (i když je intent chat)
    currentUser?: User,  // 🆕 Informace o přihlášeném uživateli
    externalUserInfo?: {  // 🆕 External user data z iframe embedu
        external_user_id?: string;
        first_name?: string;
        last_name?: string;
        email?: string;
        position?: string;
        token_eshop?: string;  // 🆕 E-shop token z Bewit webu
        [key: string]: any;
    },
    summarizedHistory?: string[],  // 🆕 Sumarizovaná historie (místo plné historie)
    allowedProductCategories?: string[],  // 🆕 Povolené produktové kategorie pro filtrování
    pairedProductNames?: string[]  // 🆕 Názvy produktů z SQL párování
): Promise<{ text: string; sources: Source[]; productRecommendations?: ProductRecommendation[]; matchedProducts?: any[] }> => {
    try {
        // Použij webhook URL z nastavení chatbota (pokud je nastavený), jinak fallback na default
        const N8N_WEBHOOK_URL = webhookUrl || DEFAULT_N8N_WEBHOOK_URL;
        
        const payload: any = {
            sessionId: sessionId,
            action: "sendMessage",
            chatInput: message,
            chatHistory: history,  // 🔥 Historie už je připravená (buď sumarizace nebo normální zprávy)
            intent: intent || 'chat',
        };
        
        // 🆕 Pokud byly detekovány symptomy, přidáme je do payloadu (i pro chat intent)
        if (detectedSymptoms && detectedSymptoms.length > 0) {
            payload.detectedSymptoms = detectedSymptoms;
        }

        // Přidej metadata pouze pokud obsahují zaškrtnuté filtry
        if (metadata && Object.keys(metadata).length > 0) {
            payload.metadata = metadata;
        }

        // 🆕 VŽDY přidej pole user (prázdné nebo plné) - stejná struktura jako Wany.chat
        // Priorita: localStorage (BEWIT_USER_DATA) > externalUserInfo (z iframe embedu) > currentUser (přihlášený) > prázdné
        
        // 💾 NOVÉ: Načti data z localStorage (fallback pro situace, kdy postMessage nefungoval)
        let localStorageUser = null;
        try {
            const stored = localStorage.getItem('BEWIT_USER_DATA');
            if (stored) {
                localStorageUser = JSON.parse(stored);
                console.log('💾 User data načtena z localStorage:', localStorageUser);
            }
        } catch (e) {
            console.warn('⚠️ Nepodařilo se načíst user data z localStorage:', e);
        }
        
        // 🔍 DIAGNOSTIKA USER DATA
        console.log('🔍 USER DATA DIAGNOSTIKA:');
        console.log('  - localStorageUser:', localStorageUser);
        console.log('  - externalUserInfo:', externalUserInfo);
        console.log('  - currentUser:', currentUser);
        console.log('  - localStorageUser existuje?', !!localStorageUser);
        console.log('  - externalUserInfo existuje?', !!externalUserInfo);
        console.log('  - currentUser existuje?', !!currentUser);
        
        // ✅ PRIORITA: localStorage > externalUserInfo > currentUser > prázdné
        payload.user = localStorageUser ? {
            id: String(localStorageUser.id || ""),
            email: localStorageUser.email || "",
            firstName: localStorageUser.firstName || "",
            lastName: localStorageUser.lastName || "",
            role: localStorageUser.position || "",  // position se mapuje na role
            tokenEshop: localStorageUser.tokenEshop || ""  // 🆕 E-shop token
        } : externalUserInfo ? {
            id: externalUserInfo.external_user_id || "",
            email: externalUserInfo.email || "",
            firstName: externalUserInfo.first_name || "",
            lastName: externalUserInfo.last_name || "",
            role: externalUserInfo.position || "",  // position se mapuje na role
            tokenEshop: externalUserInfo.token_eshop || ""  // 🆕 E-shop token
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
        
        console.log('  - payload.user po sestavení:', payload.user);

        // Detailní logování před odesláním
        console.log('🚀 Odesílám požadavek na N8N webhook...');
        console.log('🔗 Webhook URL:', N8N_WEBHOOK_URL);
        console.log('📤 Payload size:', JSON.stringify(payload).length, 'bytes');
        console.log('📤 Session ID:', sessionId);
        console.log('📤 Message length:', message.length);
        console.log('📤 History length:', history.length);
        console.log('📤 Metadata:', metadata);
        console.log('🎯 Intent:', intent || 'chat');
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
        let botText = responsePayload?.output ||  // 🆕 Pro Sana 2 markdown (priorita)
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
        
        console.log('🔍 Původní odpověď z N8N:', botText.substring(0, 500) + '...');
        
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
        
        // 🆕 Pro markdown (Sana 2): Odstraň sekci "Zdroje:" pokud jsou sources v samostatném poli
        if (responsePayload?.sources && responsePayload.sources.length > 0 && finalBotText.includes('### Zdroje:')) {
            // Odstraň vše od "### Zdroje:" až do konce
            finalBotText = finalBotText.replace(/###\s*Zdroje:[\s\S]*$/i, '').trim();
        }
        
        console.log('🔧 Zpracovaný text:', finalBotText.substring(0, 500) + '...');
        
        // Log pro debug obrázků
        if (finalBotText.includes('<img')) {
            console.log('🖼️ Detekován HTML s obrázky v odpovědi - počet:', (finalBotText.match(/<img[^>]*>/gi) || []).length);
        }

        // 🆕 PRODUCT NAME MATCHING - Screening produktů a matching proti databázi
        let matchedProducts: any[] = [];
        
        try {
            // 1. Screening - extrakce názvů produktů z textu pomocí GPT
            const screeningResult = await screenTextForProducts(finalBotText);
            
            // 2. Spojení názvů z textu + názvů z SQL párování
            const allProductNames = [
                ...(screeningResult.success ? screeningResult.products : []),
                ...(pairedProductNames || [])
            ];
            
            console.log('📝 Všechny názvy produktů (text + párování):', {
                fromText: screeningResult.products?.length || 0,
                fromPairing: pairedProductNames?.length || 0,
                total: allProductNames.length,
                names: allProductNames
            });
            
            if (allProductNames.length > 0) {
                
                // 3. Matching - vyhledání VŠECH produktů v databázi (včetně párovaných!)
                // 🆕 PŘEDÁVÁME POVOLENÉ KATEGORIE pro filtrování PŘED matchingem
                const matchingResult = await matchProductNames(allProductNames, allowedProductCategories);
                
                console.log('🔍 Fuzzy matching výsledky:', {
                    inputNames: allProductNames,
                    foundCount: matchingResult.matches?.length || 0,
                    matches: matchingResult.matches?.map(m => ({
                        name: m.product_name,
                        code: m.product_code,
                        category: m.category,
                        matched_from: m.matched_from
                    })),
                    unmatched: matchingResult.unmatched
                });
                
                if (matchingResult.success && matchingResult.matches.length > 0) {
                    
                    // Produkty jsou už vyfiltrované podle kategorií v matchProductNames
                    matchedProducts = matchingResult.matches;
                    
                    // 🆕 PŘIDAT PRODUKTY INLINE PŘÍMO DO TEXTU
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
                                
                                // 🆕 DŮLEŽITÉ: Musíme přeskočit markdown formátování za názvem produktu
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
                                
                                // 🆕 Vytvoříme speciální marker pro produkt
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

// Tlačítko "Chci o produktech vědět víc" - pošle produkty do EO Směsi chatu a zobrazí odpověď v chatu
const EoSmesiLearnMoreButton: React.FC<{
    matchedProducts: any[];
    sessionId?: string;
    onAddMessage?: (message: ChatMessage) => void;
}> = ({ matchedProducts, sessionId, onAddMessage }) => {
    const [isLoading, setIsLoading] = React.useState(false);
    const [isDone, setIsDone] = React.useState(false);

    const handleClick = async () => {
        if (isLoading || isDone) return;
        setIsLoading(true);
        try {
            const productNames = matchedProducts
                .map((p: any) => p.product_name || p.productName)
                .filter(Boolean)
                .join(', ');
            const chatInput = `najdi mi informace k těmto produktům: ${productNames}. Odpověz v češtině.`;

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
                console.warn('EO Směsi webhook vrátil prázdnou odpověď');
            }
        } catch (err) {
            console.error('EO Směsi webhook error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="mt-4 pt-4 border-t border-blue-200 flex flex-wrap gap-2">
            <button
                onClick={handleClick}
                disabled={isLoading || isDone}
                className="inline-flex items-center gap-2 px-4 py-2 bg-bewit-blue text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
            >
                {isLoading ? (
                    <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span>Hledám informace...</span>
                    </>
                ) : isDone ? (
                    <>
                        <span>✓</span>
                        <span>Informace zobrazeny níže</span>
                    </>
                ) : (
                    <>
                        <span>🔍</span>
                        <span>Chci o produktech vědět víc</span>
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
    token?: string;  // 🆕 Token z externalUserInfo
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
            <span className="relative z-10">{productName}</span>
        </a>
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

const Message: React.FC<{ 
    message: ChatMessage; 
    onSilentPrompt: (prompt: string) => void; 
    onProblemSelect?: (problem: string) => void;  // 🔍 Callback pro výběr problému (EO Směsi)
    chatbotSettings?: {
        product_recommendations: boolean;
        product_button_recommendations: boolean;
        inline_product_links?: boolean;  // 🆕 Inline produktové linky
        book_database: boolean;
        use_feed_1?: boolean;
        use_feed_2?: boolean;
        webhook_url?: string;  // 🆕 N8N webhook URL pro tento chatbot
        enable_product_router?: boolean;  // 🆕 Zapnutí/vypnutí produktového routeru
        enable_manual_funnel?: boolean;   // 🆕 Zapnutí manuálního funnel spouštěče
        group_products_by_category?: boolean;  // 🆕 Grupování produktů podle kategorií
        show_sources?: boolean;  // 🆕 Zobrazování zdrojů
        enable_product_pairing?: boolean;  // 🆕 Párování kombinací produktů
    };
    sessionId?: string;
    token?: string;  // 🆕 Token z externalUserInfo
    lastUserQuery?: string;
    chatbotId?: string;  // 🆕 Pro rozlišení Sana 2 (markdown rendering)
    // 🆕 Props pro manuální funnel
    recommendedProducts?: RecommendedProduct[];  // Produkty extrahované z historie
    chatHistory?: Array<{ id: string; role: string; text: string; }>;  // Historie konverzace
    metadata?: { categories: string[]; labels: string[]; publication_types: string[]; };  // Metadata
    onAddMessage?: (message: ChatMessage) => void;  // Callback pro přidání nové zprávy (EO Směsi "vědět víc")
    onSwitchToUniversal?: () => void;  // Přepnutí na Universal chatbot (tlačítko Poradce)
}> = ({ message, onSilentPrompt, onProblemSelect, chatbotSettings, sessionId, token, lastUserQuery, chatbotId, recommendedProducts = [], chatHistory = [], metadata = { categories: [], labels: [], publication_types: [] }, onAddMessage, onSwitchToUniversal }) => {
    const isUser = message.role === 'user';
    const usesMarkdown = chatbotId === 'sana_local_format' || chatbotId === 'vany_chat' || chatbotId === 'eo_smesi' || chatbotId === 'wany_chat_local' || chatbotId === 'universal_chat';  // 🆕 Sana Local Format, Vany Chat, EO-Smesi, Wany.Chat Local a Universal Chat používají markdown
    
    // 🆕 State pro obohacené produkty (obsahují category pro seskupení v ProductPills)
    const [enrichedProducts, setEnrichedProducts] = useState<RecommendedProduct[]>([]);
    const [productsLoading, setProductsLoading] = useState(false);
    
    // 🆕 State pro Aloe/Merkaba doporučení z párování
    const [pairingRecommendations, setPairingRecommendations] = useState<{
        aloe: boolean;
        merkaba: boolean;
    }>({ aloe: false, merkaba: false });
    
    // 🆕 Prioritní kategorie pro řazení produktů BEWIT
    const PRIORITY_CATEGORIES = [
        'Směsi esenciálních olejů',
        'PRAWTEIN® – superpotravinové směsi',
        'TČM - Tradiční čínská medicína'
    ];
    
    // 🆕 Funkce pro získání priority kategorie
    const getCategoryPriority = (category: string | undefined): number => {
        if (!category) return 999;
        
        const index = PRIORITY_CATEGORIES.findIndex(priorityCategory => {
            const categoryLower = category.toLowerCase();
            const priorityLower = priorityCategory.toLowerCase();
            
            return categoryLower.includes(priorityLower) || priorityLower.includes(categoryLower);
        });
        
        return index === -1 ? 999 : index;
    };
    
    // 🆕 Funkce pro řazení produktů podle prioritních kategorií
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
    
    // 🆕 State pro inline produktové linky
    
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
    
    // 🆕 useEffect pro načtení obohacených produktů z databáze
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
            
            console.log('🔄 Načítám obohacená data produktů z databáze...', products.length);
            setProductsLoading(true);
            
            try {
                // ✅ JEDNODUCHÉ ŘEŠENÍ: Použij enrichFunnelProductsFromDatabase pro VŠECHNY produkty
                // Tato funkce už umí pracovat s produkty z Product Extractor i z párování
                const enriched = await enrichFunnelProductsFromDatabase(products);
                
                console.log('✅ Obohaceno produktů:', enriched.length);
                
                // 🆕 Seřadíme produkty podle prioritních kategorií
                const sortedProducts = sortProductsByPriorityCategories(enriched);
                
                setEnrichedProducts(sortedProducts);
            } catch (error) {
                console.error('❌ Chyba při obohacování produktů:', error);
                setEnrichedProducts(products); // Fallback na základní data
            } finally {
                setProductsLoading(false);
            }
        };
        
        loadEnrichedProducts();
    }, [message.matchedProducts, message.role, chatbotSettings?.inline_product_links, chatbotSettings?.enable_product_pairing]);
    
    // 🆕 Funkce pro extrakci všech product markerů z textu (pro horní sekci)
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
    
    // 🆕 Funkce pro rendering textu s inline produktovými linky + horní sekce
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
                
                // 🆕 Pokud máme produkty a ještě jsme je nevložili, zkontroluj, jestli jsme za prvním odstavcem
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
                    
                    // 🆕 VLOŽENÍ SEKCE "Související produkty BEWIT"

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
                        
                        // 🆕 Seřadíme kategorie podle priority
                        const categories = Object.keys(byCategory).sort((catA, catB) => {
                            const priorityA = getCategoryPriority(catA);
                            const priorityB = getCategoryPriority(catB);
                            return priorityA - priorityB;
                        });
                        
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
                                <div className="flex flex-col gap-4">
                                    {categories.map((cat) => (
                                        <div key={cat}>
                                            <p className="text-xs font-medium text-gray-600 mb-2">{cat}</p>
                                            <div className="flex flex-col gap-2">
                                                {byCategory[cat].map((product, index) => (
                                                    <ProductPill
                                                        key={`${cat}-${index}`}
                                                        productName={product.product_name}
                                                        pinyinName={product.description || product.product_name}
                                                        url={product.url || ''}
                                                        token={token}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                {/* 🆕 Aloe/Merkaba indikátory (pokud je zapnuté párování) */}
                                {chatbotSettings?.enable_product_pairing && (pairingRecommendations.aloe || pairingRecommendations.merkaba) && (
                                    <div className="mt-4 pt-4 border-t border-blue-200">
                                        <p className="text-xs font-medium text-gray-600 mb-2">Doplňkové doporučení:</p>
                                        <div className="flex flex-wrap gap-2">
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
                                        <div className="flex flex-wrap gap-2">
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
    
    const sanitizedHtml = processMessageText(message.text || '');
    
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
                    ) : /* 🆕 SANA 2: ReactMarkdown rendering pro markdown formát */
                    usesMarkdown && !isUser ? (
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
                    ) : (
                        /* Standardní HTML rendering pro ostatní chatboty */
                        <div className="prose prose-sm max-w-none text-inherit prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-h4:text-base prose-h5:text-sm prose-h6:text-xs prose-p:my-2 prose-strong:font-bold prose-a:text-bewit-blue hover:prose-a:underline prose-img:block prose-img:max-w-full prose-img:h-auto prose-img:rounded-lg prose-img:mt-3 prose-img:mb-2 prose-img:shadow-md prose-img:object-cover" dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
                    )}
                    
                    {/* 🔍 EO SMĚSI: Formulář pro výběr problému (mezikrok) */}
                    {!isUser && message.requiresProblemSelection && message.uncertainProblems && message.uncertainProblems.length > 0 && onProblemSelect && (
                        <ProblemSelectionForm
                            problems={message.uncertainProblems}
                            onSelect={onProblemSelect}
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
                        <div className="mt-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 shadow-sm">
                            <h4 className="text-sm font-semibold text-bewit-blue mb-3 flex items-center gap-2">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                                            <p className="text-xs font-medium text-gray-600 mb-2">{cat}</p>
                                            <div className="flex flex-col gap-2">
                                                {byCategory[cat].map((product, index) => (
                                                    <ProductPill
                                                        key={`${cat}-${index}`}
                                                        productName={product.product_name}
                                                        pinyinName={product.description || product.product_name}
                                                        url={product.url || ''}
                                                        token={token}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ));
                                })()}
                            </div>
                            
                            {/* Aloe/Merkaba textové odkazy */}
                            {chatbotSettings?.enable_product_pairing && message.pairingInfo && (message.pairingInfo.aloe || message.pairingInfo.merkaba) && (
                                <div className="mt-4 pt-4 border-t border-blue-200">
                                    <p className="text-xs font-medium text-gray-600 mb-2">Doplňkové doporučení:</p>
                                    <div className="flex flex-wrap gap-3 text-sm">
                                        {message.pairingInfo.aloe && message.pairingInfo.aloeUrl && (
                                            <a 
                                                href={message.pairingInfo.aloeUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                                            >
                                                <span className="text-green-600">✅</span>
                                                <span>Aloe Vera gel</span>
                                            </a>
                                        )}
                                        {message.pairingInfo.merkaba && message.pairingInfo.merkabaUrl && (
                                            <a 
                                                href={message.pairingInfo.merkabaUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 text-purple-600 hover:text-purple-800 hover:underline transition-colors"
                                            >
                                                <span className="text-green-600">✅</span>
                                                <span>Merkaba</span>
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Tlačítko "Chci o produktech vědět víc" - pouze pro EO Směsi chat a pouze pokud nejde o odpověď n8n */}
                            {chatbotId === 'eo_smesi' && !message.hideProductCallout && (
                                <EoSmesiLearnMoreButton
                                    matchedProducts={enrichedProducts}
                                    sessionId={sessionId}
                                    onAddMessage={onAddMessage}
                                />
                            )}
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
                                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                                    <span className="text-base">💧</span>
                                                    <span>Aloe doporučeno</span>
                                                </div>
                                            )}
                                            {message.pairingInfo.merkaba && (
                                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                                                    <span className="text-base">✨</span>
                                                    <span>Merkaba doporučeno</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Tlačítko "Chci o produktech vědět víc" - vždy zobrazeno pod calloutem */}
                                <EoSmesiLearnMoreButton
                                    matchedProducts={message.matchedProducts || []}
                                    sessionId={sessionId}
                                    onAddMessage={onAddMessage}
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
    onProblemSelect?: (problem: string) => void;  // 🔍 Callback pro výběr problému
    shouldAutoScroll?: boolean;
    chatbotSettings?: {
        product_recommendations: boolean;
        product_button_recommendations: boolean;
        inline_product_links?: boolean;  // 🆕 Inline produktové linky
        book_database: boolean;
        use_feed_1?: boolean;
        use_feed_2?: boolean;
        webhook_url?: string;  // 🆕 N8N webhook URL pro tento chatbot
        enable_product_router?: boolean;  // 🆕 Zapnutí/vypnutí produktového routeru
        enable_manual_funnel?: boolean;   // 🆕 Zapnutí manuálního funnel spouštěče
        show_sources?: boolean;  // 🆕 Zobrazování zdrojů
        group_products_by_category?: boolean;  // 🆕 Grupování produktů podle kategorií
        enable_product_pairing?: boolean;  // 🆕 Párování kombinací produktů
    };
    sessionId?: string;
    token?: string;  // 🆕 Token z externalUserInfo
    chatbotId?: string;  // 🆕 Pro Sana 2 markdown rendering
    selectedCategories?: string[];  // 🆕 Pro manuální funnel metadata
    selectedLabels?: string[];      // 🆕 Pro manuální funnel metadata
    selectedPublicationTypes?: string[];  // 🆕 Pro manuální funnel metadata
    onAddMessage?: (message: ChatMessage) => void;  // Callback pro přidání zprávy z EO Směsi "vědět víc"
    onSwitchToUniversal?: () => void;  // Přepnutí na Universal chatbot (tlačítko Poradce)
}> = ({ messages, isLoading, onSilentPrompt, onProblemSelect, shouldAutoScroll = true, chatbotSettings, sessionId, token, chatbotId, selectedCategories = [], selectedLabels = [], selectedPublicationTypes = [], onAddMessage, onSwitchToUniversal }) => {
    const chatEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const [lastMessageCount, setLastMessageCount] = useState(0);
    const [showScrollButton, setShowScrollButton] = useState(false);
    
    useEffect(() => {
        // ❌ AUTOMATICKÝ SCROLL ZAKÁZÁN - uživatel scrolluje pouze manuálně
        // Pouze sledujeme změny zpráv pro potenciální zobrazení indikátoru
        const newMessageAdded = messages.length > lastMessageCount;
        
        if (newMessageAdded) {
            console.log('📩 Nová zpráva přidána (bez auto-scroll):', { 
                messageCount: messages.length,
                lastCount: lastMessageCount 
            });
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
                    
                    // 🆕 Pro ManualFunnelButton - extrahujeme produkty z celé historie
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
                            // 🆕 Props pro ManualFunnelButton
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
        inline_product_links?: boolean;  // 🆕 Inline produktové linky
        book_database: boolean;
        use_feed_1?: boolean;
        use_feed_2?: boolean;
        webhook_url?: string;  // 🆕 N8N webhook URL pro tento chatbot
        group_products_by_category?: boolean;  // 🆕 Grupování produktů podle kategorií
        enable_product_pairing?: boolean;  // 🆕 Párování kombinací produktů
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
    currentUser,  // 🆕 Přihlášený uživatel
    selectedCategories, 
    selectedLabels, 
    selectedPublicationTypes,
    chatbotSettings = { 
        product_recommendations: false, 
        product_button_recommendations: false, 
        inline_product_links: false,  // 🆕 Inline produktové linky
        book_database: true,
        use_feed_1: true,
        use_feed_2: true,
        enable_product_router: true,   // 🆕 Defaultně zapnutý
        enable_manual_funnel: false,    // 🆕 Defaultně vypnutý
        summarize_history: false,       // 🆕 Defaultně vypnutá sumarizace
        allowed_product_categories: []  // 🆕 Defaultně všechny kategorie povoleny
    },
    chatbotId,  // 🆕 Pro Sana 2 markdown rendering
    onClose,
    onSwitchToUniversal,
    externalUserInfo  // 🆕 External user data z iframe embedu
}) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [sessionId, setSessionId] = useState<string>('');
    const [selectedLanguage, setSelectedLanguage] = useState<string>('cs');
    const [autoScroll, setAutoScroll] = useState<boolean>(true);
    
    // 🔗 Token z externalUserInfo pro prokliknutí produktů
    const userToken = externalUserInfo?.token_eshop;
    
    // 🆕 State pro sumarizovanou historii (pro N8N webhook)
    const [summarizedHistory, setSummarizedHistory] = useState<string[]>([]);
    // 🔥 useRef pro okamžitý přístup k sumarizacím (React state je asynchronní!)
    const summarizedHistoryRef = useRef<string[]>([]);

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

    // 🔍 Callback pro výběr problému z formuláře (EO Směsi Chat)
    const handleProblemSelection = useCallback(async (selectedProblem: string) => {
        setIsLoading(true);
        
        try {
            const eoSmesiResult = await processEoSmesiQueryWithKnownProblem(selectedProblem);
            
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
                    text: `Našel jsem vhodnou kombinaci produktů pro: ${selectedProblem}`,
                    matchedProducts: matchedProducts,
                    pairingInfo: {
                        prawteins: eoSmesiResult.medicineTable.prawtein ? [eoSmesiResult.medicineTable.prawtein] : [],
                        tcmWans: [],
                        aloe: eoSmesiResult.medicineTable.aloe,
                        merkaba: eoSmesiResult.medicineTable.merkaba,
                        aloeUrl: eoSmesiResult.medicineTable.aloeUrl || undefined,
                        merkabaUrl: eoSmesiResult.medicineTable.merkabaUrl || undefined
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
            console.error('Chyba při zpracování výběru problému:', error);
            
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
        console.log('🚀 [PRVNÍ handleSendMessage] ZAVOLÁNA, text:', text.substring(0, 50));
        
        if (!text.trim() || !sessionId) return;

        // 🚫 KONTROLA DENNÍHO LIMITU ZPRÁV
        console.log('🔍 Kontroluji limity pro chatbot:', chatbotId);
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
                    console.log('🚫 Globální limit překročen:', { 
                        current: globalLimit.current_count, 
                        limit: globalLimit.daily_limit 
                    });
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
                    console.log('🚫 Individuální limit překročen:', { 
                        chatbot: chatbotId,
                        current: chatbotLimit.current_count, 
                        limit: chatbotLimit.daily_limit 
                    });
                    const errorMessage: ChatMessage = {
                        id: Date.now().toString(),
                        role: 'bot',
                        text: 'Omlouváme se, ale denní počet zpráv je již vyčerpán. Nový limit bude dnes od 0:00.'
                    };
                    setMessages(prev => [...prev, errorMessage]);
                    setIsLoading(false);
                    return;
                }
                
                console.log('✅ Limity OK, zpráva může projít:', {
                    global: globalLimit ? `${globalLimit.current_count}/${globalLimit.daily_limit ?? '∞'}` : 'neexistuje',
                    chatbot: chatbotLimit ? `${chatbotLimit.current_count}/${chatbotLimit.daily_limit ?? '∞'}` : 'neexistuje'
                });
            }
        } catch (limitError) {
            console.error('⚠️ Chyba při kontrole limitu zpráv:', limitError);
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
            console.log('🎯 Chatbot settings v SanaChatContent:', {
                book_database: chatbotSettings.book_database,
                product_recommendations: chatbotSettings.product_recommendations,
                willUseCombinedSearch: chatbotSettings.book_database && chatbotSettings.product_recommendations,
                webhook_url: chatbotSettings.webhook_url,
                summarize_history: chatbotSettings.summarize_history,
                enable_product_pairing: chatbotSettings.enable_product_pairing  // 🆕 DEBUG párování
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
            
            // ═══════════════════════════════════════════════════════════════
            // 🌿 EO SMĚSI CHAT WORKFLOW - ZPRACOVÁNÍ VIA eoSmesiWorkflowService
            // ═══════════════════════════════════════════════════════════════
            // Pokud v historii je již EO Směsi "Chci vědět víc" odpověď,
            // přeskočíme EO Směsi flow a chatujeme přímo přes webhook (bez nového calloutu)
            const hasEoSmesiLearnMoreResponse = messages.some(m => m.hideProductCallout === true);
            if (chatbotId === 'eo_smesi' && !hasEoSmesiLearnMoreResponse) {
                try {
                    const eoSmesiResult = await processEoSmesiQuery(text.trim(), sessionId);
                    
                    // 🔍 SITUACE A: Agent si NENÍ jistý → dotazník nebo přímé zpracování
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
                                    text: `Našel jsem vhodnou kombinaci produktů pro: ${uncertainProblems[0]}`,
                                    matchedProducts,
                                    pairingInfo: {
                                        prawteins: directResult.medicineTable.prawtein ? [directResult.medicineTable.prawtein] : [],
                                        tcmWans: [],
                                        aloe: directResult.medicineTable.aloe,
                                        merkaba: directResult.medicineTable.merkaba,
                                        aloeUrl: directResult.medicineTable.aloeUrl || undefined,
                                        merkabaUrl: directResult.medicineTable.merkabaUrl || undefined
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
                            product_code: p.code,  // ✅ snake_case pro enrichFunnelProductsFromDatabase
                            category: p.category
                        }));
                        
                        const botMessage: ChatMessage = {
                            id: Date.now().toString(),
                            role: 'bot',
                            text: `Našel jsem vhodnou kombinaci produktů pro váš problém.`,
                            matchedProducts: matchedProducts,
                            pairingInfo: {
                                prawteins: eoSmesiResult.medicineTable.prawtein ? [eoSmesiResult.medicineTable.prawtein] : [],
                                tcmWans: [],
                                aloe: eoSmesiResult.medicineTable.aloe,
                                merkaba: eoSmesiResult.medicineTable.merkaba,
                                aloeUrl: eoSmesiResult.medicineTable.aloeUrl || undefined,
                                merkabaUrl: eoSmesiResult.medicineTable.merkabaUrl || undefined
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
                    console.error('❌ EO Směsi chyba:', error);
                    
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
            console.log(`🔍 Checking Intent Routing: chatbotId = "${chatbotId}" (type: ${typeof chatbotId})`);
            console.log(`🔍 Comparison: chatbotId === 'vany_chat' → ${chatbotId === 'vany_chat'}`);
            
            // 🆕 Kontrola enable_product_router - pokud je false, přeskočíme intent routing
            const enableProductRouter = chatbotSettings?.enable_product_router !== false;
            console.log(`🔀 Product Router enabled: ${enableProductRouter ? 'ANO' : 'NE'}`);
            
            if (chatbotId === 'vany_chat' && enableProductRouter) {
                console.log('%c═══════════════════════════════════════════════════════════════════', 'color: #8B5CF6; font-weight: bold;');
                console.log('%c🔀 WANY CHAT - KONTROLA INTENT ROUTING', 'color: #8B5CF6; font-weight: bold; font-size: 14px;');
                console.log('%c═══════════════════════════════════════════════════════════════════', 'color: #8B5CF6; font-weight: bold;');
                
                // Získáme poslední zprávu bota
                const lastBotMessage = messages.filter(m => m.role === 'bot').pop();
                const lastBotText = lastBotMessage?.text || '';
                
                // 🆕 KRITICKÉ: Intent routing se aktivuje POUZE pokud je žlutý callout v historii
                // A ZÁROVEŇ není zapnutý manuální funnel (ten má vlastní logiku)
                // Kontrolujeme FLAG hasCallout místo hledání textu!
                const hasCallout = messages.some(m => m.role === 'bot' && m.hasCallout === true);
                const enableManualFunnel = chatbotSettings?.enable_manual_funnel === true;
                console.log(`🟡 Žlutý callout v historii: ${hasCallout ? 'ANO ✓' : 'NE'}`);
                console.log(`🎯 Manuální funnel: ${enableManualFunnel ? 'AKTIVNÍ (přeskakuji auto routing)' : 'NEAKTIVNÍ'}`);
                
                // Pokud je zapnutý manuální funnel, nepouštíme automatický intent routing
                // Uživatel musí použít tlačítko ManualFunnelButton
                if (!hasCallout || enableManualFunnel) {
                    // ❌ ŽÁDNÝ CALLOUT NEBO MANUÁLNÍ FUNNEL → Standardní chat, nepoužívat intent routing
                    if (enableManualFunnel && hasCallout) {
                        console.log('%c🎯 Manuální funnel aktivní → PŘESKAKUJI AUTOMATICKÝ ROUTING', 'color: #F59E0B; font-weight: bold;');
                    } else {
                        console.log('%c💬 Žádný callout → STANDARDNÍ CHAT (bez intent routingu)', 'color: #10B981; font-weight: bold;');
                    }
                    console.log('%c═══════════════════════════════════════════════════════════════════', 'color: #8B5CF6; font-weight: bold;');
                    // Pokračujeme standardním flow níže (mimo tento blok)
                } else {
                    // ✅ CALLOUT DETEKOVÁN → Spustit intent routing
                    console.log('%c🎯 Callout detekován → SPOUŠTÍM INTENT ROUTING', 'color: #F59E0B; font-weight: bold;');
                    
                    // Extrahujeme produkty z historie
                    const conversationHistory = messages.map(m => ({ 
                        role: m.role, 
                        text: m.text,
                        hasCallout: m.hasCallout // 🆕 Přidáme flag pro callout
                    }));
                    const recommendedProducts = extractProductsFromHistory(conversationHistory);
                    console.log(`📦 Produkty v historii: ${recommendedProducts.length}`);
                    
                    // Zavoláme intent routing (LLM rozhodne)
                    console.log('%c📡 Volám Intent Router (LLM model)...', 'color: #8B5CF6;');
                    const intentResult = await routeUserIntent(
                        text.trim(),
                        conversationHistory,
                        lastBotText,
                        recommendedProducts
                    );
                
                console.log(`✅ Intent Router odpověděl: ${intentResult.intent}`);
                console.log(`📝 Důvod: ${intentResult.reasoning}`);
                if (intentResult.symptomList && intentResult.symptomList.length > 0) {
                    console.log(`🩺 Extrahované symptomy: ${intentResult.symptomList.join(', ')}`);
                }
                
                // Diagnostika rozhodnutí - ZJEDNODUŠENO: pouze chat/funnel/update_funnel
                const shouldBeFunnel = intentResult.intent === 'funnel';
                const shouldUpdateFunnel = intentResult.intent === 'update_funnel';
                const hasProducts = recommendedProducts.length > 0;
                
                console.log(`%c🔍 DIAGNOSTIKA ROZHODNUTÍ:`, 'color: #FF6B6B; font-weight: bold;');
                console.log(`   Intent = ${intentResult.intent}`);
                console.log(`   Products = ${recommendedProducts.length} (hasProducts: ${hasProducts})`);
                console.log(`   Action: ${
                    shouldBeFunnel ? '🎯 FUNNEL MODE (symptomy po calloutu)' : 
                    shouldUpdateFunnel ? '🔄 UPDATE FUNNEL (změna produktů)' :
                    '💬 CHAT MODE'
                }`);
                
                // ═══════════════════════════════════════════════════════════════
                // 🔄 UPDATE FUNNEL - Uživatel chce změnit produkty v existujícím funnelu
                // ═══════════════════════════════════════════════════════════════
                // Pro update_funnel pokračujeme do N8N - ten rozhodne jak aktualizovat
                // Intent se pošle jako součást payloadu do N8N
                
                // ═══════════════════════════════════════════════════════════════
                // 🎯 FUNNEL MODE: Spustit produktový funnel přes N8N webhook
                // ═══════════════════════════════════════════════════════════════
                // 🆕 Podporujeme jak 'funnel' tak 'update_funnel'!
                if ((intentResult.intent === 'funnel' || intentResult.intent === 'update_funnel') && recommendedProducts.length > 0) {
                    // ═══════════════════════════════════════════════════════════════
                    // 🎯 PRODUCT FUNNEL MODE - PŘÍPRAVA DAT PRO N8N WEBHOOK
                    // ═══════════════════════════════════════════════════════════════
                    
                    console.log('%c╔═══════════════════════════════════════════════════════════════════╗', 'background: #10B981; color: white; font-weight: bold; font-size: 16px;');
                    console.log('%c║         🎯 SPUŠTĚNÍ PRODUKTOVÉHO FUNNELU (N8N WEBHOOK)           ║', 'background: #10B981; color: white; font-weight: bold; font-size: 16px;');
                    console.log('%c╚═══════════════════════════════════════════════════════════════════╝', 'background: #10B981; color: white; font-weight: bold; font-size: 16px;');
                    
                    // === 1. SEZNAM SYMPTOMŮ ===
                    const symptoms = intentResult.symptomList && intentResult.symptomList.length > 0 
                        ? intentResult.symptomList 
                        : [text.trim()];
                    
                    console.log('%c┌───────────────────────────────────────────────────────────────────┐', 'color: #F59E0B;');
                    console.log('%c│ 📋 SEZNAM SYMPTOMŮ/PROBLÉMŮ                                      │', 'color: #F59E0B; font-weight: bold; font-size: 14px;');
                    console.log('%c├───────────────────────────────────────────────────────────────────┤', 'color: #F59E0B;');
                    symptoms.forEach((symptom, index) => {
                        console.log(`%c│   ${index + 1}. ${symptom}`, 'color: #F59E0B;');
                    });
                    console.log('%c└───────────────────────────────────────────────────────────────────┘', 'color: #F59E0B;');
                    
                    // === 2. SEZNAM PRODUKTŮ Z PRODUCT PILLS ===
                    console.log('%c┌───────────────────────────────────────────────────────────────────┐', 'color: #8B5CF6;');
                    console.log('%c│ 📦 SEZNAM PRODUKTŮ (z Product Pills v předchozí konverzaci)      │', 'color: #8B5CF6; font-weight: bold; font-size: 14px;');
                    console.log('%c├───────────────────────────────────────────────────────────────────┤', 'color: #8B5CF6;');
                    console.log(`%c│   Celkem produktů: ${recommendedProducts.length}`, 'color: #8B5CF6;');
                    console.log('%c│', 'color: #8B5CF6;');
                    recommendedProducts.forEach((product, index) => {
                        console.log(`%c│   ${index + 1}. ${product.product_name}`, 'color: #8B5CF6; font-weight: bold;');
                        console.log(`%c│      Kód: ${product.product_code || 'N/A'}`, 'color: #8B5CF6;');
                        if (product.description) {
                            console.log(`%c│      Popis: ${product.description.substring(0, 80)}...`, 'color: #8B5CF6;');
                        }
                    });
                    console.log('%c└───────────────────────────────────────────────────────────────────┘', 'color: #8B5CF6;');
                    
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

                    console.log('%c┌───────────────────────────────────────────────────────────────────┐', 'color: #3B82F6;');
                    console.log('%c│ 🤖 SYSTEM PROMPT PRO FUNNEL                                      │', 'color: #3B82F6; font-weight: bold; font-size: 14px;');
                    console.log('%c├───────────────────────────────────────────────────────────────────┤', 'color: #3B82F6;');
                    FUNNEL_SYSTEM_PROMPT.split('\n').forEach(line => {
                        console.log(`%c│ ${line}`, 'color: #3B82F6;');
                    });
                    console.log('%c└───────────────────────────────────────────────────────────────────┘', 'color: #3B82F6;');
                    
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
                    
                    console.log('%c╔═══════════════════════════════════════════════════════════════════╗', 'background: #EF4444; color: white; font-weight: bold; font-size: 14px;');
                    console.log('%c║ 📡 ODESÍLÁM FUNNEL DO N8N WEBHOOKU                               ║', 'background: #EF4444; color: white; font-weight: bold; font-size: 14px;');
                    console.log('%c╚═══════════════════════════════════════════════════════════════════╝', 'background: #EF4444; color: white; font-weight: bold; font-size: 14px;');
                    console.log('%c🔗 Webhook URL:', 'color: #EF4444; font-weight: bold;', WANY_WEBHOOK_URL);
                    console.log('%c📝 chatInput (co jde do N8N):', 'color: #EF4444; font-weight: bold;');
                    console.log(funnelChatInputWithLang);
                    console.log('%c📦 Kompletní Payload:', 'color: #EF4444; font-weight: bold;');
                    console.log(JSON.stringify(funnelPayload, null, 2));
                    console.log('%c═══════════════════════════════════════════════════════════════════', 'color: #EF4444; font-weight: bold;');
                    
                    // === 6. VOLÁNÍ N8N WEBHOOKU ===
                    try {
                        const response = await fetch(WANY_WEBHOOK_URL, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(funnelPayload)
                        });
                        
                        console.log('%c📥 N8N FUNNEL response status:', 'color: #10B981; font-weight: bold;', response.status, response.statusText);
                        
                        if (!response.ok) {
                            throw new Error(`N8N webhook error: ${response.status} ${response.statusText}`);
                        }
                        
                        const data = await response.json();
                        console.log('%c📥 N8N FUNNEL response data:', 'color: #10B981; font-weight: bold;');
                        console.log(data);
                        
                        // Zpracování odpovědi z N8N
                        let responsePayload = Array.isArray(data) ? data[0] : data;
                        if (responsePayload?.json) responsePayload = responsePayload.json;
                        
                        const botText = responsePayload?.output || responsePayload?.html || responsePayload?.text || responsePayload?.response || 'Nepodařilo se získat odpověď.';
                        
                        // 🔄 OBOHACENÍ PRODUKTŮ Z DATABÁZE product_feed_2
                        // Toto zajistí správné obrázky, ceny a URL z databáze
                        console.log('%c🔄 Obohacuji funnel produkty z product_feed_2...', 'color: #8B5CF6; font-weight: bold;');
                        
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

                        console.log('%c📦 Funnel produkty pro UI (max 2):', 'color: #3B82F6; font-weight: bold;', funnelProductsWithDetails);
                        console.log('%c🖼️ Obrázky produktů:', 'color: #3B82F6;', funnelProductsWithDetails.map(p => ({ name: p.product_name, thumbnail: p.thumbnail })));
                        
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
                        
                        // 💾 Uložíme PAR otázka-odpověď do historie
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
                                user_info: externalUserInfo  // 🆕 External user data z iframe
                            }
                        );
                        
                        setIsLoading(false);
                        return; // ⚠️ UKONČIT - FUNNEL MODE ZPRACOVÁN
                        
                    } catch (funnelError) {
                        console.error('%c❌ FUNNEL N8N WEBHOOK ERROR:', 'color: #EF4444; font-weight: bold;', funnelError);
                        // Fallback na standardní chat mode
                        console.log('%c🔄 Fallback na standardní chat mode...', 'color: #FFA500; font-weight: bold;');
                    }
                } else {
                    // CHAT MODE po intent routingu: Pokračovat normálním webhook flow (níže)
                    console.log('%c💬 POKRAČUJI STANDARDNÍM CHAT MODE (intent byl CHAT)', 'color: #FFA500; font-weight: bold;');
                }
                }
                // Konec if (hasCallout)
                
                // STANDARDNÍ CHAT pokračuje normálním flow (níže)
            }
            
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
                
                // 🔥 SUMARIZACE: Pokud je zapnutá, vytvoříme sumarizovanou historii MÍSTO plné historie
                // Používáme REF protože React state je asynchronní!
                console.log('🔍 DEBUG PŘED PODMÍNKOU:');
                console.log('  - summarize_history:', chatbotSettings.summarize_history);
                console.log('  - summarizedHistoryRef.current.length:', summarizedHistoryRef.current.length);
                console.log('  - summarizedHistoryRef.current:', summarizedHistoryRef.current);
                
                let historyToSend;
                if (chatbotSettings.summarize_history && summarizedHistoryRef.current.length > 0) {
                    // Převedeme sumarizace do formátu ChatMessage
                    historyToSend = summarizedHistoryRef.current.map((summary, index) => ({
                        id: `summary-${index}`,
                        role: 'summary' as const,
                        text: summary
                    }));
                    console.log('═══════════════════════════════════════════════════════════');
                    console.log('📤 POSÍLÁM SUMARIZACE MÍSTO HISTORIE');
                    console.log('📊 Počet sumarizací:', summarizedHistoryRef.current.length);
                    console.log('═══════════════════════════════════════════════════════════');
                } else {
                    // Normální historie zpráv
                    historyToSend = newMessages.slice(0, -1);
                }
                
                // Standardní chat - bez intent routingu (žádný callout v historii)
                // N8N sám přidá žlutý callout pokud detekuje zdravotní symptomy
                
                // 🔗 KLASIFIKACE PROBLÉMU - Pokud je zapnuté párování, klasifikuj problém PARALELNĚ s webhookem
                let classifiedProblems: string[] = [];
                console.log('🔍 DEBUG: enable_product_pairing =', chatbotSettings.enable_product_pairing);
                if (chatbotSettings.enable_product_pairing) {
                    console.log('🔍 Spouštím klasifikaci problému z user message...');
                    try {
                        const classificationResult = await classifyProblemFromUserMessage(text.trim());
                        if (classificationResult.success) {
                            classifiedProblems = classificationResult.problems;
                            console.log(`✅ Klasifikované problémy:`, classifiedProblems);
                        }
                    } catch (classificationError) {
                        console.error('❌ Chyba při klasifikaci problému:', classificationError);
                    }
                } else {
                    console.log('⏭️ Párování produktů VYPNUTO - přeskakuji klasifikaci');
                }
                
                // 🔗 KROK 2: SQL PÁROVÁNÍ (PŘED voláním N8N webhooku!)
                // Získáme NÁZVY produktů z SQL, které se pak spojí s extrahovanými názvy
                let pairedProductNames: string[] = [];
                let pairingMetadata: any = null;
                
                if (chatbotSettings.enable_product_pairing && classifiedProblems.length > 0) {
                    console.log('🔗 Spouštím SQL párování PŘED voláním N8N...');
                    console.log('🔍 Klasifikované problémy:', classifiedProblems);
                    
                    try {
                        const pairingResult = await matchProductCombinationsWithProblems(classifiedProblems);
                        
                        if (pairingResult.products.length > 0) {
                            console.log('✅ SQL vrátilo produkty:', pairingResult.products.length);
                            
                            // Extrahuj POUZE NÁZVY produktů (ne kódy, ne URL)
                            pairedProductNames = pairingResult.products.map((p: any) => p.matched_product_name);
                            console.log('📝 Názvy napárovaných produktů:', pairedProductNames);
                            
                            // Uložíme metadata pro pozdější použití
                            pairingMetadata = {
                                aloe: pairingResult.aloe,
                                merkaba: pairingResult.merkaba,
                                productCount: pairingResult.products.length
                            };
                            
                            console.log('💧 Aloe doporučeno:', pairingResult.aloe);
                            console.log('✨ Merkaba doporučeno:', pairingResult.merkaba);
                        } else {
                            console.log('ℹ️ SQL nevrátilo žádné produkty pro problémy:', classifiedProblems);
                        }
                    } catch (pairingError) {
                        console.error('❌ Chyba při párování kombinací:', pairingError);
                    }
                }
                
                const webhookResult = await sendMessageToAPI(
                    promptForBackend, 
                    sessionId, 
                    historyToSend,  // 🔥 BUĎTO sumarizace NEBO celá historie
                    currentMetadata, 
                    chatbotSettings.webhook_url, 
                    chatbotId,
                    undefined,  // intent
                    undefined,  // detectedSymptoms
                    currentUser,  // 🆕 Přidáno: informace o uživateli
                    externalUserInfo,  // 🆕 External user data z iframe
                    undefined,  // Tenhle parametr už nepoužíváme - posíláme přímo v history
                    chatbotSettings.allowed_product_categories,  // 🆕 Povolené produktové kategorie
                    pairedProductNames  // 🆕 Názvy produktů z SQL párování
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
                
                console.log(`🟡 Callout detekce: ${webhookResult.matchedProducts?.length || 0} produktů → callout = ${shouldShowCallout ? 'ANO' : 'NE'}`);
                
                const botMessage: ChatMessage = { 
                    id: (Date.now() + 1).toString(), 
                    role: 'bot', 
                    text: webhookResult.text, 
                    sources: webhookResult.sources || [],
                    productRecommendations: undefined,
                    matchedProducts: webhookResult.matchedProducts || [],
                    hasCallout: shouldShowCallout,
                    pairingInfo: pairingInfo || undefined
                };
                
                setMessages(prev => [...prev, botMessage]);
                setShowNewChatPopup(true);
                
                // 💾 Uložíme PAR otázka-odpověď do historie
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
                
                // 🔥 OKAMŽITĚ vytvoříme sumarizaci AKTUÁLNÍ Q&A páru (na pozadí)
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
                        console.error('❌ Chyba při sumarizaci:', err);
                    });
                }
                
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
                        console.log('🔗 Spouštím párování kombinací produktů...');
                        try {
                            const productCodes = productRecommendations
                                .filter(p => p.category === 'Esenciální oleje' || p.product_code)
                                .map(p => p.product_code);
                            
                            if (productCodes.length > 0) {
                                console.log('📦 Product codes pro párování:', productCodes);
                                const combinations = await findCombinationsForEOs(productCodes);
                                if (combinations.length > 0) {
                                    pairingInfo = extractPairingProducts(combinations);
                                    console.log('✅ Párování úspěšné:', pairingInfo);
                                }
                            }
                        } catch (pairingError) {
                            console.error('❌ Chyba při párování kombinací:', pairingError);
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
            const { text: botText, sources, productRecommendations, matchedProducts } = await sendMessageToAPI(
                promptForBackend, 
                sessionId, 
                messages, 
                currentMetadata, 
                chatbotSettings.webhook_url, 
                chatbotId,
                undefined,  // intent
                undefined,  // detectedSymptoms
                currentUser,  // 🆕 Přidáno: informace o uživateli
                externalUserInfo,  // 🆕 External user data z iframe
                chatbotSettings.summarize_history ? summarizedHistory : undefined,  // 🆕 Sumarizovaná historie
                chatbotSettings.allowed_product_categories  // 🆕 Povolené produktové kategorie
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
            
            // 🔥 SUMARIZACE - pokud je zapnutá v nastavení - max 2 nejnovější
            if (chatbotSettings.summarize_history) {
                const summary = await createSimpleSummary(text.trim(), botText);
                if (summary) {
                    setSummarizedHistory(prev => {
                        const newHistory = [...prev, summary].slice(-2);
                        console.log('📊 Celkem sumarizací:', newHistory.length);
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
        setShowNewChatPopup(false);
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
                    <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
                    {onSwitchToUniversal && (
                        <div className="mt-3 flex justify-end">
                            <button
                                onClick={onSwitchToUniversal}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-all duration-200"
                            >
                                <span>🧑‍💼</span>
                                <span>Obecný poradce</span>
                            </button>
                        </div>
                    )}
                </div>
            </main>

            {/* Popup: Doporučení nového chatu - dočasně znefunkčněno */}
        </div>
    );
};

const SanaChat: React.FC<SanaChatProps> = ({ 
    currentUser,  // 🆕 Přihlášený uživatel
    selectedCategories, 
    selectedLabels, 
    selectedPublicationTypes,
    chatbotSettings = { 
        product_recommendations: false, 
        product_button_recommendations: false, 
        inline_product_links: false,  // 🆕 Inline produktové linky
        book_database: true,
        use_feed_1: true,
        use_feed_2: true,
        enable_product_router: true,   // 🆕 Defaultně zapnutý
        enable_manual_funnel: false,    // 🆕 Defaultně vypnutý
        summarize_history: false       // 🆕 Defaultně vypnutá sumarizace
    },
    chatbotId,  // 🆕 Pro Sana 2 markdown rendering
    onClose,
    onSwitchToUniversal,
    externalUserInfo  // 🆕 External user data z iframe embedu
}) => {
    // 🚨 EXTREME DIAGNOSTIKA #1 - SANACHAT WRAPPER
    console.log('%c═══════════════════════════════════════════════════════════════════', 'background: #0000FF; color: #FFFFFF; font-size: 20px; font-weight: bold;');
    console.log('%c🚨 SANACHAT WRAPPER LOADED', 'background: #0000FF; color: #FFFFFF; font-size: 16px; font-weight: bold;');
    console.log(`%c🔍 chatbotId prop: "${chatbotId}" (type: ${typeof chatbotId})`, 'background: #00FFFF; color: #000; font-size: 14px;');
    console.log('%c═══════════════════════════════════════════════════════════════════', 'background: #0000FF; color: #FFFFFF; font-size: 20px; font-weight: bold;');
    
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [sessionId, setSessionId] = useState<string>('');
    const [selectedLanguage, setSelectedLanguage] = useState<string>('cs');
    const [autoScroll, setAutoScroll] = useState<boolean>(true);
    const [isFilterPanelVisible, setIsFilterPanelVisible] = useState<boolean>(false);
    // 🆕 State pro sumarizovanou historii (pro N8N webhook)
    const [summarizedHistory, setSummarizedHistory] = useState<string[]>([]);
    // 🔥 useRef pro okamžitý přístup k sumarizacím (React state je asynchronní!)
    const summarizedHistoryRef = useRef<string[]>([]);

    // Token z externalUserInfo pro prokliknutí produktů
    const userToken = externalUserInfo?.token_eshop;

    useEffect(() => {
        setSessionId(generateSessionId());
    }, []);

    const handleSendMessage = useCallback(async (text: string) => {
        console.log('🚀 handleSendMessage ZAVOLÁNA, text:', text.substring(0, 50));
        
        if (!text.trim() || !sessionId) return;

        // 🚫 KONTROLA DENNÍHO LIMITU ZPRÁV
        console.log('🔍 Kontroluji limity pro chatbot:', chatbotId);
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
                    console.log('🚫 Globální limit překročen:', { 
                        current: globalLimit.current_count, 
                        limit: globalLimit.daily_limit 
                    });
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
                    console.log('🚫 Individuální limit překročen:', { 
                        chatbot: chatbotId,
                        current: chatbotLimit.current_count, 
                        limit: chatbotLimit.daily_limit 
                    });
                    const errorMessage: ChatMessage = {
                        id: Date.now().toString(),
                        role: 'bot',
                        text: 'Omlouváme se, ale denní počet zpráv je již vyčerpán. Nový limit bude dnes od 0:00.'
                    };
                    setMessages(prev => [...prev, errorMessage]);
                    return;
                }
                
                console.log('✅ Limity OK, zpráva může projít:', {
                    global: globalLimit ? `${globalLimit.current_count}/${globalLimit.daily_limit ?? '∞'}` : 'neexistuje',
                    chatbot: chatbotLimit ? `${chatbotLimit.current_count}/${chatbotLimit.daily_limit ?? '∞'}` : 'neexistuje'
                });
            }
        } catch (limitError) {
            console.error('⚠️ Chyba při kontrole limitu zpráv:', limitError);
            // Pokračuj i při chybě (fail-open) - lepší je poslat zprávu než blokovat kvůli chybě
        }

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
                willUseCombinedSearch: chatbotSettings.book_database && chatbotSettings.product_recommendations,
                webhook_url: chatbotSettings.webhook_url,
                chatbotId: chatbotId
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
                
                // 🔗 KROK 1: KLASIFIKACE PROBLÉMU
                let classifiedProblems: string[] = [];
                console.log('🔍 DEBUG: enable_product_pairing =', chatbotSettings.enable_product_pairing);
                if (chatbotSettings.enable_product_pairing) {
                    console.log('🔍 [VĚTEV 2] Spouštím klasifikaci problému z user message...');
                    
                    try {
                        const problemResult = await classifyProblemFromUserMessage(text.trim());
                        if (problemResult.success && problemResult.problems.length > 0) {
                            classifiedProblems = problemResult.problems;
                            console.log('✅ [VĚTEV 2] Klasifikované problémy:', classifiedProblems);
                        } else {
                            console.log('ℹ️ [VĚTEV 2] Žádné problémy nenalezeny');
                        }
                    } catch (classificationError) {
                        console.error('❌ [VĚTEV 2] Chyba při klasifikaci problému:', classificationError);
                    }
                } else {
                    console.log('⏭️ [VĚTEV 2] Párování produktů VYPNUTO');
                }
                
                // 🔥 SUMARIZACE: Pokud je zapnutá, vytvoříme sumarizovanou historii MÍSTO plné historie
                // Používáme REF protože React state je asynchronní!
                let historyToSend;
                if (settings.summarize_history && summarizedHistoryRef.current.length > 0) {
                    historyToSend = summarizedHistoryRef.current.map((summary, index) => ({
                        id: `summary-${index}`,
                        role: 'summary' as const,
                        text: summary
                    }));
                    console.log('═══════════════════════════════════════════════════════════');
                    console.log('📤 POSÍLÁM SUMARIZACE MÍSTO HISTORIE');
                    console.log('📊 Počet sumarizací:', summarizedHistoryRef.current.length);
                    console.log('═══════════════════════════════════════════════════════════');
                } else {
                    historyToSend = newMessages.slice(0, -1);
                }
                
                // 🔗 KROK 2: SQL PÁROVÁNÍ (PŘED voláním N8N webhooku!)
                // Získáme NÁZVY produktů z SQL, které se pak spojí s extrahovanými názvy
                let pairedProductNames: string[] = [];
                let pairingMetadata: any = null;
                
                if (chatbotSettings.enable_product_pairing && classifiedProblems.length > 0) {
                    console.log('🔗 [VĚTEV 2] Spouštím SQL párování PŘED voláním N8N...');
                    console.log('🔍 Klasifikované problémy:', classifiedProblems);
                    
                    try {
                        const pairingResult = await matchProductCombinationsWithProblems(classifiedProblems);
                        
                        if (pairingResult.products.length > 0) {
                            console.log('✅ SQL vrátilo produkty:', pairingResult.products.length);
                            
                            // Extrahuj POUZE NÁZVY produktů
                            pairedProductNames = pairingResult.products.map((p: any) => p.matched_product_name);
                            console.log('📝 Názvy napárovaných produktů:', pairedProductNames);
                            
                            pairingMetadata = {
                                aloe: pairingResult.aloe,
                                merkaba: pairingResult.merkaba,
                                productCount: pairingResult.products.length
                            };
                            
                            console.log('💧 Aloe doporučeno:', pairingResult.aloe);
                            console.log('✨ Merkaba doporučeno:', pairingResult.merkaba);
                        }
                    } catch (pairingError) {
                        console.error('❌ Chyba při párování kombinací:', pairingError);
                    }
                }
                
                const webhookResult = await sendMessageToAPI(
                    promptForBackend, 
                    sessionId, 
                    historyToSend,  // 🔥 BUĎTO sumarizace NEBO celá historie
                    currentMetadata, 
                    chatbotSettings.webhook_url, 
                    chatbotId,
                    undefined,  // intent
                    undefined,  // detectedSymptoms
                    currentUser,  // 🆕 Přidáno: informace o uživateli
                    externalUserInfo,  // 🆕 External user data z iframe
                    undefined,  // Tenhle parametr už nepoužíváme
                    chatbotSettings.allowed_product_categories,  // 🆕 Povolené produktové kategorie
                    pairedProductNames  // 🆕 Názvy produktů z SQL párování
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
                
                console.log(`🟡 Callout detekce: ${webhookResult.matchedProducts?.length || 0} produktů → callout = ${shouldShowCallout ? 'ANO' : 'NE'}`);
                
                const botMessage: ChatMessage = { 
                    id: (Date.now() + 1).toString(), 
                    role: 'bot', 
                    text: webhookResult.text, 
                    sources: webhookResult.sources || [],
                    productRecommendations: undefined,
                    matchedProducts: webhookResult.matchedProducts || [],
                    hasCallout: shouldShowCallout,
                    pairingInfo: pairingInfo || undefined
                };
                
                setMessages(prev => [...prev, botMessage]);
                
                // 🔥 OKAMŽITĚ vytvoříme sumarizaci AKTUÁLNÍ Q&A páru (na pozadí) - max 2 nejnovější
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
                        console.error('❌ Chyba při sumarizaci:', err);
                    });
                }
                
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
                        console.log('🔗 Spouštím párování kombinací produktů...');
                        try {
                            const productCodes = productRecommendations
                                .filter(p => p.category === 'Esenciální oleje' || p.product_code)
                                .map(p => p.product_code);
                            
                            if (productCodes.length > 0) {
                                console.log('📦 Product codes pro párování:', productCodes);
                                const combinations = await findCombinationsForEOs(productCodes);
                                if (combinations.length > 0) {
                                    pairingInfo = extractPairingProducts(combinations);
                                    console.log('✅ Párování úspěšné:', pairingInfo);
                                }
                            }
                        } catch (pairingError) {
                            console.error('❌ Chyba při párování kombinací:', pairingError);
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
            const { text: botText, sources, productRecommendations, matchedProducts } = await sendMessageToAPI(
                promptForBackend, 
                sessionId, 
                messages, 
                currentMetadata, 
                chatbotSettings.webhook_url, 
                chatbotId,
                undefined,  // intent
                undefined,  // detectedSymptoms
                currentUser,  // 🆕 Přidáno: informace o uživateli
                externalUserInfo,  // 🆕 External user data z iframe
                chatbotSettings.summarize_history ? summarizedHistory : undefined,  // 🆕 Sumarizovaná historie
                chatbotSettings.allowed_product_categories  // 🆕 Povolené produktové kategorie
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
            
            // 🔥 SUMARIZACE - pokud je zapnutá v nastavení - max 2 nejnovější
            if (settings.summarize_history) {
                const summary = await createSimpleSummary(text.trim(), botText);
                if (summary) {
                    setSummarizedHistory(prev => {
                        const newHistory = [...prev, summary].slice(-2);
                        console.log('📊 Celkem sumarizací:', newHistory.length);
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
        setSummarizedHistory([]);  // 🆕 Vyčistíme i sumarizace
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
                            <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
                            {onSwitchToUniversal && (
                                <div className="mt-3 flex justify-end">
                                    <button
                                        onClick={onSwitchToUniversal}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-all duration-200"
                                    >
                                        <span>🧑‍💼</span>
                                        <span>Obecný poradce</span>
                                    </button>
                                </div>
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
    currentUser?: User;  // 🆕 Přihlášený uživatel
    chatbotSettings?: {
        product_recommendations: boolean;
        product_button_recommendations: boolean;
        inline_product_links?: boolean;  // 🆕 Inline produktové linky
        book_database: boolean;
        use_feed_1?: boolean;
        use_feed_2?: boolean;
        webhook_url?: string;  // 🆕 N8N webhook URL pro tento chatbot
        allowed_categories?: string[];  // 🆕 Povolené kategorie (UUID)
        allowed_labels?: string[];  // 🆕 Povolené štítky (UUID)
        allowed_publication_types?: string[];  // 🆕 Povolené typy publikací (UUID)
        enable_product_router?: boolean;  // 🆕 Produktový router
        enable_manual_funnel?: boolean;   // 🆕 Manuální funnel
        summarize_history?: boolean;  // 🆕 Sumarizace historie
        allowed_product_categories?: string[];  // 🆕 Povolené produktové kategorie
        group_products_by_category?: boolean;  // 🆕 Grupování produktů
        show_sources?: boolean;  // 🆕 Zobrazování zdrojů
        enable_product_pairing?: boolean;  // 🆕 Párování kombinací produktů
    };
    chatbotId?: string;  // 🆕 Pro Sana 2 markdown rendering
    onClose?: () => void;
    externalUserInfo?: {  // 🆕 External user data z iframe embedu
        external_user_id?: string;
        first_name?: string;
        last_name?: string;
        email?: string;
        position?: string;
        token_eshop?: string;  // 🆕 E-shop token z Bewit webu
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

const FilteredSanaChat: React.FC<FilteredSanaChatProps> = ({ 
    currentUser,  // 🆕 Přihlášený uživatel
    chatbotSettings = { 
        product_recommendations: false, 
        product_button_recommendations: false, 
        inline_product_links: false,
        book_database: true,
        use_feed_1: true,
        use_feed_2: true,
        enable_product_router: true,   // 🆕 Defaultně zapnutý
        enable_manual_funnel: false,   // 🆕 Defaultně vypnutý
        summarize_history: false,      // 🆕 Defaultně vypnutá sumarizace
        show_sources: true             // 🆕 Defaultně zapnuté zobrazování zdrojů
    },
    chatbotId,  // 🆕 Pro Sana 2 markdown rendering
    onClose,
    externalUserInfo  // 🆕 External user data z iframe embedu
}) => {
    // 🔥 DEBUG: Log přijatých props při každém renderu
    console.log('🔍 FilteredSanaChat PROPS:', {
        chatbotId,
        chatbotSettings,
        enable_product_router: chatbotSettings?.enable_product_router,
        enable_manual_funnel: chatbotSettings?.enable_manual_funnel,
        summarize_history: chatbotSettings?.summarize_history,
        show_sources: chatbotSettings?.show_sources
    });
    
    // Uložíme nastavení do state pro správný scope v useCallback
    const [settings, setSettings] = useState(chatbotSettings);
    // chatKey slouží pro force remount SanaChatContent (nový chat)
    const [chatKey, setChatKey] = useState(0);
    // activeChatbotId umožňuje přepnutí chatbota (např. na Universal)
    const [activeChatbotId, setActiveChatbotId] = useState(chatbotId);
    // Flag: true = uživatel přepnul na Universal, ignoruj přepsání z parenta
    const isSwitchedToUniversal = useRef(false);

    // Přepnutí na Universal chatbot - nový chat s Universal nastavením
    const handleSwitchToUniversal = useCallback(() => {
        isSwitchedToUniversal.current = true;
        setSettings(UNIVERSAL_CHATBOT_SETTINGS);
        setActiveChatbotId('universal_chat');
        setChatKey(k => k + 1);
    }, []);
    
    // 🔥 KRITICKÉ: Aktualizujeme settings když se chatbotSettings změní
    // Tento useEffect zajišťuje, že změny z databáze se VŽDY promítnou do chatu
    // ALE ignorujeme přepsání pokud uživatel přepnul na Universal (isSwitchedToUniversal)
    useEffect(() => {
        if (isSwitchedToUniversal.current) return;
        console.log('🔄 FilteredSanaChat: Aktualizuji nastavení', {
            chatbotId,
            old_settings: settings,
            new_settings: chatbotSettings
        });
        setSettings(chatbotSettings);
        setActiveChatbotId(chatbotId);
    }, [chatbotSettings, chatbotId]);
    
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
            console.log('🔍 FALLBACK LOGIKA:');
            console.log('  - settings.allowed_categories:', settings?.allowed_categories);
            console.log('  - settings.allowed_labels:', settings?.allowed_labels);
            console.log('  - settings.allowed_publication_types:', settings?.allowed_publication_types);
            
            const fallbackCategories = settings?.allowed_categories === undefined
                ? allFallbackCategories // Undefined = zobraz vše
                : (settings.allowed_categories.length === 0 ? [] : []); // Prázdné nebo UUID = čekáme na DB
                
            const fallbackLabels = settings?.allowed_labels === undefined
                ? allFallbackLabels // Undefined = zobraz vše
                : []; // Prázdné nebo UUID = použij nastavení (prázdné = skryté)
                
            const fallbackTypes = settings?.allowed_publication_types === undefined
                ? allFallbackTypes // Undefined = zobraz vše
                : (settings.allowed_publication_types.length === 0 ? [] : []); // Prázdné nebo UUID = čekáme na DB
            
            console.log('🔍 FALLBACK VÝSLEDKY:');
            console.log('  - fallbackCategories:', fallbackCategories);
            console.log('  - fallbackLabels:', fallbackLabels);
            console.log('  - fallbackTypes:', fallbackTypes);
            
            setAvailableCategories(fallbackCategories);
            setAvailableLabels(fallbackLabels);
            setAvailablePublicationTypes(fallbackTypes);
            
            // Defaultně vše zaškrtnuté (pouze povolené položky)
            setSelectedCategories([...fallbackCategories]);
            setSelectedLabels([...fallbackLabels]);
            setSelectedPublicationTypes([...fallbackTypes]);
            
            console.log('🔄 Nastaveny výchozí hodnoty pro filtry podle chatbotSettings:', {
                categories: fallbackCategories,
                labels: fallbackLabels,
                types: fallbackTypes,
                allowed_settings: {
                    categories: settings?.allowed_categories,
                    labels: settings?.allowed_labels,
                    publication_types: settings?.allowed_publication_types
                }
            });
            
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
                
                console.log('🔒 Filtrované kategorie podle chatbotSettings:');
                console.log('  - Všechny z DB:', categories);
                console.log('  - Povolené UUID z settings.allowed_categories:', settings?.allowed_categories);
                console.log('  - Výsledné povolené kategorie (jména):', allowedCategories);
                console.log('  - Povolené štítky:', allowedLabels);
                console.log('  - Povolené typy:', allowedPublicationTypes);
                
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
                console.error('Chyba při načítání metadat z databáze, zůstávám u fallback hodnot:', error);
            }
        };
        
        loadMetadata();
    }, [settings]); // Znovu načteme pokud se změní nastavení

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
                    // ❌ Ikona produktů (košík) byla odstraněna
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
                
                {/* Chat komponenta nebo ProductSync */}
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
                            externalUserInfo={externalUserInfo}
                            onClose={onClose}
                            onSwitchToUniversal={handleSwitchToUniversal}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export { SanaChat, SanaChatContent, FilteredSanaChat };
export default FilteredSanaChat;
