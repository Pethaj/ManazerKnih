# Dokumentace systému nastavení chatbotů

## Přehled

Tento systém umožňuje vytvářet a spravovat individuální nastavení pro různé chatboty v aplikacji. Každý chatbot může mít vlastní sadu povolených filtrů a funkcionalit.

## Komponenty systému

### 1. Databázová vrstva

#### Tabulka `public.chatbot_settings`
Uchovává kompletní nastavení jednotlivých chatbotů:

```sql
- id (UUID) - Primární klíč
- chatbot_id (TEXT) - Unikátní identifikátor chatbota
- chatbot_name (TEXT) - Lidsky čitelný název
- description (TEXT) - Popis chatbota
- product_recommendations (BOOLEAN) - Povolit produktová doporučení
- book_database (BOOLEAN) - Povolit přístup k databázi knih
- allowed_categories (UUID[]) - Povolené kategorie
- allowed_publication_types (UUID[]) - Povolené typy publikací
- allowed_labels (UUID[]) - Povolené štítky
- is_active (BOOLEAN) - Zda je chatbot aktivní
```

#### Pomocné funkce
- `get_chatbot_allowed_categories(chatbot_id)` - Vrací povolené kategorie
- `get_chatbot_allowed_publication_types(chatbot_id)` - Vrací povolené typy publikací
- `chatbot_has_access_to_category(chatbot_id, category_id)` - Ověřuje přístup ke kategorii
- `chatbot_has_access_to_publication_type(chatbot_id, type_id)` - Ověřuje přístup k typu publikace

### 2. Service vrstva

#### `ChatbotSettingsService`
Hlavní service pro správu nastavení chatbotů:

```typescript
// Získání všech nastavení chatbotů
await ChatbotSettingsService.getAllChatbotSettings()

// Získání nastavení konkrétního chatbota
await ChatbotSettingsService.getChatbotSettings(chatbotId)

// Vytvoření nového chatbota
await ChatbotSettingsService.createChatbotSettings(data)

// Aktualizace nastavení
await ChatbotSettingsService.updateChatbotSettings(chatbotId, data)

// Získání filtrů pro chatbota
await ChatbotSettingsService.getChatbotFilters(chatbotId)
```

### 3. UI komponenty

#### `ChatbotSettingsManager`
Administrační rozhraní pro správu všech chatbotů:
- Seznam všech chatbotů
- Vytváření nových chatbotů
- Editace existujících nastavení
- Mazání chatbotů

#### `FilteredSanaChatWithSettings`
Chat komponenta s automatickým načtením filtrů podle nastavení chatbota:
```typescript
<FilteredSanaChatWithSettings 
  chatbotId="sana_kancelar"
  chatbotName="Sana Kancelář"
/>
```

#### `ChatWidgetWithSettings`
Plovoucí chat widget s možností výběru chatbota:
```typescript
<ChatWidgetWithSettings
  defaultChatbotId="medbase_sana"
  allowChatbotSelection={true}
  showAdminButton={true}
  onOpenAdmin={() => setShowAdmin(true)}
/>
```

#### `ChatbotAdmin`
Kompletní administrační rozhraní kombinující chat a správu:
```typescript
<ChatbotAdmin />
```

## Instalace a konfigurace

### 1. Databáze
```sql
-- Spusťte v Supabase SQL editoru
-- create_chatbot_settings_table.sql
```

### 2. Prostředí
Ujistěte se, že máte nastavené:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Import do aplikace
```typescript
import { 
  ChatbotAdmin,
  ChatWidgetWithSettings,
  FilteredSanaChatWithSettings,
  ChatbotSettingsManager 
} from './src/components/ChatbotSettings';
```

## Předkonfigurované chatboty

Po spuštění SQL scriptu budete mít k dispozici:

### `general_chat` - Obecný Chat
- **Přístup**: Pouze veřejné publikace
- **Funkce**: Základní chat bez produktových doporučení
- **Využití**: Základní informace pro návštěvníky

