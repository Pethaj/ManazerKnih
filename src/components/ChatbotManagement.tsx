import React, { useState, useEffect } from 'react';
import { ProductEmbeddingManager } from './ProductEmbeddingManager';
import { ProductEmbeddingManagerFeed2 } from './ProductEmbeddingManagerFeed2';
import ProductSyncAdmin from './SanaChat/ProductSync';
import ProductChat from './ProductChat';
import { MessageLimitsDashboard } from './MessageLimits';
import { 
  ChatbotSettingsService, 
  ChatbotSettings, 
  Category, 
  PublicationType,
  ProductCategory,
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

const IconDashboard = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"></rect>
        <rect x="14" y="3" width="7" height="7"></rect>
        <rect x="14" y="14" width="7" height="7"></rect>
        <rect x="3" y="14" width="7" height="7"></rect>
    </svg>
);

interface Chatbot {
    id: string;
    name: string;
    description: string;
    url: string;
    features: {
        product_recommendations: boolean;
        product_button_recommendations: boolean;  // 🆕 Produktové doporučení na tlačítko
        inline_product_links?: boolean;  // 🆕 Inline produktové linky / screening
        book_database: boolean;
        use_feed_1?: boolean;
        use_feed_2?: boolean;
        webhook_url?: string;  // 🆕 N8N webhook URL pro tento chatbot
        enable_product_router?: boolean;  // 🆕 Zapnutí/vypnutí produktového routeru
        enable_manual_funnel?: boolean;   // 🆕 Zapnutí manuálního funnel spouštěče
    };
}

interface ChatbotManagementProps {
    onClose: () => void;
    onOpenChat?: (chatbotId: string, features: Chatbot['features']) => void;
}

