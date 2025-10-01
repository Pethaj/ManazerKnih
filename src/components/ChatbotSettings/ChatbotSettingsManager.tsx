import React, { useState, useEffect } from 'react';
import { 
  ChatbotSettingsService, 
  ChatbotSettings, 
  Category, 
  PublicationType, 
  Label,
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
  });

  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
  const [availablePublicationTypes, setAvailablePublicationTypes] = useState<PublicationType[]>([]);
  const [availableLabels, setAvailableLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [categories, publicationTypes, labels] = await Promise.all([
          ChatbotSettingsService.getCategories(),
          ChatbotSettingsService.getPublicationTypes(),
          ChatbotSettingsService.getLabels(),
        ]);
        setAvailableCategories(categories);
        setAvailablePublicationTypes(publicationTypes);
        setAvailableLabels(labels);
      } catch (err) {
        setError('Nepodařilo se načíst dostupné možnosti');
        console.error('Chyba při načítání dat:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

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
      console.error('Chyba při ukládání:', err);
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
                checked={formData.is_active}
                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Chatbot je aktivní</span>
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
      console.error('Chyba při načítání nastavení chatbotů:', err);
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
      console.error('Chyba při mazání chatbota:', err);
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
            </div>
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