### `sana_kancelar` - Sana Kancelář  
- **Přístup**: Pouze veřejné publikace
- **Funkce**: Databáze knih bez produktových doporučení
- **Využití**: Kancelářské potřeby s omezeným přístupem

### `medbase_sana` - MedBase Sana
- **Přístup**: Všechny kategorie a typy publikací
- **Funkce**: Plný přístup včetně produktových doporučení
- **Využití**: Hlavní chatbot pro komplexní dotazy

## Způsoby použití

### Scénář 1: Kompletní administrace
```typescript
export const App = () => {
  return <ChatbotAdmin />;
};
```

### Scénář 2: Chat widget na existující stránce
```typescript
export const MyPage = () => {
  return (
    <div>
      <h1>Moje aplikace</h1>
      {/* Váš obsah */}
      
      <ChatWidgetWithSettings
        defaultChatbotId="sana_kancelar"
        allowChatbotSelection={true}
      />
    </div>
  );
};
```

### Scénář 3: Vestavěný chat
```typescript
export const ChatPage = () => {
  return (
    <div className="h-screen">
      <FilteredSanaChatWithSettings 
        chatbotId="medbase_sana"
      />
    </div>
  );
};
```

### Scénář 4: Pouze správa (admin stránka)
```typescript
export const AdminPage = () => {
  return (
    <div className="container mx-auto p-8">
      <h1>Správa chatbotů</h1>
      <ChatbotSettingsManager />
    </div>
  );
};
```

## Konfigurace chatbota

### 1. Vytvoření nového chatbota
```typescript
const newChatbot = {
  chatbot_id: 'specialni_chat',
  chatbot_name: 'Speciální Chat',
  description: 'Chat s přístupem pouze k aromaterapii',
  product_recommendations: false,
  book_database: true,
  allowed_categories: ['uuid-aromaterapie'],
  allowed_publication_types: ['uuid-public', 'uuid-students'],
  allowed_labels: [],
  is_active: true
};

await ChatbotSettingsService.createChatbotSettings(newChatbot);
```

### 2. Aktualizace existujícího chatbota
```typescript
await ChatbotSettingsService.updateChatbotSettings('sana_kancelar', {
  allowed_categories: ['uuid-aromaterapie', 'uuid-masaze'],
  product_recommendations: true
});
```

## Bezpečnost

- Všechny tabulky mají povolenou Row Level Security (RLS)
- Pouze administrátoři mohou upravovat nastavení chatbotů
- Čtení nastavení je povoleno všem pro fungování chatbotů
- Všechny operace jsou logovány s informací o uživateli

## Rozšíření systému

### Přidání nového typu filtrace
1. Rozšiřte databázovou tabulku o nové pole
2. Aktualizujte TypeScript typy v `chatbotSettingsService.ts`
3. Přidejte UI prvky do `ChatbotSettingsManager`
4. Aktualizujte `FilteredSanaChatWithSettings` pro zpracování nového filtru

### Přidání nové funkcionality chatbota
1. Přidejte boolean pole do tabulky `chatbot_settings`
2. Aktualizujte service a komponenty
3. Implementujte logiku v chat komponentách

## Troubleshooting

### Chatbot se nezobrazuje
- Zkontrolujte, zda je `is_active = true`
- Ověřte, že chatbot má nastavené alespoň nějaké povolené filtry
- Zkontrolujte konzoli pro chybové hlášky

### Filtrace nefungují
- Ujistěte se, že kategorie/typy publikací existují v databázi
- Ověřte UUID v `allowed_categories` a `allowed_publication_types`
- Zkontrolujte RLS pravidla v Supabase

### Chyby při ukládání
- Zkontrolujte připojení k Supabase
- Ověřte oprávnění uživatele
- Zkontrolujte formát dat (UUID vs string)

## Monitorování

Systém loguje všechny operace pro účely auditování:
- Vytvoření chatbota: `created_by`, `created_at`
- Úpravy nastavení: `updated_by`, `updated_at`
- Přístup k filtrům: konzolové logy v development módu
