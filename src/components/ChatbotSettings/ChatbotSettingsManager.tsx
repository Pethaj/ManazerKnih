import React, { useState, useEffect } from 'react';
import { supabase, supabaseUrl, supabaseKey } from '../../lib/supabase';
import { 
  ChatbotSettingsService, 
  ChatbotSettings, 
  Category, 
  PublicationType, 
  Label,
  ProductCategory,
  CreateChatbotSettingsData,
  UpdateChatbotSettingsData
} from '../../services/chatbotSettingsService';

// Ikonky
const EditIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const DeleteIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    <line x1="10" y1="11" x2="10" y2="17"/>
    <line x1="14" y1="11" x2="14" y2="17"/>
  </svg>
);

const AddIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 5v14"/>
    <path d="M5 12h14"/>
  </svg>
);

const SaveIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const CancelIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

// 🆕 Komponenta pro zobrazení denního limitu v přehledu
interface MessageLimitInfoProps {
  chatbotId: string;
}

const MessageLimitInfo: React.FC<MessageLimitInfoProps> = ({ chatbotId }) => {
  const [limitInfo, setLimitInfo] = useState<{
    limit: number | null;
    current: number;
    loading: boolean;
  }>({ limit: null, current: 0, loading: true });

  useEffect(() => {
    const loadLimit = async () => {
      try {
        const response = await fetch(
          `${supabaseUrl}/functions/v1/check-message-limit`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({
              chatbot_id: chatbotId,
              action: 'check'
            })
          }
        );
        
        const data = await response.json();
        
        if (data.chatbot) {
          setLimitInfo({
            limit: data.chatbot.limit,
            current: data.chatbot.current,
            loading: false
          });
        }
      } catch (err) {
        setLimitInfo(prev => ({ ...prev, loading: false }));
      }
    };

    loadLimit();
  }, [chatbotId]);

  if (limitInfo.loading) {
    return (
      <div className="mt-4 pt-4 border-t border-gray-100">
        <span className="text-xs text-gray-500">Načítám limit...</span>
      </div>
    );
  }

  if (limitInfo.limit === null) {
    return (
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center text-sm">
          <span className="font-medium text-gray-700">Denní limit:</span>
          <span className="ml-2 px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
            Bez limitu ∞
          </span>
        </div>
      </div>
    );
  }

  const percentage = Math.round((limitInfo.current / limitInfo.limit) * 100);
  const statusColor = 
    percentage >= 95 ? 'bg-red-100 text-red-800' :
    percentage >= 80 ? 'bg-orange-100 text-orange-800' :
    percentage >= 60 ? 'bg-yellow-100 text-yellow-800' :
    'bg-green-100 text-green-800';

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="font-medium text-gray-700">Denní limit zpráv:</span>
        <span className="text-gray-900 font-semibold">
          {limitInfo.current} / {limitInfo.limit}
        </span>
      </div>
      <div className="flex items-center space-x-2">
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              percentage >= 95 ? 'bg-red-500' :
              percentage >= 80 ? 'bg-orange-500' :
              percentage >= 60 ? 'bg-yellow-500' :
              'bg-green-500'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        <span className={`px-2 py-1 rounded-full text-xs ${statusColor}`}>
          {percentage}%
        </span>
      </div>
    </div>
  );
};

