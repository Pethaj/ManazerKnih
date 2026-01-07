import React from 'react';

interface ChatbotOption {
  id: string;
  chatbot_id: string;
  chatbot_name: string;
  description: string | null;
  is_active: boolean;
}

interface ChatbotSelectorProps {
  chatbots: ChatbotOption[];
  onSelect: (chatbotId: string) => void;
  onClose: () => void;
}

const ChatIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    <circle cx="9" cy="10" r="1"/>
    <circle cx="15" cy="10" r="1"/>
  </svg>
);

const CloseIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

/**
 * ChatbotSelector - Jednoduchý výběr chatbota
 * Zobrazí seznam aktivních chatbotů pro výběr
 */
const ChatbotSelector: React.FC<ChatbotSelectorProps> = ({ chatbots, onSelect, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-bewit-blue text-white px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Vyberte chatbota</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors p-1 rounded-md hover:bg-white/10"
            aria-label="Zavřít"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Seznam chatbotů */}
        <div className="p-4 max-h-[70vh] overflow-y-auto">
          {chatbots.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-lg mb-2">😕</p>
              <p>Žádné aktivní chatboty nejsou k dispozici</p>
            </div>
          ) : (
            <div className="space-y-3">
              {chatbots.map((chatbot) => (
                <button
                  key={chatbot.id}
                  onClick={() => onSelect(chatbot.chatbot_id)}
                  className="w-full text-left p-4 rounded-lg border-2 border-gray-200 hover:border-bewit-blue hover:bg-blue-50 transition-all duration-200 group"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-12 h-12 bg-bewit-blue rounded-full flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-200">
                      <ChatIcon />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-lg mb-1 group-hover:text-bewit-blue transition-colors">
                        {chatbot.chatbot_name}
                      </h3>
                      {chatbot.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {chatbot.description}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <svg
                        className="w-5 h-5 text-gray-400 group-hover:text-bewit-blue transition-colors"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Vyberte chatbota pro zahájení konverzace
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatbotSelector;