export const ChatbotManagement: React.FC<ChatbotManagementProps> = ({ onClose, onOpenChat }) => {
    const [selectedTab, setSelectedTab] = useState<'chatbots' | 'product_feed' | 'settings' | 'dashboard'>('dashboard');
    
    // Nové state pro správu chatbotů z databáze
    const [chatbotSettings, setChatbotSettings] = useState<ChatbotSettings[]>([]);
    const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
    const [availablePublicationTypes, setAvailablePublicationTypes] = useState<PublicationType[]>([]);
    const [availableProductCategories, setAvailableProductCategories] = useState<ProductCategory[]>([]);
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
                product_button_recommendations: false,
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
                product_button_recommendations: false,
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
                
                const [settings, categories, publicationTypes, productCategories] = await Promise.all([
                    ChatbotSettingsService.getAllChatbotSettings(),
                    ChatbotSettingsService.getCategories(),
                    ChatbotSettingsService.getPublicationTypes(),
                    ChatbotSettingsService.getProductCategories(),
                ]);
                
                if (settings.length === 0) {
                    setError('V databázi nejsou žádné chatboti. Spusťte SQL script create_chatbot_settings_table.sql pro vytvoření výchozích chatbotů.');
                    return;
                }
                
                setChatbotSettings(settings);
                setAvailableCategories(categories);
                setAvailablePublicationTypes(publicationTypes);
                setAvailableProductCategories(productCategories);
                
            } catch (err) {
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

    // 🆕 Funkce pro toggle produktové kategorie u konkrétního chatbota
    const toggleChatbotProductCategory = (chatbotId: string, categoryName: string) => {
        const chatbot = chatbotSettings.find(c => c.chatbot_id === chatbotId);
        if (!chatbot) return;

        const currentCategories = chatbot.allowed_product_categories || [];
        const updatedCategories = currentCategories.includes(categoryName)
            ? currentCategories.filter(name => name !== categoryName)
            : [...currentCategories, categoryName];

        updateLocalSettings(chatbotId, { allowed_product_categories: updatedCategories });
    };

    // Funkce pro toggle funkcí chatbota s logikou závislostí
    const toggleChatbotFunction = (chatbotId: string, feature: 'product_recommendations' | 'product_button_recommendations' | 'book_database' | 'is_default_web_chatbot' | 'inline_product_links') => {
        const chatbot = chatbotSettings.find(c => c.chatbot_id === chatbotId);
        if (!chatbot) return;

        const updatedValue = !chatbot[feature];
        let updates: Partial<ChatbotSettings> = { [feature]: updatedValue };

        // Pokud se vypíná databáze knih, vypni také všechny filtrace
        if (feature === 'book_database' && !updatedValue) {
            updates = {
                ...updates,
                allowed_categories: [],
                allowed_publication_types: []
            };
        }
        
        // Pokud se zapíná "Zobrazit na webu", vypni u všech ostatních
        if (feature === 'is_default_web_chatbot' && updatedValue) {
            // Vypni is_default_web_chatbot u všech ostatních
            chatbotSettings.forEach(c => {
                if (c.chatbot_id !== chatbotId && c.is_default_web_chatbot) {
                    updateLocalSettings(c.chatbot_id, { is_default_web_chatbot: false });
                }
            });
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
            const updatedSettings = await ChatbotSettingsService.updateChatbotSettings(chatbotId, changes);
            
            // Aktualizuj lokální state s novými hodnotami z databáze
            setChatbotSettings(prev => prev.map(chatbot =>
                chatbot.chatbot_id === chatbotId
                    ? updatedSettings
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
            // Zobraz uživateli potvrzení
            alert('✅ Nastavení chatbota bylo úspěšně uloženo!');
            
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Nepodařilo se uložit nastavení chatbota';
            setError(`Chyba při ukládání nastavení chatbota "${chatbotId}": ${errorMessage}`);
            
            // Zobraz alert s chybou
            alert(`❌ ${errorMessage}`);
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
        } catch (err) {
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
        // Zobrazíme informaci o konfiguraci
        const enabledFeatures = [];
        if (chatbot.features.product_recommendations) enabledFeatures.push("Produktová doporučení");
        if (chatbot.features.product_button_recommendations) enabledFeatures.push("Produktové doporučení na tlačítko");
        if (chatbot.features.book_database) enabledFeatures.push("Databáze knih");
        
        const featuresText = enabledFeatures.length > 0 
            ? enabledFeatures.join(" + ") 
            : "Žádné funkce nejsou povoleny";
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
                        style={{ ...styles.tabButton, ...(selectedTab === 'dashboard' && styles.tabButtonActive) }}
                        onClick={() => setSelectedTab('dashboard')}
                    >
                        <IconDashboard />
                        Dashboard
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
                                    <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>❌ Chyba</div>
                                    <div style={{ marginBottom: '8px' }}>{error}</div>
                                    {error.includes('nebyl nalezen v databázi') && (
                                        <div style={styles.errorHint}>
                                            <strong>💡 Řešení:</strong>
                                            <ol style={{ margin: '8px 0', paddingLeft: '20px' }}>
                                                <li>Otevřete Supabase SQL Editor</li>
                                                <li>Spusťte script <code>fix_chatbot_settings.sql</code></li>
                                                <li>Obnovte tuto stránku</li>
                                            </ol>
                                        </div>
                                    )}
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
                                            
                                            {/* 🆕 Aktivace chatbota */}
                                            <div style={styles.chatbotSettings}>
                                                <h4 style={styles.sectionSubtitle}>⚡ Viditelnost na webu</h4>
                                                
                                                <div style={styles.settingRow}>
                                                    <label style={styles.settingLabel}>
                                                        <input
                                                            type="checkbox"
                                                            checked={chatbot.is_active || false}
                                                            onChange={() => updateLocalSettings(chatbot.chatbot_id, { 
                                                                is_active: !chatbot.is_active 
                                                            })}
                                                            style={styles.checkbox}
                                                        />
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <circle cx="12" cy="12" r="10"></circle>
                                                            <path d="M12 6v6l4 2"></path>
                                                        </svg>
                                                        Chatbot je aktivní
                                                    </label>
                                                    <div style={styles.settingDescription}>
                                                        {chatbot.is_active 
                                                            ? '✅ Chatbot se zobrazí v selectoru na webu MedBase a uživatelé si ho mohou vybrat' 
                                                            : '❌ Chatbot je skrytý a nebude dostupný pro výběr na webu'}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Základní funkce */}
                                            <div style={styles.chatbotSettings}>
                                                <h4 style={styles.sectionSubtitle}>🔧 Základní funkce</h4>
                                                
                                                <div style={styles.settingRow}>
                                                    <label style={styles.settingLabel}>
                                                        <input
                                                            type="checkbox"
                                                            checked={chatbot.product_recommendations || false}
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
                                                            checked={chatbot.product_button_recommendations || false}
                                                            onChange={() => toggleChatbotFunction(chatbot.chatbot_id, 'product_button_recommendations')}
                                                            style={styles.checkbox}
                                                        />
                                                        <IconProduct />
                                                        Produktové doporučení na tlačítko
                                                    </label>
                                                    <div style={styles.settingDescription}>
                                                        Zobrazit tlačítko "Doporučit produkty" na konci odpovědi chatbota
                                                    </div>
                                                </div>
                                                
                                                <div style={styles.settingRow}>
                                                    <label style={styles.settingLabel}>
                                                        <input
                                                            type="checkbox"
                                                            checked={chatbot.inline_product_links || false}
                                                            onChange={() => toggleChatbotFunction(chatbot.chatbot_id, 'inline_product_links')}
                                                            style={styles.checkbox}
                                                        />
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                                                        </svg>
                                                        Inline produktové linky
                                                    </label>
                                                    <div style={styles.settingDescription}>
                                                        Zobrazovat produktové linky přímo v textu odpovědi chatbota (ChatGPT styl)
                                                    </div>
                                                </div>
                                                
                                                <div style={styles.settingRow}>
                                                    <label style={styles.settingLabel}>
                                                        <input
                                                            type="checkbox"
                                                            checked={chatbot.book_database || false}
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
                                                
                                                <div style={styles.settingRow}>
                                                    <label style={styles.settingLabel}>
                                                        <input
                                                            type="checkbox"
                                                            checked={chatbot.is_default_web_chatbot || false}
                                                            onChange={() => toggleChatbotFunction(chatbot.chatbot_id, 'is_default_web_chatbot')}
                                                            style={styles.checkbox}
                                                        />
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <circle cx="12" cy="12" r="10"></circle>
                                                            <line x1="2" y1="12" x2="22" y2="12"></line>
                                                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                                                        </svg>
                                                        Zobrazit v bublině na webu
                                                    </label>
                                                    <div style={styles.settingDescription}>
                                                        Tento chatbot se zobrazí v plovoucí bublině na medbase.cz (pouze jeden může být vybrán)
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* 🆕 Produktový funnel sekce */}
                                            <div style={styles.chatbotSettings}>
                                                <h4 style={styles.sectionSubtitle}>🎯 Produktový funnel</h4>
                                                
                                                <div style={styles.settingRow}>
                                                    <label style={styles.settingLabel}>
                                                        <input
                                                            type="checkbox"
                                                            checked={chatbot.enable_product_router !== false}
                                                            onChange={() => updateLocalSettings(chatbot.chatbot_id, { 
                                                                enable_product_router: !(chatbot.enable_product_router !== false) 
                                                            })}
                                                            style={styles.checkbox}
                                                        />
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                                        </svg>
                                                        Aktivovat produktový router
                                                    </label>
                                                    <div style={styles.settingDescription}>
                                                        Automatické směrování dotazů do produktového funnelu na základě symptomů. Když je vypnuto, vše jde jako standardní chat.
                                                    </div>
                                                </div>
                                                
                                                <div style={styles.settingRow}>
                                                    <label style={styles.settingLabel}>
                                                        <input
                                                            type="checkbox"
                                                            checked={chatbot.enable_manual_funnel === true}
                                                            onChange={() => updateLocalSettings(chatbot.chatbot_id, { 
                                                                enable_manual_funnel: !(chatbot.enable_manual_funnel === true) 
                                                            })}
                                                            style={styles.checkbox}
                                                        />
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <circle cx="12" cy="12" r="10"></circle>
                                                            <line x1="12" y1="8" x2="12" y2="16"></line>
                                                            <line x1="8" y1="12" x2="16" y2="12"></line>
                                                        </svg>
                                                        Manuální funnel spouštěč
                                                    </label>
                                                    <div style={styles.settingDescription}>
                                                        Místo žlutého calloutu zobrazí tlačítko pro manuální zadání symptomů. Uživatel sám rozhodne, kdy chce doporučit produkty.
                                                    </div>
                                                </div>
                                                
                                                <div style={styles.settingRow}>
                                                    <label style={styles.settingLabel}>
                                                        <input
                                                            type="checkbox"
                                                            checked={chatbot.summarize_history === true}
                                                            onChange={() => updateLocalSettings(chatbot.chatbot_id, { 
                                                                summarize_history: !(chatbot.summarize_history === true) 
                                                            })}
                                                            style={styles.checkbox}
                                                        />
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                                            <polyline points="14 2 14 8 20 8"></polyline>
                                                            <line x1="16" y1="13" x2="8" y2="13"></line>
                                                            <line x1="16" y1="17" x2="8" y2="17"></line>
                                                            <polyline points="10 9 9 9 8 9"></polyline>
                                                        </svg>
                                                        Sumarizovat historii
                                                    </label>
                                                    <div style={styles.settingDescription}>
                                                        Automaticky sumarizuje historii konverzace pomocí LLM před odesláním do N8N webhooku. Snižuje latenci a náklady na tokeny.
                                                    </div>
                                                </div>
                                                
                                                {/* 🆕 Grupování produktů podle kategorií */}
                                                <div style={styles.settingRow}>
                                                    <label style={styles.settingLabel}>
                                                        <input
                                                            type="checkbox"
                                                            checked={chatbot.group_products_by_category === true}
                                                            onChange={() => updateLocalSettings(chatbot.chatbot_id, { 
                                                                group_products_by_category: !(chatbot.group_products_by_category === true) 
                                                            })}
                                                            style={styles.checkbox}
                                                        />
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <rect x="3" y="3" width="7" height="7"></rect>
                                                            <rect x="14" y="3" width="7" height="7"></rect>
                                                            <rect x="14" y="14" width="7" height="7"></rect>
                                                            <rect x="3" y="14" width="7" height="7"></rect>
                                                        </svg>
                                                        Rozdělit produkty podle kategorií
                                                    </label>
                                                    <div style={styles.settingDescription}>
                                                        ⚠️ Tato funkce je momentálně vypnutá. Inline produktové linky se zobrazují bez grupování podle kategorií.
                                                    </div>
                                                </div>

                                                {/* 🆕 Párování kombinací produktů */}
                                                <div style={styles.settingRow}>
                                                    <label style={styles.settingLabel}>
                                                        <input
                                                            type="checkbox"
                                                            checked={chatbot.enable_product_pairing === true}
                                                            onChange={() => updateLocalSettings(chatbot.chatbot_id, {
                                                                enable_product_pairing: !(chatbot.enable_product_pairing === true)
                                                            })}
                                                            style={styles.checkbox}
                                                        />
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M10 13a5 5 0 0 0 7.07 0l1.41-1.41a5 5 0 0 0-7.07-7.07L10 4.93"></path>
                                                            <path d="M14 11a5 5 0 0 0-7.07 0L5.52 12.41a5 5 0 0 0 7.07 7.07L14 19.07"></path>
                                                        </svg>
                                                        Párování kombinací produktů
                                                    </label>
                                                    <div style={styles.settingDescription}>
                                                        Automaticky přidá doplňkové produkty (Prawtein, TČM, Aloe, Merkaba) na základě tabulky léčebných kombinací.
                                                    </div>
                                                </div>

                                                {/* 🔍 Vyhledávač produktů */}
                                                <div style={styles.settingRow}>
                                                    <label style={styles.settingLabel}>
                                                        <input
                                                            type="checkbox"
                                                            checked={chatbot.enable_product_search === true}
                                                            onChange={() => updateLocalSettings(chatbot.chatbot_id, {
                                                                enable_product_search: !(chatbot.enable_product_search === true)
                                                            })}
                                                            style={styles.checkbox}
                                                        />
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <circle cx="11" cy="11" r="8"></circle>
                                                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                                        </svg>
                                                        Vyhledávač produktů (Feed Agent)
                                                    </label>
                                                    <div style={styles.settingDescription}>
                                                        Povolí přepínač mezi AI chatem a vyhledávačem produktů přímo v chatu. Uživatel si může sám zvolit režim.
                                                    </div>
                                                </div>

                                                {/* 🌿 Filtrování látek podle problému (EO Směsi) */}
                                                <div style={styles.settingRow}>
                                                    <label style={styles.settingLabel}>
                                                        <input
                                                            type="checkbox"
                                                            checked={chatbot.filter_ingredients_by_problem === true}
                                                            onChange={() => updateLocalSettings(chatbot.chatbot_id, {
                                                                filter_ingredients_by_problem: !(chatbot.filter_ingredients_by_problem === true)
                                                            })}
                                                            style={styles.checkbox}
                                                        />
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                                                        </svg>
                                                        Filtrovat látky podle problému
                                                    </label>
                                                    <div style={styles.settingDescription}>
                                                        Zobrazí účinné látky z tabulky ingredient-solution napárované ke konkrétnímu problému uživatele (místo látek z produktu). Určeno pro EO Směsi chat.
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Vyhledávač produktů - badge */}
                                            {chatbot.enable_product_search === true && (
                                                <div style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    fontSize: '11px',
                                                    backgroundColor: '#EFF6FF',
                                                    color: '#1D4ED8',
                                                    padding: '2px 8px',
                                                    borderRadius: '12px',
                                                    fontWeight: 500,
                                                    marginBottom: '8px',
                                                    border: '1px solid #BFDBFE'
                                                }}>
                                                    🔍 Vyhledávač produktů aktivní
                                                </div>
                                            )}

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

                                            {/* 🆕 Produktové kategorie (Product Pills) - pouze pokud jsou inline produktové linky zapnuté */}
                                            {chatbot.inline_product_links && (
                                                <div style={styles.filterSection}>
                                                    <details style={{
                                                        border: '1px solid #E5E7EB',
                                                        borderRadius: '8px',
                                                        padding: '12px',
                                                        backgroundColor: '#F9FAFB'
                                                    }}>
                                                        <summary style={{
                                                            cursor: 'pointer',
                                                            fontWeight: 500,
                                                            fontSize: '14px',
                                                            color: '#374151',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '8px',
                                                            userSelect: 'none'
                                                        }}>
                                                            🛍️ Produktové kategorie ({(chatbot.allowed_product_categories || []).length}/{availableProductCategories.length})
                                                            {(chatbot.allowed_product_categories || []).length === 0 ? (
                                                                <span style={{ fontSize: '12px', color: '#D97706', fontWeight: 400 }}>
                                                                    - všechny povoleny
                                                                </span>
                                                            ) : (
                                                                <span style={{ fontSize: '12px', color: '#059669', fontWeight: 400 }}>
                                                                    - {(chatbot.allowed_product_categories || []).length} vybráno
                                                                </span>
                                                            )}
                                                        </summary>
                                                        
                                                        <div style={{ marginTop: '12px' }}>
                                                            {/* Tlačítka pro rychlý výběr */}
                                                            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        updateLocalSettings(chatbot.chatbot_id, {
                                                                            allowed_product_categories: availableProductCategories.map(c => c.category)
                                                                        });
                                                                    }}
                                                                    style={{
                                                                        padding: '6px 12px',
                                                                        fontSize: '12px',
                                                                        backgroundColor: '#10B981',
                                                                        color: 'white',
                                                                        border: 'none',
                                                                        borderRadius: '4px',
                                                                        cursor: 'pointer',
                                                                        fontWeight: 500
                                                                    }}
                                                                >
                                                                    ✓ Vybrat vše
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        updateLocalSettings(chatbot.chatbot_id, {
                                                                            allowed_product_categories: []
                                                                        });
                                                                    }}
                                                                    style={{
                                                                        padding: '6px 12px',
                                                                        fontSize: '12px',
                                                                        backgroundColor: '#EF4444',
                                                                        color: 'white',
                                                                        border: 'none',
                                                                        borderRadius: '4px',
                                                                        cursor: 'pointer',
                                                                        fontWeight: 500
                                                                    }}
                                                                >
                                                                    ✗ Zrušit výběr
                                                                </button>
                                                            </div>
                                                            
                                                            {/* Seznam kategorií */}
                                                            <div style={{
                                                                maxHeight: '300px',
                                                                overflowY: 'auto',
                                                                border: '1px solid #E5E7EB',
                                                                borderRadius: '6px',
                                                                padding: '8px',
                                                                backgroundColor: 'white'
                                                            }}>
                                                                {availableProductCategories.map(productCategory => (
                                                                    <label 
                                                                        key={productCategory.category}
                                                                        style={{
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            padding: '6px 8px',
                                                                            cursor: 'pointer',
                                                                            borderRadius: '4px',
                                                                            fontSize: '13px',
                                                                            transition: 'background-color 0.15s'
                                                                        }}
                                                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                                                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                                    >
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={(chatbot.allowed_product_categories || []).includes(productCategory.category)}
                                                                            onChange={() => toggleChatbotProductCategory(chatbot.chatbot_id, productCategory.category)}
                                                                            style={{ marginRight: '8px', cursor: 'pointer' }}
                                                                        />
                                                                        <span style={{ flex: 1, color: '#374151' }}>
                                                                            {productCategory.category}
                                                                        </span>
                                                                        <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
                                                                            ({productCategory.product_count})
                                                                        </span>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </details>
                                                </div>
                                            )}
                                            
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
                                                                    product_button_recommendations: chatbot.product_button_recommendations,
                                                                    inline_product_links: chatbot.inline_product_links,  // 🆕 PŘIDÁNO!
                                                                    book_database: chatbot.book_database,
                                                                    use_feed_1: chatbot.use_feed_1,
                                                                    use_feed_2: chatbot.use_feed_2,
                                                                    webhook_url: chatbot.webhook_url,  // 🆕 Webhook URL pro tento chatbot
                                                                    enable_product_router: chatbot.enable_product_router,  // 🆕 Produktový router
                                                                    enable_manual_funnel: chatbot.enable_manual_funnel  // 🆕 Manuální funnel
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

                                            {/* 🛠️ Pro vývojáře */}
                                            <div style={styles.devSection}>
                                                <div style={styles.devSectionTitle}>🛠️ Pro vývojáře</div>
                                                <a
                                                    href={`${window.location.origin}/${
                                                        chatbot.chatbot_id === 'eo_smesi' ? 'embed-eo-smesi.html' : 'embed.html'
                                                    }?chatbot_id=${chatbot.chatbot_id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={styles.devLink}
                                                >
                                                    🔗 Testovací stránka
                                                </a>
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

                                <div style={styles.actionCard}>
                                    <h4>AI Embeddingy Pro Feed ABC</h4>
                                    <p>Vygenerujte embeddingy pro vylepšená produktová doporučení z Feed ABC (varianty, ceny A/B/C)</p>
                                    <button
                                        style={styles.primaryButton}
                                        onClick={() => alert('Embeddingy pro Feed ABC – připravuje se')}
                                    >
                                        📋 Spravovat Embeddingy Pro Feed ABC
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {selectedTab === 'dashboard' && (
                        <div style={styles.tabContent}>
                            <MessageLimitsDashboard />
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
        fontSize: '14px',
        lineHeight: '1.5',
    },

    errorHint: {
        backgroundColor: '#fff3cd',
        color: '#856404',
        padding: '12px',
        borderRadius: '6px',
        marginTop: '12px',
        border: '1px solid #ffeaa7',
        fontSize: '13px',
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

    devSection: {
        marginTop: '12px',
        paddingTop: '12px',
        borderTop: '1px solid #e0e0e0',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    },

    devSectionTitle: {
        fontSize: '12px',
        fontWeight: '600',
        color: '#6c757d',
        whiteSpace: 'nowrap' as const,
    },

    devLink: {
        fontSize: '12px',
        color: '#6c757d',
        textDecoration: 'none',
        padding: '4px 10px',
        borderRadius: '4px',
        border: '1px solid #dee2e6',
        backgroundColor: '#f8f9fa',
        fontFamily: 'monospace',
        transition: 'all 0.2s',
    },
};

export default ChatbotManagement;