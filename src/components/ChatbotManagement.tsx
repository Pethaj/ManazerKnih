import React, { useState, useEffect } from 'react';
import { ProductEmbeddingManager } from './ProductEmbeddingManager';
import { ProductEmbeddingManagerFeed2 } from './ProductEmbeddingManagerFeed2';
import ProductSyncAdmin from './SanaChat/ProductSync';
import ProductChat from './ProductChat';
import { 
  ChatbotSettingsService, 
  ChatbotSettings, 
  Category, 
  PublicationType, 
  CreateChatbotSettingsData,
  UpdateChatbotSettingsData 
} from '../services/chatbotSettingsService';

// Ikony
const IconChatbot = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z"></path>
        <circle cx="9" cy="10" r="1"></circle>
        <circle cx="15" cy="10" r="1"></circle>
    </svg>
);

const IconProduct = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 7h-9"></path>
        <path d="M14 17H5"></path>
        <circle cx="17" cy="17" r="3"></circle>
        <circle cx="7" cy="7" r="3"></circle>
    </svg>
);

const IconSettings = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
);

const IconClose = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);

const IconBook = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
    </svg>
);

const IconFilter = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
    </svg>
);

const IconAdd = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
);

const IconSave = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
);

interface Chatbot {
    id: string;
    name: string;
    description: string;
    url: string;
    features: {
        product_recommendations: boolean;
        book_database: boolean;
    };
}

interface ChatbotManagementProps {
    onClose: () => void;
    onOpenChat?: (chatbotId: string, features: Chatbot['features']) => void;
}

