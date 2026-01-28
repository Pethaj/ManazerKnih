
import React, { useState, useEffect } from 'react';
import { FilteredSanaChat } from './SanaChat';
import { ChatbotSettingsService, ChatbotSettings } from '../../services/chatbotSettingsService';
import ChatbotSelector from '../ChatbotSelector/ChatbotSelector';
import { User } from '../../services/customAuthService';

const ChatBubbleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
);

const CloseIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);


interface ChatWidgetProps {
    currentUser?: User;  // 🆕 Přihlášený uživatel
    chatbotSettings?: {
        product_recommendations: boolean;
        product_button_recommendations: boolean;
        inline_product_links?: boolean;  // 🆕 Inline produktové linky / screening
        book_database: boolean;
        use_feed_1?: boolean;
        use_feed_2?: boolean;
        webhook_url?: string;  // 🆕 N8N webhook URL
        enable_product_router?: boolean;  // 🆕 Produktový router
        enable_manual_funnel?: boolean;   // 🆕 Manuální funnel
        summarize_history?: boolean;  // 🆕 Sumarizace historie
    };
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ 
    currentUser,
    chatbotSettings: propChatbotSettings 
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showSelector, setShowSelector] = useState(false);
    const [availableChatbots, setAvailableChatbots] = useState<ChatbotSettings[]>([]);
    const [chatbotSettings, setChatbotSettings] = useState<{
        product_recommendations: boolean;
        product_button_recommendations: boolean;
        inline_product_links?: boolean;  // 🆕 Inline produktové linky / screening
        book_database: boolean;
        use_feed_1?: boolean;
        use_feed_2?: boolean;
        webhook_url?: string;  // 🆕 N8N webhook URL
        allowed_categories?: string[];  // 🆕 Povolené kategorie (UUID)
        allowed_labels?: string[];  // 🆕 Povolené štítky (UUID)
        allowed_publication_types?: string[];  // 🆕 Povolené typy publikací (UUID)
        enable_product_router?: boolean;  // 🆕 Produktový router
        enable_manual_funnel?: boolean;   // 🆕 Manuální funnel
        summarize_history?: boolean;  // 🆕 Sumarizace historie
    } | null>(null);
    const [chatbotId, setChatbotId] = useState<string>('sana_chat'); // 🆕 Pro markdown rendering
    const [isLoading, setIsLoading] = useState(true);

    // Načtení aktivních chatbotů při prvním načtení
    useEffect(() => {
        const loadChatbots = async () => {
            // Pokud jsou poskytnuta nastavení přes props, použij je a přeskoč načítání z DB
            if (propChatbotSettings) {
                setChatbotSettings(propChatbotSettings);
                setIsLoading(false);
                return;
            }

            try {
                // Načti všechny aktivní chatboty
                const chatbots = await ChatbotSettingsService.getActiveChatbots();
                setAvailableChatbots(chatbots);
                
                console.log('✅ Načteno aktivních chatbotů:', chatbots.length);
                
                // Pokud jsou nějaké chatboty k dispozici, nastav první jako výchozí
                if (chatbots.length > 0) {
                    const defaultChatbot = chatbots[0];
                    loadChatbotById(defaultChatbot.chatbot_id);
                } else {
                    // Fallback na defaultní nastavení
                    setChatbotId('sana_chat');
                    setChatbotSettings({
                        product_recommendations: false,
                        product_button_recommendations: false,
                        inline_product_links: false,
                        book_database: true,
                        use_feed_1: true,
                        use_feed_2: true,
                        allowed_categories: [],
                        allowed_labels: [],
                        allowed_publication_types: [],
                        enable_product_router: true,   // default true
                        enable_manual_funnel: false,   // default false
                        summarize_history: false,      // default false
                    });
                }
            } catch (error) {
                console.error('❌ Chyba při načítání chatbotů:', error);
                // Fallback na defaultní nastavení
                setChatbotSettings({
                    product_recommendations: false,
                    product_button_recommendations: false,
                    book_database: true,
                    use_feed_1: true,
                    use_feed_2: true,
                    allowed_categories: [],
                    allowed_labels: [],
                    allowed_publication_types: [],
                    enable_product_router: true,   // default true
                    enable_manual_funnel: false,   // default false
                    summarize_history: false,      // default false
                });
            } finally {
                setIsLoading(false);
            }
        };

        loadChatbots();
    }, [propChatbotSettings]);

    // Funkce pro načtení konkrétního chatbota podle ID
    const loadChatbotById = async (chatbotIdToLoad: string) => {
        try {
            const settings = await ChatbotSettingsService.getChatbotSettings(chatbotIdToLoad);
            
            console.log('═══════════════════════════════════════════════════════════');
            console.log('🔍 CHATWIDGET: loadChatbotById');
            console.log('📝 Chatbot ID:', chatbotIdToLoad);
            console.log('📦 Settings z databáze:', settings);
            console.log('🔍 summarize_history z DB:', settings?.summarize_history);
            console.log('═══════════════════════════════════════════════════════════');
            
            if (settings) {
                setChatbotId(settings.chatbot_id);
                
                const newSettings = {
                    product_recommendations: settings.product_recommendations || false,
                    product_button_recommendations: settings.product_button_recommendations || false,
                    inline_product_links: settings.inline_product_links || false,
                    book_database: settings.book_database !== undefined ? settings.book_database : true,
                    use_feed_1: settings.use_feed_1 !== undefined ? settings.use_feed_1 : true,
                    use_feed_2: settings.use_feed_2 !== undefined ? settings.use_feed_2 : true,
                    webhook_url: settings.webhook_url,  // 🆕 PŘIDÁNO: Webhook URL z databáze
                    // 🆕 Přidáme filtry z nastavení chatbota
                    allowed_categories: settings.allowed_categories || [],
                    allowed_labels: settings.allowed_labels || [],
                    allowed_publication_types: settings.allowed_publication_types || [],
                    // 🆕 DŮLEŽITÉ: Produktový router a manuální funnel
                    enable_product_router: settings.enable_product_router !== false, // default true
                    enable_manual_funnel: settings.enable_manual_funnel === true,    // default false
                    // 🆕 DŮLEŽITÉ: Sumarizace historie
                    summarize_history: settings.summarize_history === true,          // default false
                };
                
                console.log('✅ Sestavené chatbotSettings:', newSettings);
                console.log('🔍 summarize_history po sestavení:', newSettings.summarize_history);
                console.log('═══════════════════════════════════════════════════════════');
                
                setChatbotSettings(newSettings);
                console.log(`✅ Načten chatbot: ${settings.chatbot_name}`, {
                    chatbot_id: settings.chatbot_id,
                    webhook_url: settings.webhook_url,  // 🆕 PŘIDÁNO: Debug log
                    categories: settings.allowed_categories?.length || 0,
                    labels: settings.allowed_labels?.length || 0,
                    publicationTypes: settings.allowed_publication_types?.length || 0,
                    enableProductRouter: settings.enable_product_router !== false,
                    enableManualFunnel: settings.enable_manual_funnel === true,
                    summarizeHistory: settings.summarize_history === true  // 🆕 DEBUG: Sumarizace
                });
            }
        } catch (error) {
            console.error('❌ Chyba při načítání chatbota:', error);
        }
    };

    // Handler pro výběr chatbota ze selectoru
    const handleChatbotSelect = async (selectedChatbotId: string) => {
        console.log('🤖 Uživatel vybral chatbota:', selectedChatbotId);
        setShowSelector(false);
        await loadChatbotById(selectedChatbotId);
        setIsOpen(true);
    };

    const toggleChat = () => {
        // Pokud máme více než 1 aktivní chatbot, zobraz selector
        if (!isOpen && availableChatbots.length > 1) {
            setShowSelector(true);
        } else {
            setIsOpen(!isOpen);
        }
    };

    // Pokud se načítají nastavení, nezobrazuj tlačítko
    if (isLoading) {
        return null;
    }

    // Pokud nastavení nejsou dostupná, nezobrazuj widget
    if (!chatbotSettings) {
        return null;
    }

    return (
        <>
            {/* Selector chatbotů */}
            {showSelector && (
                <ChatbotSelector
                    chatbots={availableChatbots}
                    onSelect={handleChatbotSelect}
                    onClose={() => setShowSelector(false)}
                />
            )}

            {/* Chat okno */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="w-[1200px] h-[700px] max-w-[95vw] max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col transition-all duration-300 ease-in-out">
                        <FilteredSanaChat 
                            currentUser={currentUser}
                            chatbotId={chatbotId}
                            chatbotSettings={chatbotSettings} 
                            onClose={() => setIsOpen(false)}
                        />
                    </div>
                </div>
            )}

            {/* Plovoucí tlačítko */}
            <div className="fixed bottom-5 right-5 z-50">
                <button
                    onClick={toggleChat}
                    className="w-16 h-16 bg-bewit-blue rounded-full text-white flex items-center justify-center shadow-lg hover:bg-blue-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bewit-blue"
                    aria-label={isOpen ? 'Zavřít chat' : 'Otevřít chat'}
                >
                    {isOpen ? <CloseIcon className="w-8 h-8" /> : <ChatBubbleIcon className="w-8 h-8" />}
                </button>
            </div>
        </>
    );
};

export default ChatWidget;
