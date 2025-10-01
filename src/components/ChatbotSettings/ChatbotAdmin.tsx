import React, { useState } from 'react';
import ChatbotSettingsManager from './ChatbotSettingsManager';
import ChatWidgetWithSettings from './ChatWidgetWithSettings';

const ChatIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

const SettingsIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="3"/>
    <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"/>
  </svg>
);

/**
 * Hlavní administrační komponenta pro správu chatbotů
 * Kombinuje správu nastavení s chat widgetem
 */
const ChatbotAdmin: React.FC = () => {
  const [currentView, setCurrentView] = useState<'chat' | 'admin'>('chat');

  return (
    <div className="min-h-screen bg-gray-50">
      {currentView === 'admin' ? (
        // Administrační rozhraní
        <div className="container mx-auto px-4 py-8">
          {/* Header s navigací */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-gray-800">Administrace Chatbotů</h1>
              <button
                onClick={() => setCurrentView('chat')}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <ChatIcon />
                <span>Přepnout na Chat</span>
              </button>
            </div>
            <p className="text-gray-600 mt-2">
              Spravujte nastavení jednotlivých chatbotů a jejich přístup k filtrům
            </p>
          </div>
          
          {/* Správa nastavení */}
          <ChatbotSettingsManager />
        </div>
      ) : (
        // Chat rozhraní s možností správy
        <div className="h-screen">
          {/* Chat widget s možností otevření admin rozhraní */}
          <ChatWidgetWithSettings
            defaultChatbotId="medbase_sana"
            allowChatbotSelection={true}
            showAdminButton={true}
            onOpenAdmin={() => setCurrentView('admin')}
          />
          
          {/* Floating admin tlačítko */}
          <div className="fixed bottom-5 left-5 z-40">
            <button
              onClick={() => setCurrentView('admin')}
              className="w-12 h-12 bg-gray-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              title="Otevřít administraci chatbotů"
            >
              <SettingsIcon className="w-6 h-6" />
            </button>
          </div>
          
          {/* Obsah stránky - zde může být váš existující obsah */}
          <div className="h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-800 mb-4">SANA AI Chatboty</h1>
              <p className="text-xl text-gray-600 mb-8">
                Inteligentní asistenti s individuálním nastavením filtrací
              </p>
              <div className="space-y-4 text-gray-600">
                <p>• Klikněte na chat bubble vpravo dole pro spuštění chatu</p>
                <p>• Použijte tlačítko nastavení vlevo dole pro správu chatbotů</p>
                <p>• Každý chatbot má svoje specifické filtrace a oprávnění</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatbotAdmin;