export const ChatbotManagement: React.FC<ChatbotManagementProps> = ({ onClose, onOpenChat }) => {
    const [selectedTab, setSelectedTab] = useState<'chatbots' | 'product_feed' | 'settings'>('chatbots');
    
    // Nové state pro správu chatbotů z databáze
    const [chatbotSettings, setChatbotSettings] = useState<ChatbotSettings[]>([]);
    const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
    const [availablePublicationTypes, setAvailablePublicationTypes] = useState<PublicationType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [savingChatbotId, setSavingChatbotId] = useState<string | null>(null);
    const [unsavedChanges, setUnsavedChanges] = useState<Set<string>>(new Set());
    const [tempSettings, setTempSettings] = useState<{ [key: string]: Partial<ChatbotSettings> }>({});
    
    // Starý state pro kompatibilitu (bude postupně odstraněn)
    const [chatbots, setChatbots] = useState<Chatbot[]>([
        {
            id: 'sana_medbase',
            name: 'Sana MedBase',
            description: 'AI asistent pro správu a vyhledávání v knihovně lékařské literatury',
            url: 'https://bewit.love/sana-chat',
            features: {
                product_recommendations: false,
                book_database: true,
            }
        },
        {
            id: 'sana_kancelar',
            name: 'Sana Kancelář',
            description: 'AI asistent pro interní firemní dokumenty a procesy',
            url: 'https://bewit.love/sana-kancelar',
            features: {
                product_recommendations: false,
                book_database: false,
            }
        }
    ]);
    const [showProductEmbeddings, setShowProductEmbeddings] = useState(false);
    const [showProductEmbeddingsFeed2, setShowProductEmbeddingsFeed2] = useState(false);
    const [showProductChat, setShowProductChat] = useState(false);

    // Načti data z databáze při startu komponenty
    useEffect(() => {
        const loadChatbotData = async () => {
            try {
                setLoading(true);
                setError(null);
                
                console.log('🔄 Načítám data chatbotů z databáze...');
                
                // Zkontrolujeme, zda tabulka existuje (volitelně, protože už víme že existuje)
                console.log('📋 Tabulka chatbot_settings existuje v databázi');
                
                const [settings, categories, publicationTypes] = await Promise.all([
                    ChatbotSettingsService.getAllChatbotSettings(),
                    ChatbotSettingsService.getCategories(),
                    ChatbotSettingsService.getPublicationTypes(),
                ]);
                
                console.log('📊 Načtená data:', {
                    settings: settings.length,
                    categories: categories.length,
                    publicationTypes: publicationTypes.length
                });
                
                if (settings.length === 0) {
                    setError('V databázi nejsou žádné chatboti. Spusťte SQL script create_chatbot_settings_table.sql pro vytvoření výchozích chatbotů.');
                    return;
                }
                
                console.log('🤖 Existující chatboti v databázi:');
                settings.forEach(chatbot => {
                    console.log(`- ID: "${chatbot.chatbot_id}", Název: "${chatbot.chatbot_name}"`);
                });
                
                setChatbotSettings(settings);
                setAvailableCategories(categories);
                setAvailablePublicationTypes(publicationTypes);
                
            } catch (err) {
                console.error('❌ Chyba při načítání dat chatbotů:', err);
                setError(`Nepodařilo se načíst data chatbotů z databáze: ${err instanceof Error ? err.message : 'Neznámá chyba'}`);
            } finally {
                setLoading(false);
            }
        };

        loadChatbotData();
    }, []);

    // Funkce pro lokální změny (bez okamžitého ukládání)
    const updateLocalSettings = (chatbotId: string, updates: Partial<ChatbotSettings>) => {
        // Aktualizuj lokální state
        setChatbotSettings(prev => prev.map(chatbot =>
            chatbot.chatbot_id === chatbotId
                ? { ...chatbot, ...updates }
                : chatbot
        ));

        // Zaznamenej změny pro tlačítko "Uložit"
        setUnsavedChanges(prev => new Set(prev).add(chatbotId));
        setTempSettings(prev => ({
            ...prev,
            [chatbotId]: { ...prev[chatbotId], ...updates }
        }));
    };

    // Funkce pro toggle kategorie u konkrétního chatbota
    const toggleChatbotCategory = (chatbotId: string, categoryId: string) => {
        const chatbot = chatbotSettings.find(c => c.chatbot_id === chatbotId);
        if (!chatbot) return;

        const updatedCategories = chatbot.allowed_categories.includes(categoryId)
            ? chatbot.allowed_categories.filter(id => id !== categoryId)
            : [...chatbot.allowed_categories, categoryId];

        updateLocalSettings(chatbotId, { allowed_categories: updatedCategories });
    };

    // Funkce pro toggle typu publikace u konkrétního chatbota
    const toggleChatbotPublicationType = (chatbotId: string, publicationTypeId: string) => {
        const chatbot = chatbotSettings.find(c => c.chatbot_id === chatbotId);
        if (!chatbot) return;

        const updatedTypes = chatbot.allowed_publication_types.includes(publicationTypeId)
            ? chatbot.allowed_publication_types.filter(id => id !== publicationTypeId)
            : [...chatbot.allowed_publication_types, publicationTypeId];

        updateLocalSettings(chatbotId, { allowed_publication_types: updatedTypes });
    };

    // Funkce pro toggle funkcí chatbota s logikou závislostí
    const toggleChatbotFunction = (chatbotId: string, feature: 'product_recommendations' | 'book_database') => {
        const chatbot = chatbotSettings.find(c => c.chatbot_id === chatbotId);
        if (!chatbot) return;

        const updatedValue = !chatbot[feature];
        let updates: Partial<ChatbotSettings> = { [feature]: updatedValue };

        // Pokud se vypíná databáze knih, vypni také všechny filtrace
        if (feature === 'book_database' && !updatedValue) {
            console.log('📚 Vypínám databázi knih - resetuji také všechny filtrace');
            updates = {
                ...updates,
                allowed_categories: [],
                allowed_publication_types: []
            };
        }

        updateLocalSettings(chatbotId, updates);
    };

    // Funkce pro uložení všech změn konkrétního chatbota
    const saveChatbotSettings = async (chatbotId: string) => {
        const changes = tempSettings[chatbotId];
        if (!changes) return;

        try {
            setSavingChatbotId(chatbotId);
            setError(null);
            
            console.log(`💾 Ukládám nastavení pro chatbota ${chatbotId}:`, changes);
            
            await ChatbotSettingsService.updateChatbotSettings(chatbotId, changes);
            
            // Odstraň ze seznamu neuložených změn
            setUnsavedChanges(prev => {
                const newSet = new Set(prev);
                newSet.delete(chatbotId);
                return newSet;
            });
            
            // Vyčisti dočasné nastavení
            setTempSettings(prev => {
                const newTemp = { ...prev };
                delete newTemp[chatbotId];
                return newTemp;
            });
            
            console.log('✅ Nastavení úspěšně uloženo');
            
        } catch (err) {
            console.error('❌ Chyba při ukládání nastavení:', err);
            setError(err instanceof Error ? err.message : 'Nepodařilo se uložit nastavení chatbota');
        } finally {
            setSavingChatbotId(null);
        }
    };

    // Funkce pro resetování změn konkrétního chatbota
    const resetChatbotSettings = async (chatbotId: string) => {
        // Znovu načti původní data z databáze
        try {
            const originalSettings = await ChatbotSettingsService.getChatbotSettings(chatbotId);
            if (!originalSettings) return;

            // Aktualizuj lokální state na původní hodnoty
            setChatbotSettings(prev => prev.map(chatbot =>
                chatbot.chatbot_id === chatbotId
                    ? originalSettings
                    : chatbot
            ));

            // Odstraň ze seznamu neuložených změn
            setUnsavedChanges(prev => {
                const newSet = new Set(prev);
                newSet.delete(chatbotId);
                return newSet;
            });
            
            // Vyčisti dočasné nastavení
            setTempSettings(prev => {
                const newTemp = { ...prev };
                delete newTemp[chatbotId];
                return newTemp;
            });
            
            console.log('🔄 Nastavení resetováno na původní hodnoty');
            
        } catch (err) {
            console.error('❌ Chyba při resetování nastavení:', err);
            setError('Nepodařilo se resetovat nastavení chatbota');
        }
    };

    const toggleChatbotFeature = (chatbotId: string, feature: keyof Chatbot['features']) => {
        setChatbots(prev => prev.map(chatbot =>
            chatbot.id === chatbotId
                ? { ...chatbot, features: { ...chatbot.features, [feature]: !chatbot.features[feature] } }
                : chatbot
        ));
    };

    const openChatWithSettings = (chatbot: Chatbot) => {
        console.log(`🚀 Spouštím chat "${chatbot.name}" s nastavením:`, chatbot.features);
        
        // Zobrazíme informaci o konfiguraci
        const enabledFeatures = [];
        if (chatbot.features.product_recommendations) enabledFeatures.push("Produktová doporučení");
        if (chatbot.features.book_database) enabledFeatures.push("Databáze knih");
        
        const featuresText = enabledFeatures.length > 0 
            ? enabledFeatures.join(" + ") 
            : "Žádné funkce nejsou povoleny";
            
        console.log(`💬 Otevírám chat s nastavením: ${featuresText}`);
        
        // Zavřeme správu chatbotů a otevřeme chat
        onClose();
        
        // Pokud máme callback, zavoláme ho
        if (onOpenChat) {
            onOpenChat(chatbot.id, chatbot.features);
        } else {
            // Fallback - zobrazíme alert s informacemi
            alert(`🤖 ${chatbot.name}\n\n✅ Aktivní funkce: ${featuresText}\n\n⚠️ Poznámka: Nastavení se zatím neukládají a po obnovení stránky se resetují.`);
        }
    };

    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                <div style={styles.header}>
                    <h2 style={styles.title}>🤖 Správa chatbotů</h2>
                    <button style={styles.closeButton} onClick={onClose}>
                        <IconClose />
                    </button>
                </div>

                <div style={styles.tabs}>
                    <button
                        style={{ ...styles.tabButton, ...(selectedTab === 'chatbots' && styles.tabButtonActive) }}
                        onClick={() => setSelectedTab('chatbots')}
                    >
                        <IconChatbot />
                        Chatboty
                    </button>
                    <button
                        style={{ ...styles.tabButton, ...(selectedTab === 'product_feed' && styles.tabButtonActive) }}
                        onClick={() => setSelectedTab('product_feed')}
                    >
                        <IconProduct />
                        Produktový feed
                    </button>
                    <button
                        style={{ ...styles.tabButton, ...(selectedTab === 'settings' && styles.tabButtonActive) }}
                        onClick={() => setSelectedTab('settings')}
                    >
                        <IconSettings />
                        Nastavení
                    </button>
                </div>

                <div style={styles.content}>
                    {selectedTab === 'chatbots' && (
                        <div style={styles.tabContent}>
                            <h3 style={styles.sectionTitle}>Konfigurace chatbotů</h3>
                            <p style={styles.sectionDescription}>
                                Nastavte funkce a filtrace pro jednotlivé chatboty. Všechna nastavení se automaticky ukládají do databáze.
                            </p>
                            
                            {error && (
                                <div style={styles.errorMessage}>
                                    ❌ {error}
                                </div>
                            )}
                            
                            {loading ? (
                                <div style={styles.loadingMessage}>
                                    🔄 Načítám nastavení chatbotů...
                                </div>
                            ) : (
                                <div style={styles.chatbotGrid}>
                                    {chatbotSettings.map(chatbot => (
                                        <div key={chatbot.id} style={styles.chatbotCard}>
                                            <div style={styles.chatbotHeader}>
                                                <div style={styles.chatbotIconName}>
                                                    <IconChatbot />
                                                    <h3 style={styles.chatbotName}>{chatbot.chatbot_name}</h3>
                                                    {savingChatbotId === chatbot.chatbot_id && (
                                                        <span style={styles.savingIndicator}>💾 Ukládám...</span>
                                                    )}
                                                    {unsavedChanges.has(chatbot.chatbot_id) && (
                                                        <span style={styles.unsavedIndicator}>● Neuložené změny</span>
                                                    )}
                                                </div>
                                                <div style={{
                                                    ...styles.statusBadge,
                                                    backgroundColor: chatbot.is_active ? '#28a745' : '#dc3545'
                                                }}>
                                                    {chatbot.is_active ? 'Aktivní' : 'Neaktivní'}
                                                </div>
                                            </div>
                                            
                                            <p style={styles.chatbotDescription}>{chatbot.description || 'Bez popisu'}</p>
                                            <div style={styles.chatbotId}>ID: {chatbot.chatbot_id}</div>
                                            
                                            {/* Základní funkce */}
                                            <div style={styles.chatbotSettings}>
                                                <h4 style={styles.sectionSubtitle}>🔧 Základní funkce</h4>
                                                
                                                <div style={styles.settingRow}>
                                                    <label style={styles.settingLabel}>
                                                        <input
                                                            type="checkbox"
                                                            checked={chatbot.product_recommendations}
                                                            onChange={() => toggleChatbotFunction(chatbot.chatbot_id, 'product_recommendations')}
                                                            style={styles.checkbox}
                                                        />
                                                        <IconProduct />
                                                        Produktová doporučení
                                                    </label>
                                                    <div style={styles.settingDescription}>
                                                        Zobrazovat relevantní produkty na základě uživatelských dotazů
                                                    </div>
                                                </div>
                                                
                                                <div style={styles.settingRow}>
                                                    <label style={styles.settingLabel}>
                                                        <input
                                                            type="checkbox"
                                                            checked={chatbot.book_database}
                                                            onChange={() => toggleChatbotFunction(chatbot.chatbot_id, 'book_database')}
                                                            style={styles.checkbox}
                                                        />
                                                        <IconBook />
                                                        Databáze knih
                                                    </label>
                                                    <div style={styles.settingDescription}>
                                                        Vyhledávat v databázi lékařské literatury a dokumentů
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Filtrace kategorií - pouze pokud je povolena databáze knih */}
                                            <div style={styles.filterSection}>
                                                <h4 style={styles.sectionSubtitle}>
                                                    <IconFilter />
                                                    Povolené kategorie ({chatbot.allowed_categories.length}/{availableCategories.length})
                                                    {!chatbot.book_database && (
                                                        <span style={styles.disabledLabel}> (pouze s databází knih)</span>
                                                    )}
                                                </h4>
                                                {!chatbot.book_database ? (
                                                    <div style={styles.disabledSection}>
                                                        <p style={styles.disabledText}>
                                                            📚 Filtrace kategorií je dostupná pouze když je povolena databáze knih.
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div style={styles.filterGrid}>
                                                        {availableCategories.map(category => (
                                                            <label key={category.id} style={styles.filterItem}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={chatbot.allowed_categories.includes(category.id)}
                                                                    onChange={() => toggleChatbotCategory(chatbot.chatbot_id, category.id)}
                                                                    style={styles.checkbox}
                                                                />
                                                                <span style={styles.filterLabel}>{category.name}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Filtrace typů publikací - pouze pokud je povolena databáze knih */}
                                            <div style={styles.filterSection}>
                                                <h4 style={styles.sectionSubtitle}>
                                                    <IconFilter />
                                                    Povolené typy publikací ({chatbot.allowed_publication_types.length}/{availablePublicationTypes.length})
                                                    {!chatbot.book_database && (
                                                        <span style={styles.disabledLabel}> (pouze s databází knih)</span>
                                                    )}
                                                </h4>
                                                {!chatbot.book_database ? (
                                                    <div style={styles.disabledSection}>
                                                        <p style={styles.disabledText}>
                                                            📄 Filtrace typů publikací je dostupná pouze když je povolena databáze knih.
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div style={styles.filterGrid}>
                                                        {availablePublicationTypes.map(publicationType => (
                                                            <label key={publicationType.id} style={styles.filterItemLarge}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={chatbot.allowed_publication_types.includes(publicationType.id)}
                                                                    onChange={() => toggleChatbotPublicationType(chatbot.chatbot_id, publicationType.id)}
                                                                    style={styles.checkbox}
                                                                />
                                                                <div>
                                                                    <div style={styles.filterLabel}>{publicationType.name}</div>
                                                                    {publicationType.description && (
                                                                        <div style={styles.filterDescription}>{publicationType.description}</div>
                                                                    )}
                                                                </div>
                                                            </label>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Tlačítka pro správu nastavení */}
                                            {unsavedChanges.has(chatbot.chatbot_id) && (
                                                <div style={styles.settingsActions}>
                                                    <button
                                                        style={styles.saveButton}
                                                        onClick={() => saveChatbotSettings(chatbot.chatbot_id)}
                                                        disabled={savingChatbotId === chatbot.chatbot_id}
                                                    >
                                                        <IconSave />
                                                        {savingChatbotId === chatbot.chatbot_id ? 'Ukládám...' : 'Uložit nastavení'}
                                                    </button>
                                                    <button
                                                        style={styles.resetButton}
                                                        onClick={() => resetChatbotSettings(chatbot.chatbot_id)}
                                                        disabled={savingChatbotId === chatbot.chatbot_id}
                                                    >
                                                        Zrušit změny
                                                    </button>
                                                </div>
                                            )}

                                            {/* Tlačítko pro spuštění chatu */}
                                            <div style={styles.testChatSection}>
                                                {chatbot.chatbot_id === 'product_chat' ? (
                                                    <>
                                                        <button
                                                            style={{
                                                                ...styles.testChatButton,
                                                                backgroundColor: '#28a745',
                                                                borderColor: '#28a745'
                                                            }}
                                                            onClick={() => setShowProductChat(true)}
                                                        >
                                                            💬 Otevřít Product Chat
                                                        </button>
                                                        <div style={styles.testChatDescription}>
                                                            Produktový chat s personalizovanými doporučeními přes N8N webhook
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            style={styles.testChatButton}
                                                            onClick={() => openChatWithSettings({
                                                                id: chatbot.chatbot_id,
                                                                name: chatbot.chatbot_name,
                                                                description: chatbot.description || '',
                                                                url: '',
                                                                features: {
                                                                    product_recommendations: chatbot.product_recommendations,
                                                                    book_database: chatbot.book_database
                                                                }
                                                            })}
                                                        >
                                                            💬 Spustit chat s nastavením
                                                        </button>
                                                        <div style={styles.testChatDescription}>
                                                            Chat bude používat pouze zaškrtnuté kategorie a typy publikací
                                                            {unsavedChanges.has(chatbot.chatbot_id) && (
                                                                <span style={{ color: '#dc3545' }}> (⚠️ Neuložené změny se neprojeví)</span>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {chatbotSettings.length === 0 && (
                                        <div style={styles.emptyChatbots}>
                                            <h4>Žádné chatboty nenalezeny</h4>
                                            <p>Spusťte SQL script create_chatbot_settings_table.sql pro vytvoření výchozích chatbotů.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {selectedTab === 'product_feed' && (
                        <div style={styles.tabContent}>
                            <h3 style={styles.sectionTitle}>Produktový feed a embeddingy</h3>
                            <p style={styles.sectionDescription}>
                                Globální správa produktového feedu a AI embeddingů pro všechny chatboty
                            </p>
                            
                            <div style={styles.productActions}>
                                <div style={styles.actionCard}>
                                    <h4>Synchronizace feedu</h4>
                                    <p>Automatická aktualizace produktových dat z externí XML feed</p>
                                    <ProductSyncAdmin />
                                </div>
                                
                                <div style={styles.actionCard}>
                                    <h4>AI Embeddingy</h4>
                                    <p>Vygenerujte embeddingy pro vylepšená produktová doporučení</p>
                                    <button
                                        style={styles.primaryButton}
                                        onClick={() => setShowProductEmbeddings(true)}
                                    >
                                        📋 Spravovat Embeddingy
                                    </button>
                                </div>
                                
                                <div style={styles.actionCard}>
                                    <h4>AI Embeddingy Pro Feed 2</h4>
                                    <p>Vygenerujte embeddingy pro vylepšená produktová doporučení z Feed 2</p>
                                    <button
                                        style={styles.primaryButton}
                                        onClick={() => setShowProductEmbeddingsFeed2(true)}
                                    >
                                        📋 Spravovat Embeddingy Pro Feed 2
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {selectedTab === 'settings' && (
                        <div style={styles.tabContent}>
                            <h3 style={styles.sectionTitle}>Obecné nastavení</h3>
                            <p style={styles.sectionDescription}>
                                Budoucí globální nastavení aplikace
                            </p>
                            
                            <div style={styles.settingsGrid}>
                                <div style={styles.settingCard}>
                                    <h4>🔒 Bezpečnost</h4>
                                    <p>Správa API klíčů a autentifikace</p>
                                    <button style={styles.secondaryButton}>Připravuje se...</button>
                                </div>
                                
                                <div style={styles.settingCard}>
                                    <h4>📊 Analytika</h4>
                                    <p>Sledování využití a výkonu chatbotů</p>
                                    <button style={styles.secondaryButton}>Připravuje se...</button>
                                </div>
                                
                                <div style={styles.settingCard}>
                                    <h4>🔔 Notifikace</h4>
                                    <p>Upozornění na aktualizace a chyby</p>
                                    <button style={styles.secondaryButton}>Připravuje se...</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {showProductEmbeddings && (
                    <ProductEmbeddingManager onClose={() => setShowProductEmbeddings(false)} />
                )}
                
                {showProductEmbeddingsFeed2 && (
                    <ProductEmbeddingManagerFeed2 onClose={() => setShowProductEmbeddingsFeed2(false)} />
                )}
                
                {showProductChat && (
                    <div style={styles.overlay}>
                        <div style={{
                            ...styles.container,
                            width: '95vw',
                            height: '90vh',
                            maxWidth: '1400px',
                            padding: 0,
                            display: 'flex',
                            flexDirection: 'column'
                        }}>
                            <ProductChat onClose={() => setShowProductChat(false)} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Styly
const styles: { [key: string]: React.CSSProperties } = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        padding: '20px',
    },

    modal: {
        backgroundColor: 'white',
        borderRadius: '12px',
        width: '95%',
        maxWidth: '1200px',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    },

    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 24px',
        borderBottom: '1px solid #e0e0e0',
        backgroundColor: '#f8f9fa',
    },

    title: {
        margin: 0,
        fontSize: '24px',
        fontWeight: '600',
        color: '#333',
    },

    closeButton: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '8px',
        borderRadius: '4px',
        color: '#666',
        transition: 'all 0.2s',
    },

    tabs: {
        display: 'flex',
        borderBottom: '1px solid #e0e0e0',
        backgroundColor: '#f8f9fa',
    },

    tabButton: {
        backgroundColor: 'transparent',
        border: 'none',
        padding: '16px 24px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
        fontWeight: '500',
        color: '#666',
        borderBottom: '3px solid transparent',
        transition: 'all 0.2s',
    },

    tabButtonActive: {
        color: '#007bff',
        borderBottom: '3px solid #007bff',
        backgroundColor: 'white',
    },

    content: {
        flex: 1,
        overflow: 'auto',
        padding: '24px',
    },

    tabContent: {
        maxWidth: '100%',
    },

    sectionTitle: {
        fontSize: '20px',
        fontWeight: '600',
        color: '#333',
        marginBottom: '8px',
    },

    sectionDescription: {
        fontSize: '14px',
        color: '#666',
        marginBottom: '24px',
        lineHeight: '1.5',
    },

    chatbotGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '20px',
    },

    chatbotCard: {
        border: '1px solid #e0e0e0',
        borderRadius: '12px',
        padding: '20px',
        backgroundColor: '#f8f9fa',
    },

    chatbotHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
    },

    chatbotIconName: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },

    chatbotName: {
        margin: 0,
        fontSize: '18px',
        fontWeight: '600',
        color: '#333',
    },

    chatbotDescription: {
        fontSize: '14px',
        color: '#666',
        lineHeight: '1.4',
        marginBottom: '8px',
    },

    chatbotUrl: {
        fontSize: '12px',
        color: '#007bff',
        fontFamily: 'monospace',
        marginBottom: '16px',
    },

    chatbotSettings: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        paddingTop: '16px',
        borderTop: '1px solid #e0e0e0',
    },

    settingRow: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },

    settingLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
        fontWeight: '500',
        color: '#333',
        cursor: 'pointer',
    },

    settingDescription: {
        fontSize: '12px',
        color: '#666',
        paddingLeft: '24px',
    },

    checkbox: {
        cursor: 'pointer',
    },

    productActions: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '20px',
    },

    actionCard: {
        border: '1px solid #e0e0e0',
        borderRadius: '12px',
        padding: '20px',
        backgroundColor: '#f8f9fa',
    },

    primaryButton: {
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        padding: '12px 16px',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        marginTop: '12px',
        transition: 'all 0.2s',
    },

    secondaryButton: {
        backgroundColor: '#6c757d',
        color: 'white',
        border: 'none',
        padding: '8px 12px',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '12px',
        marginTop: '8px',
        transition: 'all 0.2s',
    },

    settingsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '16px',
    },

    settingCard: {
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '16px',
        backgroundColor: '#f8f9fa',
        textAlign: 'center' as const,
    },

    testChatSection: {
        marginTop: '16px',
        paddingTop: '16px',
        borderTop: '1px solid #e0e0e0',
        textAlign: 'center' as const,
    },

    testChatButton: {
        backgroundColor: '#28a745',
        color: 'white',
        border: 'none',
        padding: '12px 20px',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '600',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        margin: '0 auto',
        boxShadow: '0 2px 4px rgba(40, 167, 69, 0.2)',
    },

    testChatDescription: {
        fontSize: '12px',
        color: '#666',
        marginTop: '8px',
        fontStyle: 'italic',
    },

    // Nové styly pro rozšířené nastavení
    errorMessage: {
        backgroundColor: '#f8d7da',
        color: '#721c24',
        padding: '12px 16px',
        borderRadius: '8px',
        marginBottom: '16px',
        border: '1px solid #f5c6cb',
    },

    loadingMessage: {
        textAlign: 'center' as const,
        padding: '40px',
        color: '#666',
        fontSize: '16px',
    },

    savingIndicator: {
        fontSize: '12px',
        color: '#007bff',
        fontWeight: '500',
        marginLeft: '8px',
    },

    statusBadge: {
        fontSize: '11px',
        color: 'white',
        padding: '4px 8px',
        borderRadius: '12px',
        fontWeight: '600',
        textTransform: 'uppercase' as const,
    },

    chatbotId: {
        fontSize: '11px',
        color: '#007bff',
        fontFamily: 'monospace',
        marginBottom: '16px',
        backgroundColor: '#f8f9fa',
        padding: '4px 8px',
        borderRadius: '4px',
        display: 'inline-block',
    },

    sectionSubtitle: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#333',
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },

    filterSection: {
        marginTop: '20px',
        paddingTop: '16px',
        borderTop: '1px solid #e0e0e0',
    },

    filterGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '8px',
    },

    filterItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '12px',
        color: '#333',
        cursor: 'pointer',
        padding: '4px',
        borderRadius: '4px',
        transition: 'background-color 0.2s',
    },

    filterItemLarge: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
        fontSize: '12px',
        color: '#333',
        cursor: 'pointer',
        padding: '8px',
        borderRadius: '6px',
        transition: 'background-color 0.2s',
        border: '1px solid #e0e0e0',
        backgroundColor: '#f8f9fa',
    },

    filterLabel: {
        fontWeight: '500',
    },

    filterDescription: {
        fontSize: '10px',
        color: '#666',
        marginTop: '2px',
        lineHeight: '1.3',
    },

    emptyChatbots: {
        textAlign: 'center' as const,
        padding: '40px',
        color: '#666',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #e0e0e0',
    },

    // Nové styly pro indikátory a tlačítka
    unsavedIndicator: {
        fontSize: '11px',
        color: '#dc3545',
        fontWeight: '500',
        marginLeft: '8px',
    },

    settingsActions: {
        display: 'flex',
        gap: '8px',
        marginTop: '16px',
        paddingTop: '16px',
        borderTop: '1px solid #e0e0e0',
    },

    saveButton: {
        backgroundColor: '#28a745',
        color: 'white',
        border: 'none',
        padding: '8px 16px',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: '500',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'all 0.2s',
        flex: 1,
    },

    resetButton: {
        backgroundColor: '#6c757d',
        color: 'white',
        border: 'none',
        padding: '8px 16px',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: '500',
        transition: 'all 0.2s',
        flex: 1,
    },

    disabledLabel: {
        fontSize: '11px',
        color: '#999',
        fontWeight: '400',
    },

    disabledSection: {
        backgroundColor: '#f8f9fa',
        padding: '16px',
        borderRadius: '6px',
        border: '1px solid #e0e0e0',
    },

    disabledText: {
        fontSize: '13px',
        color: '#666',
        margin: 0,
        fontStyle: 'italic',
    },
};

export default ChatbotManagement;