
import React, { useState, useEffect } from 'react';
import { FilteredSanaChat } from './SanaChat';
import { ChatbotSettingsService } from '../../services/chatbotSettingsService';

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
    chatbotSettings?: {
        product_recommendations: boolean;
        product_button_recommendations: boolean;
        book_database: boolean;
        use_feed_1?: boolean;
        use_feed_2?: boolean;
    };
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ 
    chatbotSettings: propChatbotSettings 
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [chatbotSettings, setChatbotSettings] = useState<{
        product_recommendations: boolean;
        product_button_recommendations: boolean;
        book_database: boolean;
        use_feed_1?: boolean;
        use_feed_2?: boolean;
    } | null>(null);
    const [chatbotId, setChatbotId] = useState<string>('sana_chat'); // 🆕 Pro markdown rendering
    const [isLoading, setIsLoading] = useState(true);

    // Načtení nastavení SanaChat z databáze při prvním načtení
    useEffect(() => {
        const loadChatbotSettings = async () => {
            // Pokud jsou poskytnuta nastavení přes props, použij je
            if (propChatbotSettings) {
                setChatbotSettings(propChatbotSettings);
                setIsLoading(false);
                return;
            }

            try {
                console.log('🌐 Načítám výchozí webový chatbot z databáze...');
                // 🆕 Načti výchozí webový chatbot (is_default_web_chatbot = true)
                const settings = await ChatbotSettingsService.getDefaultWebChatbot();
                
                if (settings) {
                    console.log('✅ Výchozí webový chatbot načten:', settings.chatbot_id, settings.chatbot_name);
                    setChatbotId(settings.chatbot_id); // Uložíme ID pro markdown rendering
                    setChatbotSettings({
                        product_recommendations: settings.product_recommendations || false,
                        product_button_recommendations: settings.product_button_recommendations || false,
                        book_database: settings.book_database !== undefined ? settings.book_database : true,
                        use_feed_1: settings.use_feed_1 !== undefined ? settings.use_feed_1 : true,
                        use_feed_2: settings.use_feed_2 !== undefined ? settings.use_feed_2 : true,
                    });
                } else {
                    console.warn('⚠️ Výchozí webový chatbot nenalezen, použiji defaultní hodnoty pro sana_chat');
                    // Defaultní nastavení pokud není v databázi
                    setChatbotId('sana_chat');
                    setChatbotSettings({
                        product_recommendations: false,
                        product_button_recommendations: false,
                        book_database: true,
                        use_feed_1: true,
                        use_feed_2: true,
                    });
                }
            } catch (error) {
                console.error('❌ Chyba při načítání nastavení SanaChat:', error);
                // Fallback na defaultní nastavení
                setChatbotSettings({
                    product_recommendations: false,
                    product_button_recommendations: false,
                    book_database: true,
                    use_feed_1: true,
                    use_feed_2: true,
                });
            } finally {
                setIsLoading(false);
            }
        };

        loadChatbotSettings();
    }, [propChatbotSettings]);

    const toggleChat = () => {
        setIsOpen(!isOpen);
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
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="w-[1200px] h-[700px] max-w-[95vw] max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col transition-all duration-300 ease-in-out">
                        <FilteredSanaChat 
                            chatbotId={chatbotId}
                            chatbotSettings={chatbotSettings} 
                            onClose={() => setIsOpen(false)}
                        />
                    </div>
                </div>
            )}
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