// Komponenta pro editaci/vytvoření nastavení chatbota
interface ChatbotSettingsFormProps {
  chatbotSettings?: ChatbotSettings;
  onSave: (data: CreateChatbotSettingsData | UpdateChatbotSettingsData) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

const ChatbotSettingsForm: React.FC<ChatbotSettingsFormProps> = ({
  chatbotSettings,
  onSave,
  onCancel,
  isLoading
}) => {
  const [formData, setFormData] = useState({
    chatbot_id: chatbotSettings?.chatbot_id || '',
    chatbot_name: chatbotSettings?.chatbot_name || '',
    description: chatbotSettings?.description || '',
    product_recommendations: chatbotSettings?.product_recommendations ?? true,
    book_database: chatbotSettings?.book_database ?? true,
    allowed_categories: chatbotSettings?.allowed_categories || [],
    allowed_publication_types: chatbotSettings?.allowed_publication_types || [],
    allowed_labels: chatbotSettings?.allowed_labels || [],
    is_active: chatbotSettings?.is_active ?? true,
    // 🆕 Nastavení produktového routeru a manuálního funnelu
    enable_product_router: chatbotSettings?.enable_product_router ?? true,
    enable_manual_funnel: chatbotSettings?.enable_manual_funnel ?? false,
    // 🆕 Nastavení sumarizace historie
    summarize_history: chatbotSettings?.summarize_history ?? false,
    // 🆕 Filtrování produktových kategorií
    allowed_product_categories: chatbotSettings?.allowed_product_categories || [],
    // 🆕 Grupování produktů podle kategorií
    group_products_by_category: chatbotSettings?.group_products_by_category ?? false,
    // 🆕 Zobrazování zdrojů
    show_sources: chatbotSettings?.show_sources ?? true,
    // 🆕 Párování kombinací produktů
    enable_product_pairing: chatbotSettings?.enable_product_pairing ?? false,
    enable_product_search: chatbotSettings?.enable_product_search ?? false,
  });

  // 🆕 State pro denní limit zpráv
  const [messageLimitState, setMessageLimitState] = useState({
    daily_limit: null as number | null,
    current_count: 0,
    reset_at: null as string | null,
    loading: false,
    saving: false,
  });

  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
  const [availablePublicationTypes, setAvailablePublicationTypes] = useState<PublicationType[]>([]);
  const [availableLabels, setAvailableLabels] = useState<Label[]>([]);
  const [availableProductCategories, setAvailableProductCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [categories, publicationTypes, labels, productCategories] = await Promise.all([
          ChatbotSettingsService.getCategories(),
          ChatbotSettingsService.getPublicationTypes(),
          ChatbotSettingsService.getLabels(),
          ChatbotSettingsService.getProductCategories(),
        ]);
        setAvailableCategories(categories);
        setAvailablePublicationTypes(publicationTypes);
        setAvailableLabels(labels);
        setAvailableProductCategories(productCategories);
      } catch (err) {
        setError('Nepodařilo se načíst dostupné možnosti');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // 🆕 Načtení aktuálního limitu pro chatbot
  useEffect(() => {
    const loadMessageLimit = async () => {
      if (!chatbotSettings?.chatbot_id) return;
      
      setMessageLimitState(prev => ({ ...prev, loading: true }));
      
      try {
        const response = await fetch(
          `${supabaseUrl}/functions/v1/check-message-limit`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({
              chatbot_id: chatbotSettings.chatbot_id,
              action: 'check'
            })
          }
        );
        
        const data = await response.json();
        
        if (data.chatbot) {
          setMessageLimitState(prev => ({
            ...prev,
            daily_limit: data.chatbot.limit,
            current_count: data.chatbot.current,
            reset_at: data.chatbot.reset_at,
            loading: false
          }));
        }
      } catch (err) {
        setMessageLimitState(prev => ({ ...prev, loading: false }));
      }
    };

    loadMessageLimit();
  }, [chatbotSettings?.chatbot_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.chatbot_id.trim() || !formData.chatbot_name.trim()) {
      setError('ID chatbota a název jsou povinné');
      return;
    }

    try {
      setError(null);
      await onSave(formData);
    } catch (err) {
      setError('Nepodařilo se uložit nastavení');
    }
  };

  // 🆕 Uložení denního limitu zpráv
  const handleSaveMessageLimit = async () => {
    if (!chatbotSettings?.chatbot_id) return;
    
    setMessageLimitState(prev => ({ ...prev, saving: true }));
    
    try {
      // Použij upsert pro vytvoření nebo aktualizaci
      const { error } = await supabase
        .from('message_limits')
        .upsert({
          chatbot_id: chatbotSettings.chatbot_id,
          daily_limit: messageLimitState.daily_limit,
          current_count: messageLimitState.current_count,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'chatbot_id'
        });
      
      if (error) throw error;
      
      alert('✅ Denní limit byl úspěšně uložen');
      
    } catch (err) {
      alert('❌ Nepodařilo se uložit denní limit');
    } finally {
      setMessageLimitState(prev => ({ ...prev, saving: false }));
    }
  };

  const toggleCategory = (categoryId: string) => {
    setFormData(prev => ({
      ...prev,
      allowed_categories: prev.allowed_categories.includes(categoryId)
        ? prev.allowed_categories.filter(id => id !== categoryId)
        : [...prev.allowed_categories, categoryId]
    }));
  };

  const togglePublicationType = (publicationTypeId: string) => {
    setFormData(prev => ({
      ...prev,
      allowed_publication_types: prev.allowed_publication_types.includes(publicationTypeId)
        ? prev.allowed_publication_types.filter(id => id !== publicationTypeId)
        : [...prev.allowed_publication_types, publicationTypeId]
    }));
  };

  const toggleLabel = (labelId: string) => {
    setFormData(prev => ({
      ...prev,
      allowed_labels: prev.allowed_labels.includes(labelId)
        ? prev.allowed_labels.filter(id => id !== labelId)
        : [...prev.allowed_labels, labelId]
    }));
  };

  const toggleProductCategory = (categoryName: string) => {
    setFormData(prev => ({
      ...prev,
      allowed_product_categories: prev.allowed_product_categories.includes(categoryName)
        ? prev.allowed_product_categories.filter(name => name !== categoryName)
        : [...prev.allowed_product_categories, categoryName]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">Načítám data...</div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        {chatbotSettings ? 'Upravit nastavení chatbota' : 'Vytvořit nový chatbot'}
      </h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Základní informace */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ID Chatbota *
            </label>
            <input
              type="text"
              value={formData.chatbot_id}
              onChange={(e) => setFormData(prev => ({ ...prev, chatbot_id: e.target.value }))}
              disabled={!!chatbotSettings} // ID nelze měnit u existujícího chatbota
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              placeholder="např. sana_kancelar"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Název chatbota *
            </label>
            <input
              type="text"
              value={formData.chatbot_name}
              onChange={(e) => setFormData(prev => ({ ...prev, chatbot_name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="např. Sana Kancelář"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Popis
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Krátký popis chatbota a jeho účelu"
          />
        </div>

        {/* Obecná nastavení */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Obecná nastavení</h3>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.product_recommendations}
                onChange={(e) => setFormData(prev => ({ ...prev, product_recommendations: e.target.checked }))}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Povolit produktová doporučení</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.book_database}
                onChange={(e) => setFormData(prev => ({ ...prev, book_database: e.target.checked }))}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Povolit přístup k databázi knih</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.show_sources}
                onChange={(e) => setFormData(prev => ({ ...prev, show_sources: e.target.checked }))}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Zobrazovat zdroje</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Chatbot je aktivní</span>
            </label>
          </div>
        </div>

        {/* 🆕 Nastavení produktového routeru a funnelu */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Produktový funnel</h3>
          <div className="space-y-4">
            <label className="flex items-start">
              <input
                type="checkbox"
                checked={formData.enable_product_router}
                onChange={(e) => setFormData(prev => ({ ...prev, enable_product_router: e.target.checked }))}
                className="mr-2 mt-1"
              />
              <div className="flex flex-col">
                <span className="text-sm text-gray-700 font-medium">Aktivovat produktový router</span>
                <span className="text-xs text-gray-500">
                  Automatické směrování dotazů do produktového funnelu na základě symptomů. 
                  Když je vypnuto, vše jde jako standardní chat.
                </span>
              </div>
            </label>
            <label className="flex items-start">
              <input
                type="checkbox"
                checked={formData.enable_manual_funnel}
                onChange={(e) => setFormData(prev => ({ ...prev, enable_manual_funnel: e.target.checked }))}
                className="mr-2 mt-1"
              />
              <div className="flex flex-col">
                <span className="text-sm text-gray-700 font-medium">Manuální funnel spouštěč</span>
                <span className="text-xs text-gray-500">
                  Místo žlutého calloutu zobrazí tlačítko pro manuální zadání symptomů. 
                  Uživatel sám rozhodne, kdy chce doporučit produkty.
                </span>
              </div>
            </label>
            <label className="flex items-start">
              <input
                type="checkbox"
                checked={formData.summarize_history}
                onChange={(e) => setFormData(prev => ({ ...prev, summarize_history: e.target.checked }))}
                className="mr-2 mt-1"
              />
              <div className="flex flex-col">
                <span className="text-sm text-gray-700 font-medium">Sumarizovat historii</span>
                <span className="text-xs text-gray-500">
                  Automaticky sumarizuje historii konverzace pomocí LLM před odesláním do N8N webhooku. 
                  Snižuje latenci a náklady na tokeny.
                </span>
              </div>
            </label>
            <label className="flex items-start">
              <input
                type="checkbox"
                checked={formData.group_products_by_category}
                onChange={(e) => setFormData(prev => ({ ...prev, group_products_by_category: e.target.checked }))}
                className="mr-2 mt-1"
              />
              <div className="flex flex-col">
                <span className="text-sm text-gray-700 font-medium">Rozdělit produkty podle kategorií</span>
                <span className="text-xs text-gray-500">
                  Tabulka "Súvisející produkty BEWIT" se zobrazí rozdělená na sekce podle kategorií. 
                  Produkty zůstanou v jednom bloku, ale budou vizuálně seskupené.
                </span>
              </div>
            </label>
            <label className="flex items-start">
              <input
                type="checkbox"
                checked={formData.enable_product_pairing}
                onChange={(e) => setFormData(prev => ({ ...prev, enable_product_pairing: e.target.checked }))}
                className="mr-2 mt-1"
              />
              <div className="flex flex-col">
                <span className="text-sm text-gray-700 font-medium">🔗 Párování kombinací produktů</span>
                <span className="text-xs text-gray-500">
                  Automaticky přidá doplňkové produkty (Prawtein, TČM, Aloe, Merkaba) na základě 
                  vybraných produktů podle tabulky léčebných kombinací.
                </span>
              </div>
            </label>
            <label className="flex items-start">
              <input
                type="checkbox"
                checked={formData.enable_product_search}
                onChange={(e) => setFormData(prev => ({ ...prev, enable_product_search: e.target.checked }))}
                className="mr-2 mt-1"
              />
              <div className="flex flex-col">
                <span className="text-sm text-gray-700 font-medium">🔍 Vyhledávač produktů (Feed Agent)</span>
                <span className="text-xs text-gray-500">
                  Povolí přepínač mezi AI chatem a vyhledávačem produktů přímo v chatu.
                  Uživatel si může sám zvolit, zda chce klást otázky AI agentovi nebo hledat produkty.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Kategorie */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Povolené kategorie</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {availableCategories.map((category) => (
              <label key={category.id} className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.allowed_categories.includes(category.id)}
                  onChange={() => toggleCategory(category.id)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">{category.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Typy publikací */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Povolené typy publikací</h3>
          <div className="space-y-3">
            {availablePublicationTypes.map((publicationType) => (
              <label key={publicationType.id} className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.allowed_publication_types.includes(publicationType.id)}
                  onChange={() => togglePublicationType(publicationType.id)}
                  className="mr-2"
                />
                <div className="flex flex-col">
                  <span className="text-sm text-gray-700 font-medium">{publicationType.name}</span>
                  {publicationType.description && (
                    <span className="text-xs text-gray-500">{publicationType.description}</span>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Štítky */}
        {availableLabels.length > 0 && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Povolené štítky</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {availableLabels.map((label) => (
                <label key={label.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.allowed_labels.includes(label.id)}
                    onChange={() => toggleLabel(label.id)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">{label.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* 🆕 Produktové kategorie (Product Pills) */}
        {availableProductCategories.length > 0 && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              🛍️ Produktové kategorie (Product Pills)
            </h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-700">
                Vyberte kategorie z <strong>product_feed_2</strong>, ze kterých mohou pocházet Product Pills. 
                Pokud není vybrána žádná kategorie, produkty z této kategorie se <strong>nebudou zobrazovat</strong> v doporučeních.
                {formData.allowed_product_categories.length === 0 && (
                  <span className="block mt-2 text-amber-700 font-medium">
                    ⚠️ Není vybrána žádná kategorie - všechny kategorie jsou povoleny
                  </span>
                )}
                {formData.allowed_product_categories.length > 0 && (
                  <span className="block mt-2 text-green-700 font-medium">
                    ✅ Vybráno {formData.allowed_product_categories.length} z {availableProductCategories.length} kategorií
                  </span>
                )}
              </p>
            </div>
            
            {/* Tlačítka pro rychlý výběr */}
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setFormData(prev => ({
                  ...prev,
                  allowed_product_categories: availableProductCategories.map(c => c.category)
                }))}
                className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
              >
                ✓ Vybrat vše
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({
                  ...prev,
                  allowed_product_categories: []
                }))}
                className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
              >
                ✗ Zrušit výběr
              </button>
            </div>

            {/* Multi-select seznam kategorií */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-white">
              {availableProductCategories.map((productCategory) => (
                <label 
                  key={productCategory.category} 
                  className="flex items-start hover:bg-gray-50 p-2 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formData.allowed_product_categories.includes(productCategory.category)}
                    onChange={() => toggleProductCategory(productCategory.category)}
                    className="mr-2 mt-1"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-700 font-medium">{productCategory.category}</span>
                    <span className="text-xs text-gray-500">
                      {productCategory.product_count} {productCategory.product_count === 1 ? 'produkt' : 'produktů'}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* 🆕 Denní limit zpráv */}
        {chatbotSettings && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">⏰ Denní limit zpráv</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-gray-700 mb-4">
                Nastavte maximální počet zpráv, které může tento chatbot zpracovat za jeden den. 
                Limit se automaticky resetuje každý den o půlnoci (CET).
              </p>
              
              {messageLimitState.loading ? (
                <div className="text-sm text-gray-600">Načítám aktuální limit...</div>
              ) : (
                <div className="space-y-4">
                  {/* Input pro nastavení limitu */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximální počet zpráv za den
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="number"
                        min="0"
                        placeholder="Např. 5000 (prázdné = bez limitu)"
                        value={messageLimitState.daily_limit || ''}
                        onChange={(e) => setMessageLimitState(prev => ({
                          ...prev,
                          daily_limit: e.target.value ? parseInt(e.target.value) : null
                        }))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={handleSaveMessageLimit}
                        disabled={messageLimitState.saving}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                      >
                        {messageLimitState.saving ? 'Ukládám...' : 'Uložit limit'}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Ponechte prázdné pro neomezený počet zpráv
                    </p>
                  </div>

                  {/* Aktuální stav */}
                  {messageLimitState.daily_limit !== null && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">Aktuální využití:</span>
                        <span className="text-lg font-bold text-gray-900">
                          {messageLimitState.current_count} / {messageLimitState.daily_limit || '∞'}
                        </span>
                      </div>
                      
                      {/* Progress bar */}
                      {messageLimitState.daily_limit && (
                        <>
                          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                (messageLimitState.current_count / messageLimitState.daily_limit) >= 0.95 ? 'bg-red-500' :
                                (messageLimitState.current_count / messageLimitState.daily_limit) >= 0.80 ? 'bg-orange-500' :
                                (messageLimitState.current_count / messageLimitState.daily_limit) >= 0.60 ? 'bg-yellow-500' :
                                'bg-green-500'
                              }`}
                              style={{ 
                                width: `${Math.min((messageLimitState.current_count / messageLimitState.daily_limit) * 100, 100)}%` 
                              }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>{Math.round((messageLimitState.current_count / messageLimitState.daily_limit) * 100)}% využito</span>
                            {messageLimitState.reset_at && (
                              <span>Reset: {new Date(messageLimitState.reset_at).toLocaleString('cs-CZ')}</span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Info pokud není limit */}
                  {messageLimitState.daily_limit === null && (
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <p className="text-sm text-gray-600">
                        ℹ️ Tento chatbot nemá nastaven žádný denní limit zpráv.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tlačítka */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center"
          >
            <CancelIcon className="mr-2" />
            Zrušit
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center"
          >
            <SaveIcon className="mr-2" />
            {isLoading ? 'Ukládám...' : 'Uložit'}
          </button>
        </div>
      </form>
    </div>
  );
};

// Hlavní komponenta pro správu chatbotů
const ChatbotSettingsManager: React.FC = () => {
  const [chatbotSettings, setChatbotSettings] = useState<ChatbotSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingChatbot, setEditingChatbot] = useState<ChatbotSettings | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadChatbotSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const settings = await ChatbotSettingsService.getAllChatbotSettings();
      setChatbotSettings(settings);
    } catch (err) {
      setError('Nepodařilo se načíst nastavení chatbotů');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChatbotSettings();
  }, []);

  const handleCreate = async (data: CreateChatbotSettingsData) => {
    setActionLoading(true);
    try {
      await ChatbotSettingsService.createChatbotSettings(data);
      await loadChatbotSettings();
      setIsCreating(false);
    } catch (err) {
      throw err; // Předá chybu zpět do formuláře
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdate = async (data: UpdateChatbotSettingsData) => {
    if (!editingChatbot) return;
    
    setActionLoading(true);
    try {
      await ChatbotSettingsService.updateChatbotSettings(editingChatbot.chatbot_id, data);
      await loadChatbotSettings();
      setEditingChatbot(null);
    } catch (err) {
      throw err; // Předá chybu zpět do formuláře
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (chatbotId: string) => {
    if (!confirm('Opravdu chcete smazat nastavení tohoto chatbota?')) {
      return;
    }

    try {
      await ChatbotSettingsService.deleteChatbotSettings(chatbotId);
      await loadChatbotSettings();
    } catch (err) {
      setError('Nepodařilo se smazat nastavení chatbota');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">Načítám nastavení chatbotů...</div>
      </div>
    );
  }

  if (editingChatbot || isCreating) {
    return (
      <ChatbotSettingsForm
        chatbotSettings={editingChatbot || undefined}
        onSave={editingChatbot ? handleUpdate : handleCreate}
        onCancel={() => {
          setEditingChatbot(null);
          setIsCreating(false);
        }}
        isLoading={actionLoading}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Správa nastavení chatbotů</h1>
        <button
          onClick={() => setIsCreating(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
        >
          <AddIcon className="mr-2" />
          Přidat chatbot
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid gap-6">
        {chatbotSettings.map((chatbot) => (
          <div key={chatbot.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-800">{chatbot.chatbot_name}</h3>
                <p className="text-sm text-gray-600">ID: {chatbot.chatbot_id}</p>
                {chatbot.description && (
                  <p className="text-gray-600 mt-2">{chatbot.description}</p>
                )}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setEditingChatbot(chatbot)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"
                  title="Upravit"
                >
                  <EditIcon />
                </button>
                <button
                  onClick={() => handleDelete(chatbot.chatbot_id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                  title="Smazat"
                >
                  <DeleteIcon />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Status:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                  chatbot.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {chatbot.is_active ? 'Aktivní' : 'Neaktivní'}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Doporučení:</span>
                <span className="ml-2">{chatbot.product_recommendations ? 'Ano' : 'Ne'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Knihy:</span>
                <span className="ml-2">{chatbot.book_database ? 'Ano' : 'Ne'}</span>
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-600">
              <div>Kategorie: {chatbot.allowed_categories.length} povolených</div>
              <div>Typy publikací: {chatbot.allowed_publication_types.length} povolených</div>
              <div>Štítky: {chatbot.allowed_labels.length} povolených</div>
              <div className="flex items-center">
                <span>Produktové kategorie:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                  (chatbot.allowed_product_categories?.length || 0) === 0
                    ? 'bg-amber-100 text-amber-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {(chatbot.allowed_product_categories?.length || 0) === 0 
                    ? 'Všechny povoleny' 
                    : `${chatbot.allowed_product_categories?.length} vybraných`}
                </span>
              </div>
            </div>

            {/* 🆕 Nastavení produktového routeru, funnelu a sumarizace */}
            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center">
                <span className="font-medium text-gray-700">Produktový router:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                  chatbot.enable_product_router !== false
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {chatbot.enable_product_router !== false ? 'Aktivní' : 'Vypnuto'}
                </span>
              </div>
              <div className="flex items-center">
                <span className="font-medium text-gray-700">Manuální funnel:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                  chatbot.enable_manual_funnel === true
                    ? 'bg-amber-100 text-amber-800' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {chatbot.enable_manual_funnel === true ? 'Aktivní' : 'Vypnuto'}
                </span>
              </div>
              <div className="flex items-center">
                <span className="font-medium text-gray-700">Sumarizace:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                  chatbot.summarize_history === true
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {chatbot.summarize_history === true ? 'Aktivní' : 'Vypnuto'}
                </span>
              </div>
              <div className="flex items-center">
                <span className="font-medium text-gray-700">Grupování produktů:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                  chatbot.group_products_by_category === true
                    ? 'bg-purple-100 text-purple-800' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {chatbot.group_products_by_category === true ? 'Podle kategorií' : 'Standardní'}
                </span>
              </div>
              <div className="flex items-center">
                <span className="font-medium text-gray-700">Zobrazování zdrojů:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                  chatbot.show_sources !== false
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {chatbot.show_sources !== false ? 'Zapnuto' : 'Vypnuto'}
                </span>
              </div>
              <div className="flex items-center">
                <span className="font-medium text-gray-700">Párování kombinací:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                  chatbot.enable_product_pairing === true
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {chatbot.enable_product_pairing === true ? '🔗 Aktivní' : 'Vypnuto'}
                </span>
              </div>
              <div className="flex items-center">
                <span className="font-medium text-gray-700">Vyhledávač produktů:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                  chatbot.enable_product_search === true
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {chatbot.enable_product_search === true ? '🔍 Aktivní' : 'Vypnuto'}
                </span>
              </div>
            </div>

            {/* 🆕 Denní limit zpráv - info v přehledu */}
            <MessageLimitInfo chatbotId={chatbot.chatbot_id} />
          </div>
        ))}

        {chatbotSettings.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Žádné nastavení chatbotů nebylo nalezeno.
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatbotSettingsManager;
