/**
 * Ukázkový soubor pro demonstraci použití nového systému nastavení chatbotů
 * 
 * Tento soubor můžete použít jako referenci pro integraci systému
 * do vaší existující aplikace.
 */

import React from 'react';
import { 
  ChatbotAdmin,
  ChatWidgetWithSettings,
  FilteredSanaChatWithSettings,
  ChatbotSettingsManager 
} from '../components/ChatbotSettings';

// Příklad 1: Kompletní administrace s možností přepínání mezi chatem a správou
export const ExampleFullAdmin: React.FC = () => {
  return <ChatbotAdmin />;
};

// Příklad 2: Pouze chat widget s možností výběru chatbota
export const ExampleChatWidget: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <h1 className="text-center py-8 text-2xl font-bold">Moje aplikace</h1>
      {/* Váš existující obsah */}
      
      {/* Chat widget s nastavením */}
      <ChatWidgetWithSettings
        defaultChatbotId="medbase_sana"
        allowChatbotSelection={true}
        showAdminButton={false} // Skryje admin tlačítko
      />
    </div>
  );
};

// Příklad 3: Vestavěný chat s konkrétním chatbotem (bez widgetu)
export const ExampleEmbeddedChat: React.FC = () => {
  return (
    <div className="h-screen">
      <FilteredSanaChatWithSettings 
        chatbotId="sana_kancelar"
        chatbotName="Kancelářský asistent"
      />
    </div>
  );
};

// Příklad 4: Pouze správa nastavení (pro admin stránky)
export const ExampleSettingsManager: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Správa chatbotů</h1>
      <ChatbotSettingsManager />
    </div>
  );
};

// Příklad 5: Integrace do existující navigace
export const ExampleWithNavigation: React.FC = () => {
  const [currentPage, setCurrentPage] = React.useState<'home' | 'chat' | 'admin'>('home');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigace */}
      <nav className="bg-white shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex space-x-8 py-4">
            <button
              onClick={() => setCurrentPage('home')}
              className={`px-4 py-2 rounded ${currentPage === 'home' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-800'}`}
            >
              Domů
            </button>
            <button
              onClick={() => setCurrentPage('chat')}
              className={`px-4 py-2 rounded ${currentPage === 'chat' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-800'}`}
            >
              Chat
            </button>
            <button
              onClick={() => setCurrentPage('admin')}
              className={`px-4 py-2 rounded ${currentPage === 'admin' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-800'}`}
            >
              Správa chatbotů
            </button>
          </div>
        </div>
      </nav>

      {/* Obsah */}
      <div className="flex-1">
        {currentPage === 'home' && (
          <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold">Domovská stránka</h1>
            <p>Obsah vaší aplikace...</p>
          </div>
        )}
        
        {currentPage === 'chat' && (
          <div className="h-screen">
            <FilteredSanaChatWithSettings 
              chatbotId="medbase_sana"
            />
          </div>
        )}
        
        {currentPage === 'admin' && (
          <div className="container mx-auto px-4 py-8">
            <ChatbotSettingsManager />
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * NÁVOD K POUŽITÍ:
 * 
 * 1. INSTALACE DATABÁZE:
 *    - Spusťte SQL script: create_chatbot_settings_table.sql v Supabase
 *    - Ujistěte se, že existují tabulky: categories, publication_types, labels
 * 
 * 2. KONFIGURACE PROSTŘEDÍ:
 *    - Zkontrolujte proměnné prostředí pro Supabase (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
 * 
 * 3. ZÁKLADNÍ POUŽITÍ:
 *    - Pro kompletní řešení použijte: <ChatbotAdmin />
 *    - Pro pouze chat widget použijte: <ChatWidgetWithSettings />
 *    - Pro vestavěný chat použijte: <FilteredSanaChatWithSettings chatbotId="..." />
 * 
 * 4. KONFIGURACE CHATBOTŮ:
 *    - Spusťte komponentu ChatbotSettingsManager
 *    - Vytvořte nové chatboty nebo upravte existující
 *    - Nastavte povolené kategorie a typy publikací pro každý chatbot
 * 
 * 5. PŘIZPŮSOBENÍ:
 *    - Styling můžete upravit v CSS třídách
 *    - Chování můžete upravit prostřednictvím props
 *    - Service můžete rozšířit o další funkcionality
 * 
 * 6. EXISTUJÍCÍ CHATBOTY (po spuštění SQL scriptu):
 *    - "general_chat" - Základní chat s veřejnými publikacemi
 *    - "sana_kancelar" - Chat pro kancelář s omezeným přístupem  
 *    - "medbase_sana" - Hlavní chat s plným přístupem
 */
