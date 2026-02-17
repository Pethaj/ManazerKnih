import React, { useState, useEffect } from 'react';
import { SanaChatContent } from '../SanaChat/SanaChat';
import ProductSyncAdmin from '../SanaChat/ProductSync';
import { ChatbotSettingsService, Category, PublicationType, Label } from '../../services/chatbotSettingsService';
import ChatHeader, { ChatHeaderButton } from '../ui/ChatHeader';

// Logo SANA AI - obrázek z Supabase storage
const SanaAILogo: React.FC<React.ImgHTMLAttributes<HTMLImageElement>> = (props) => (
  <img
    src="https://modopafybeslbcqjxsve.supabase.co/storage/v1/object/public/web/Generated_Image_September_08__2025_-_3_09PM-removebg-preview.png"
    alt="Sana AI Logo"
    style={{ objectFit: 'contain' }}
    {...props}
  />
);

interface FilteredSanaChatWithSettingsProps {
  chatbotId: string; // Identifikátor chatbota pro načtení jeho nastavení
  chatbotName?: string; // Volitelný název pro zobrazení
  onClose?: () => void; // Volitelná funkce pro zavření chatu
}

const FilteredSanaChatWithSettings: React.FC<FilteredSanaChatWithSettingsProps> = ({ 
  chatbotId, 
  chatbotName,
  onClose 
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
    webhook_url: undefined as string | undefined,  // 🆕 N8N webhook URL
    enable_product_router: true,   // 🆕 Produktový router (defaultně zapnutý)
    enable_manual_funnel: false,   // 🆕 Manuální funnel (defaultně vypnutý)
    summarize_history: false,
    allowed_product_categories: [] as string[],  // 🆕 Povolené produktové kategorie (prázdné = všechny)
    group_products_by_category: false,  // 🆕 Grupování produktů podle kategorií
  });
  
  // State pro UI
  const [isFilterPanelVisible, setIsFilterPanelVisible] = useState<boolean>(false);
  const [isProductSyncVisible, setIsProductSyncVisible] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatbotDisplayName, setChatbotDisplayName] = useState(chatbotName || chatbotId);
  
  // State pro jazyk a funkce hlavičky
  const [selectedLanguage, setSelectedLanguage] = useState<string>('cs');
  
  // Definice jazyků pro hlavičku
  const languages = [
    { code: 'cs', label: 'CZ' },
    { code: 'sk', label: 'SK' },
    { code: 'de', label: 'DE' },
    { code: 'en', label: 'UK' }
  ];

  // Načteme nastavení chatbota při startu komponenty
  useEffect(() => {
    const loadChatbotSettings = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Načti kompletní filtrace pro konkrétní chatbota
        const filters = await ChatbotSettingsService.getChatbotFilters(chatbotId);
        
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
          webhook_url: filters.webhookUrl,  // 🆕 N8N webhook URL
          enable_product_router: filters.enableProductRouter,   // 🆕 Produktový router
          enable_manual_funnel: filters.enableManualFunnel,     // 🆕 Manuální funnel
          summarize_history: filters.summarizeHistory,           // 🆕 Sumarizace historie
          allowed_product_categories: filters.allowedProductCategories || [],  // 🆕 Povolené produktové kategorie
          group_products_by_category: filters.groupProductsByCategory,          // 🆕 Grupování produktů podle kategorií
        };
        
        
        setChatbotSettings(newSettings);
        
        // Pokud máme nastavení z databáze, použij název z databáze
        const settingsWithDetails = await ChatbotSettingsService.getChatbotSettingsWithDetails(chatbotId);
        if (settingsWithDetails) {
          setChatbotDisplayName(settingsWithDetails.chatbot_name);
        }
        
      } catch (err) {
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
          summarize_history: false,
          allowed_product_categories: [],
          group_products_by_category: false,
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadChatbotSettings();
  }, [chatbotId, chatbotName]);

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
  
  // Funkce pro Nový chat - reload page
  const handleNewChat = () => {
    window.location.reload();
  };
  
  // Funkce pro Export do PDF
  const handleExportPdf = () => {
    alert('Export do PDF bude implementován později');
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
        {/* Header - Jednotná hlavička s filtry v levé části */}
        <ChatHeader
          onClose={onClose}
          languages={languages}
          selectedLanguage={selectedLanguage}
          onLanguageChange={setSelectedLanguage}
          leftContent={
            <div className="flex items-center space-x-4">
              {/* Posuvník pro filtry */}
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
            ...(chatbotSettings.product_recommendations
              ? [
                  {
                    icon: 'product' as const,
                    onClick: toggleProductSync,
                    label: isProductSyncVisible ? 'Skrýt produkty' : 'Spravovat produkty',
                    tooltip: isProductSyncVisible ? 'Skrýt produkty' : 'Spravovat produkty BEWIT',
                    isActive: isProductSyncVisible
                  }
                ]
              : []
            ),
            {
              icon: 'plus' as const,
              onClick: handleNewChat,
              label: 'Nový chat',
              tooltip: 'Nový chat'
            },
            {
              icon: 'download' as const,
              onClick: handleExportPdf,
              label: 'Export do PDF',
              tooltip: 'Export do PDF'
            }
          ]}
        />
        
        {/* Chat komponenta nebo ProductSync */}
        <div className="flex-1 bg-bewit-gray flex flex-col min-h-0">
          {isProductSyncVisible && chatbotSettings.product_recommendations ? (
            <div className="w-full h-full flex-1 overflow-y-auto p-6">
              <ProductSyncAdmin />
            </div>
          ) : (
            <SanaChatContent 
              selectedCategories={selectedCategories}
              selectedLabels={selectedLabels}
              selectedPublicationTypes={selectedPublicationTypes}
              chatbotSettings={chatbotSettings}
              chatbotId={chatbotId}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default FilteredSanaChatWithSettings;
