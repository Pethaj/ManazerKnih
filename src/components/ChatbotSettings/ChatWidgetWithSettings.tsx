import React, { useState, useEffect } from 'react';
import FilteredSanaChatWithSettings from './FilteredSanaChatWithSettings';
import { ChatbotSettingsService, ChatbotSettings } from '../../services/chatbotSettingsService';

// Ikonky
const CloseIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const ChatBubbleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

const SettingsIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="3"/>
    <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"/>
  </svg>
);

const ChevronDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

interface ChatWidgetWithSettingsProps {
  defaultChatbotId?: string; // Výchozí chatbot ID
  allowChatbotSelection?: boolean; // Zda povolit výběr chatbota
  showAdminButton?: boolean; // Zda zobrazit tlačítko pro admin rozhraní
  onOpenAdmin?: () => void; // Callback pro otevření admin rozhraní
}

const ChatWidgetWithSettings: React.FC<ChatWidgetWithSettingsProps> = ({
  defaultChatbotId = 'general_chat',
  allowChatbotSelection = true,
  showAdminButton = false,
  onOpenAdmin
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [availableChatbots, setAvailableChatbots] = useState<ChatbotSettings[]>([]);
  const [selectedChatbotId, setSelectedChatbotId] = useState(defaultChatbotId);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Načti dostupné chatboty při startu
  useEffect(() => {
    const loadChatbots = async () => {
      try {
        setLoading(true);
        const chatbots = await ChatbotSettingsService.getAllChatbotSettings();
        // Filtruj pouze aktivní chatboty
        const activeChatbots = chatbots.filter(bot => bot.is_active);
        setAvailableChatbots(activeChatbots);
        
        // Pokud defaultní chatbot není v seznamu aktivních, vyber první dostupný
        if (!activeChatbots.find(bot => bot.chatbot_id === defaultChatbotId) && activeChatbots.length > 0) {
          setSelectedChatbotId(activeChatbots[0].chatbot_id);
        }
      } catch (err) {
        setError('Nepodařilo se načíst dostupné chatboty');
      } finally {
        setLoading(false);
      }
    };

    loadChatbots();
  }, [defaultChatbotId]);

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (isDropdownOpen) {
      setIsDropdownOpen(false);
    }
  };

  const selectChatbot = (chatbotId: string) => {
    setSelectedChatbotId(chatbotId);
    setIsDropdownOpen(false);
  };

  const selectedChatbot = availableChatbots.find(bot => bot.chatbot_id === selectedChatbotId);

  if (loading) {
    return (
      <div className="fixed bottom-5 right-5 z-50">
        <div className="w-16 h-16 bg-gray-400 rounded-full flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (error || availableChatbots.length === 0) {
    return (
      <div className="fixed bottom-5 right-5 z-50">
        <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center" title={error || 'Žádné chatboty nejsou k dispozici'}>
          <span className="text-white text-xs">!</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-[1200px] h-[700px] max-w-[95vw] max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col transition-all duration-300 ease-in-out">
            {/* Header s výběrem chatbota */}
            {allowChatbotSelection && availableChatbots.length > 1 && (
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-700">Chatbot:</span>
                  <div className="relative">
                    <button
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <span className="text-sm font-medium">
                        {selectedChatbot?.chatbot_name || selectedChatbotId}
                      </span>
                      <ChevronDownIcon className={`transform transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {isDropdownOpen && (
                      <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-300 rounded-md shadow-lg z-10">
                        {availableChatbots.map((chatbot) => (
                          <button
                            key={chatbot.chatbot_id}
                            onClick={() => selectChatbot(chatbot.chatbot_id)}
                            className={`w-full text-left px-4 py-2 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 ${
                              chatbot.chatbot_id === selectedChatbotId ? 'bg-blue-50 text-blue-700' : ''
                            }`}
                          >
                            <div className="font-medium">{chatbot.chatbot_name}</div>
                            {chatbot.description && (
                              <div className="text-xs text-gray-500 mt-1">{chatbot.description}</div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {showAdminButton && onOpenAdmin && (
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        onOpenAdmin();
                      }}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                      title="Správa chatbotů"
                    >
                      <SettingsIcon />
                    </button>
                  )}
                  <button
                    onClick={toggleChat}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                    title="Zavřít chat"
                  >
                    <CloseIcon />
                  </button>
                </div>
              </div>
            )}
            
            {/* Chat komponenta */}
            <div className="flex-1 min-h-0">
              <FilteredSanaChatWithSettings 
                chatbotId={selectedChatbotId}
                chatbotName={selectedChatbot?.chatbot_name}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Floating tlačítko */}
      <div className="fixed bottom-5 right-5 z-50">
        <div className="relative">
          {/* Tooltip s názvem chatbota */}
          {selectedChatbot && !isOpen && (
            <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-black text-white text-xs rounded-md whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
              {selectedChatbot.chatbot_name}
              <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
            </div>
          )}
          
          <button
            onClick={toggleChat}
            className="w-16 h-16 bg-bewit-blue rounded-full text-white flex items-center justify-center shadow-lg hover:bg-blue-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bewit-blue group"
            aria-label={isOpen ? 'Zavřít chat' : 'Otevřít chat'}
          >
            {isOpen ? <CloseIcon className="w-8 h-8" /> : <ChatBubbleIcon className="w-8 h-8" />}
          </button>
          
          {/* Indikátor chatbota */}
          {selectedChatbot && !isOpen && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {selectedChatbot.chatbot_name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ChatWidgetWithSettings;
