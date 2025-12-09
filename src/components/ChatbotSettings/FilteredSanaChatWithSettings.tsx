import React, { useState, useEffect } from 'react';
import { SanaChatContent } from '../SanaChat/SanaChat';
import { ProductSyncAdmin } from '../ProductEmbeddingManager';
import { ChatbotSettingsService, Category, PublicationType, Label } from '../../services/chatbotSettingsService';

// Import ikon a komponent z původního SanaChat
const SanaAILogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg width="120" height="36" viewBox="0 0 120 36" xmlns="http://www.w3.org/2000/svg" {...props}>
    <text x="0" y="28" fill="currentColor" fontSize="24" fontWeight="bold" fontFamily="Arial, sans-serif">
      SANA AI
    </text>
  </svg>
);

const ProductIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="9" cy="21" r="1"/>
    <circle cx="20" cy="21" r="1"/>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
  </svg>
);

interface FilteredSanaChatWithSettingsProps {
  chatbotId: string; // Identifikátor chatbota pro načtení jeho nastavení
  chatbotName?: string; // Volitelný název pro zobrazení
}

const FilteredSanaChatWithSettings: React.FC<FilteredSanaChatWithSettingsProps> = ({ 
  chatbotId, 
  chatbotName 
}) => {
  // Nastavení a filtrace načtené z databáze podle chatbot ID
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
  const [availableLabels, setAvailableLabels] = useState<Label[]>([]);
  const [availablePublicationTypes, setAvailablePublicationTypes] = useState<PublicationType[]>([]);
  
  // Filtry jsou defaultně prázdné, načtou se podle nastavení chatbota
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [selectedPublicationTypes, setSelectedPublicationTypes] = useState<string[]>([]);
  
  // Nastavení chatbota
  const [chatbotSettings, setChatbotSettings] = useState({
    product_recommendations: false,
    product_button_recommendations: false,
    inline_product_links: false,  // 🆕 Inline produktové linky
    book_database: true,
    use_feed_1: true,
    use_feed_2: true,
    enable_product_router: true,   // 🆕 Produktový router (defaultně zapnutý)
    enable_manual_funnel: false,   // 🆕 Manuální funnel (defaultně vypnutý)
  });
  
  // State pro UI
  const [isFilterPanelVisible, setIsFilterPanelVisible] = useState<boolean>(false);
  const [isProductSyncVisible, setIsProductSyncVisible] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatbotDisplayName, setChatbotDisplayName] = useState(chatbotName || chatbotId);

  // Načteme nastavení chatbota při startu komponenty
  useEffect(() => {
    const loadChatbotSettings = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log(`🤖 Načítám nastavení pro chatbota: ${chatbotId}`);
        
        // Načti kompletní filtrace pro konkrétní chatbota
        const filters = await ChatbotSettingsService.getChatbotFilters(chatbotId);
        
        console.log('📊 Načtené filtrace pro chatbota:', {
          chatbotId,
          filters
        });
        
        // Nastav dostupné možnosti podle nastavení chatbota
        setAvailableCategories(filters.categories);
        setAvailablePublicationTypes(filters.publicationTypes);
        setAvailableLabels(filters.labels);
        
        // Nastav vybrané filtry (defaultně vše co je dostupné)
        setSelectedCategories(filters.categories.map(c => c.name));
        setSelectedPublicationTypes(filters.publicationTypes.map(pt => pt.name));
        setSelectedLabels(filters.labels.map(l => l.name));
        
        // Nastav nastavení chatbota - z getChatbotFilters() dostaneme kompletní filtry
        const newSettings = {
          product_recommendations: filters.productRecommendations,
          product_button_recommendations: filters.productButtonRecommendations,
          inline_product_links: filters.inlineProductLinks,  // 🆕 Inline produktové linky
          book_database: filters.bookDatabase,
          use_feed_1: filters.useFeed1,
          use_feed_2: filters.useFeed2,
          enable_product_router: filters.enableProductRouter,   // 🆕 Produktový router
          enable_manual_funnel: filters.enableManualFunnel,     // 🆕 Manuální funnel
        };
        
        console.log('🔧 Nastavuji chatbotSettings:', newSettings);
        console.log('🔍 inline_product_links hodnota:', filters.inlineProductLinks);
        console.log('🎯 enable_manual_funnel hodnota:', filters.enableManualFunnel);
        
        setChatbotSettings(newSettings);
        
        // Pokud máme nastavení z databáze, použij název z databáze
        const settingsWithDetails = await ChatbotSettingsService.getChatbotSettingsWithDetails(chatbotId);
        if (settingsWithDetails) {
          setChatbotDisplayName(settingsWithDetails.chatbot_name);
        }
        
      } catch (err) {
        console.error('Chyba při načítání nastavení chatbota:', err);
        setError('Nepodařilo se načíst nastavení chatbota');
        
        // Fallback - pokud se nepodaří načíst nastavení, použij výchozí hodnoty
        const fallbackCategories = [
          { id: '1', name: 'Aromaterapie' },
          { id: '2', name: 'Masáže' },
          { id: '3', name: 'Akupunktura' },
          { id: '4', name: 'Diagnostika' }
        ];
        const fallbackPublicationTypes = [
          { id: '1', name: 'public', description: 'Veřejně dostupné publikace' }
        ];
        const fallbackLabels: Label[] = [];
        
        setAvailableCategories(fallbackCategories);
        setAvailablePublicationTypes(fallbackPublicationTypes);
        setAvailableLabels(fallbackLabels);
        
        setSelectedCategories(fallbackCategories.map(c => c.name));
        setSelectedPublicationTypes(fallbackPublicationTypes.map(pt => pt.name));
        setSelectedLabels([]);
        
        setChatbotSettings({
          product_recommendations: false,
          product_button_recommendations: false,
          inline_product_links: false,  // 🆕 Inline produktové linky
          book_database: true,
          use_feed_1: true,
          use_feed_2: true,
          enable_product_router: true,   // 🆕 Produktový router (defaultně zapnutý)
          enable_manual_funnel: false,   // 🆕 Manuální funnel (defaultně vypnutý)
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadChatbotSettings();
  }, [chatbotId, chatbotName]);

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

  // Funkce pro výběr všech dostupných filtrů pro tento chatbot
  const selectAllFilters = () => {
    setSelectedCategories(availableCategories.map(c => c.name));
    setSelectedLabels(availableLabels.map(l => l.name));
    setSelectedPublicationTypes(availablePublicationTypes.map(pt => pt.name));
  };

  const toggleFilterPanel = () => {
    setIsFilterPanelVisible(!isFilterPanelVisible);
  };

  const toggleProductSync = () => {
    setIsProductSyncVisible(!isProductSyncVisible);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-bewit-gray">
        <div className="text-center">
          <div className="text-xl text-gray-600 mb-2">Načítám nastavení chatbota...</div>
          <div className="text-sm text-gray-500">{chatbotDisplayName}</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-bewit-gray">
        <div className="text-center">
          <div className="text-xl text-red-600 mb-2">Chyba při načítání</div>
          <div className="text-sm text-gray-500">{error}</div>
          <div className="text-xs text-gray-400 mt-2">Chatbot: {chatbotDisplayName}</div>
        </div>
      </div>
    );
  }

  // Pokud chatbot nemá žádné povolené kategorie nebo typy publikací, zobrazíme zprávu
  const hasAnyFilters = availableCategories.length > 0 || availablePublicationTypes.length > 0;

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
              {chatbotDisplayName}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {hasAnyFilters ? 'Vyberte kategorie pro přesnější výsledky' : 'Žádné filtrace nejsou k dispozici'}
            </p>
          </div>
          
          {hasAnyFilters && (
            <>
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
            </>
          )}
          
          {/* Kategorie - zobrazí se pouze pokud jsou dostupné */}
          {availableCategories.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-bewit-dark mb-4 text-center">Kategorie léčby</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availableCategories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => toggleFilter(category.name, selectedCategories, setSelectedCategories)}
                    className={`p-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 text-center ${
                      selectedCategories.includes(category.name)
                        ? 'bg-bewit-blue text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Typy publikací - zobrazí se pouze pokud jsou dostupné */}
          {availablePublicationTypes.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-bewit-dark mb-4 text-center">Typy publikací</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availablePublicationTypes.map(type => (
                  <button
                    key={type.id}
                    onClick={() => toggleFilter(type.name, selectedPublicationTypes, setSelectedPublicationTypes)}
                    className={`p-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 text-center ${
                      selectedPublicationTypes.includes(type.name)
                        ? 'bg-bewit-blue text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    title={type.description}
                  >
                    {type.name === 'public' ? 'Veřejné' : 
                     type.name === 'students' ? 'Pro studenty' : 
                     type.name === 'internal_bewit' ? 'Interní' : 
                     type.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Štítky - zobrazí se pouze pokud jsou dostupné */}
          {availableLabels.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-bewit-dark mb-4 text-center">Štítky</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availableLabels.map(label => (
                  <button
                    key={label.id}
                    onClick={() => toggleFilter(label.name, selectedLabels, setSelectedLabels)}
                    className={`p-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 text-center ${
                      selectedLabels.includes(label.name)
                        ? 'bg-bewit-blue text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {label.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Pokud nejsou k dispozici žádné filtrace */}
          {!hasAnyFilters && (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-2">Žádné filtrace nejsou povoleny</p>
              <p className="text-xs text-gray-400">
                Chatbot {chatbotDisplayName} nemá přístup k žádným kategoriím nebo typům publikací.
              </p>
            </div>
          )}
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
                <div className="flex flex-col">
                  <SanaAILogo className="h-6 w-16 text-white" />
                  <span className="text-xs text-white/80 mt-1">{chatbotDisplayName}</span>
                </div>
              </div>
              
              {/* Tlačítko pro produktovou synchronizaci - zobrazí se pouze pokud je povoleno */}
              {chatbotSettings.product_recommendations && (
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
              )}
            </div>
          </div>
        </div>
        
        {/* Chat komponenta nebo ProductSync */}
        <div className="flex-1 bg-bewit-gray">
          {isProductSyncVisible && chatbotSettings.product_recommendations ? (
            <div className="w-full h-full flex-1 overflow-y-auto p-6">
              <ProductSyncAdmin />
            </div>
          ) : (
            <>
              {console.log(`🔧 FilteredSanaChatWithSettings předává chatbotId: "${chatbotId}" do SanaChatContent`)}
              <SanaChatContent 
                selectedCategories={selectedCategories}
                selectedLabels={selectedLabels}
                selectedPublicationTypes={selectedPublicationTypes}
                chatbotSettings={chatbotSettings}
                chatbotId={chatbotId}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FilteredSanaChatWithSettings;
