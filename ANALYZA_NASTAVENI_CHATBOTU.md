# 🔍 Analýza systému nastavování funkcí chatbotů

## 📋 Souhrn problému

Uživatel potřebuje vyřešit problém s nastavováním funkcí pro jednotlivé chatboty. Každý chatbot má své funkce a nastavování probíhá na kartě "Správa chatbotů", kde je možné zakliknout jednotlivá nastavení. Hlavní požadavky:

1. **Vše co se zaklikne, musí se zapsat do tabulky `chatbot_settings`** ✅
2. **Nastavení musí ovlivnit reálnou funkcionalitu chatu** ❓ (POTŘEBUJE KONTROLU)

---

## 🗄️ Analýza databázové struktury

### Tabulka `chatbot_settings`

```sql
CREATE TABLE IF NOT EXISTS public.chatbot_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chatbot_id TEXT NOT NULL UNIQUE,
    chatbot_name TEXT NOT NULL,
    description TEXT,
    
    -- 🔧 FUNKCE CHATBOTA
    product_recommendations BOOLEAN DEFAULT true,
    product_button_recommendations BOOLEAN DEFAULT false,
    book_database BOOLEAN DEFAULT true,
    
    -- 🔍 FILTRACE
    allowed_categories UUID[] DEFAULT '{}',
    allowed_publication_types UUID[] DEFAULT '{}',
    allowed_labels UUID[] DEFAULT '{}',
    
    -- ⚙️ FEED ZDROJE
    use_feed_1 BOOLEAN DEFAULT true,
    use_feed_2 BOOLEAN DEFAULT true,
    
    -- 📊 METADATA
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);
```

### ✅ Sloupce chybějící v aktuální struktuře

Podle SQL scriptů a kódu **chybí sloupec `product_button_recommendations`** v základním CREATE scriptu, ale existuje migrační script pro jeho přidání (`add_product_button_recommendations.sql`).

---

## 🎯 Analýza UI - ChatbotManagement komponenta

### Jak funguje UI pro nastavování

```typescript
// src/components/ChatbotManagement.tsx

interface ChatbotSettings {
  chatbot_id: string;
  chatbot_name: string;
  product_recommendations: boolean;           // ✅
  product_button_recommendations: boolean;    // ✅
  book_database: boolean;                     // ✅
  allowed_categories: string[];               // ✅
  allowed_publication_types: string[];        // ✅
  use_feed_1?: boolean;                       // ✅
  use_feed_2?: boolean;                       // ✅
}
```

### ✅ Workflow ukládání nastavení

1. **Uživatel zaklikne funkci** → `toggleChatbotFunction()`
2. **Lokální změna** → `updateLocalSettings()` 
3. **Označení jako neuložené** → `setUnsavedChanges()`
4. **Uživatel klikne "Uložit"** → `saveChatbotSettings()`
5. **API volání** → `ChatbotSettingsService.updateChatbotSettings()`
6. **UPDATE v databázi** → Supabase Edge Function nebo RLS fallback

**✅ ZÁVĚR:** Ukládání do databáze funguje správně.

---

## 🔗 Analýza propojení s funkcionalitou chatu

### Jak se nastavení načítají a používají

#### 1️⃣ Načítání nastavení (FilteredSanaChatWithSettings.tsx)

```typescript
// src/components/ChatbotSettings/FilteredSanaChatWithSettings.tsx

const loadChatbotSettings = async () => {
  // Načte filtrace pro konkrétního chatbota
  const filters = await ChatbotSettingsService.getChatbotFilters(chatbotId);
  
  // Nastaví dostupné kategorie a typy publikací
  setAvailableCategories(filters.categories);
  setAvailablePublicationTypes(filters.publicationTypes);
  
  // Nastaví nastavení chatbota
  setChatbotSettings(filters.settings);
}
```

#### 2️⃣ Předání do SanaChat komponenty

```typescript
<SanaChat 
  selectedCategories={selectedCategories}
  selectedLabels={selectedLabels}
  selectedPublicationTypes={selectedPublicationTypes}
  chatbotSettings={chatbotSettings}  // ⭐ PŘEDÁNÍ NASTAVENÍ
/>
```

#### 3️⃣ Použití v SanaChat

```typescript
// src/components/SanaChat/SanaChat.tsx

interface SanaChatProps {
  chatbotSettings?: {
    product_recommendations: boolean;
    book_database: boolean;
  };
}

// V handleSendMessage()
if (chatbotSettings.book_database && chatbotSettings.product_recommendations) {
  // KOMBINOVANÉ VYHLEDÁVÁNÍ
} else if (chatbotSettings.book_database) {
  // POUZE DATABÁZE KNIH
} else if (chatbotSettings.product_recommendations) {
  // POUZE PRODUKTOVÁ DOPORUČENÍ
}
```

---

## ⚠️ ZJIŠTĚNÉ PROBLÉMY

### 1. ❌ Chybějící propagace `product_button_recommendations`

**Interface v SanaChat.tsx:**
```typescript
chatbotSettings?: {
  product_recommendations: boolean;
  book_database: boolean;
  // ❌ CHYBÍ: product_button_recommendations
  // ❌ CHYBÍ: use_feed_1
  // ❌ CHYBÍ: use_feed_2
}
```

**Důsledek:** 
- Nastavení `product_button_recommendations` se **ukládá do databáze**, ale **neovlivňuje chování chatu**
- Tlačítko pro produktová doporučení se nezobrazuje na základě nastavení z databáze

### 2. ❌ Použití hardcoded hodnot pro feed_1 a feed_2

```typescript
// V handleSendMessage() - řádek 869-870
const useFeed1 = chatbotSettings.use_feed_1 !== false; // default true
const useFeed2 = chatbotSettings.use_feed_2 !== false; // default true
```

**Problém:** Tyto hodnoty se čtou z `chatbotSettings`, ale **interface je neobsahuje**, takže TypeScript je vyhodnotí jako `undefined`.

### 3. ❌ Neúplné načítání nastavení

**Funkce `getChatbotFilters()` vrací:**
```typescript
return {
  categories,
  publicationTypes,
  labels,
  productRecommendations: settings.product_recommendations,
  bookDatabase: settings.book_database,
  // ❌ CHYBÍ: product_button_recommendations
  // ❌ CHYBÍ: use_feed_1
  // ❌ CHYBÍ: use_feed_2
};
```

---

## 🛠️ NÁVRH ŘEŠENÍ

### Krok 1: Rozšíření interface v SanaChat.tsx

```typescript
interface SanaChatProps {
  chatbotSettings?: {
    product_recommendations: boolean;
    product_button_recommendations: boolean;  // 🆕
    book_database: boolean;
    use_feed_1?: boolean;                     // 🆕
    use_feed_2?: boolean;                     // 🆕
  };
}
```

### Krok 2: Úprava getChatbotFilters() v chatbotSettingsService.ts

```typescript
static async getChatbotFilters(chatbotId: string): Promise<ChatbotFilters> {
  const settings = await this.getChatbotSettings(chatbotId);
  
  return {
    categories,
    publicationTypes,
    labels,
    productRecommendations: settings.product_recommendations,
    productButtonRecommendations: settings.product_button_recommendations,  // 🆕
    bookDatabase: settings.book_database,
    useFeed1: settings.use_feed_1,        // 🆕
    useFeed2: settings.use_feed_2,        // 🆕
  };
}
```

### Krok 3: Implementace product_button_recommendations v SanaChat

```typescript
// V Message komponentě
{!isUser && message.role === 'bot' && 
 chatbotSettings?.product_button_recommendations && (
  <ProductRecommendationButton
    userQuery={lastUserMessage}
    botResponse={message.text}
    sessionId={sessionId}
  />
)}
```

### Krok 4: Ověření migrace databáze

Spustit SQL script:
```bash
psql < add_product_button_recommendations.sql
```

---

## 📊 Kontrolní checklist

### Databáze
- [x] Tabulka `chatbot_settings` existuje
- [ ] Sloupec `product_button_recommendations` přidán (spustit migraci)
- [x] Sloupce `use_feed_1` a `use_feed_2` existují
- [x] RLS politiky správně nastaveny

### Service vrstva
- [x] `ChatbotSettingsService.updateChatbotSettings()` funguje
- [ ] `getChatbotFilters()` vrací všechna pole (OPRAVIT)
- [x] Interface `ChatbotSettings` obsahuje všechna pole

### UI vrstva
- [x] `ChatbotManagement` ukládá změny do databáze
- [x] Checkbox pro `product_button_recommendations` v UI existuje
- [ ] Interface `SanaChatProps` obsahuje všechna pole (OPRAVIT)

### Funkcionalita
- [x] `product_recommendations` ovlivňuje chování (funguje)
- [x] `book_database` ovlivňuje chování (funguje)
- [ ] `product_button_recommendations` ovlivňuje chování (IMPLEMENTOVAT)
- [ ] `use_feed_1` a `use_feed_2` správně propagovány (OPRAVIT)

---

## 🎯 Prioritizované akce

### 🔴 Vysoká priorita
1. **Spustit SQL migraci** pro `product_button_recommendations`
2. **Opravit interface v SanaChat.tsx** - přidat chybějící pole
3. **Implementovat zobrazení ProductRecommendationButton** na základě nastavení

### 🟡 Střední priorita
4. **Opravit `getChatbotFilters()`** - vrátit všechna pole
5. **Aktualizovat `ChatbotFilters` interface** v service

### 🟢 Nízká priorita
6. **Přidat testy** pro ověření propojení nastavení → funkcionalita
7. **Dokumentovat** workflow od UI k funkcionalitě

---

## 💡 Doporučení

### Kontrola v Supabase Dashboard

1. **Otevřít Supabase → Table Editor → chatbot_settings**
2. **Zkontrolovat existenci sloupců:**
   - `product_recommendations` ✅
   - `product_button_recommendations` ❓
   - `book_database` ✅
   - `use_feed_1` ❓
   - `use_feed_2` ❓

3. **Zkontrolovat data v tabulce:**
   ```sql
   SELECT 
     chatbot_id,
     product_recommendations,
     product_button_recommendations,
     book_database,
     use_feed_1,
     use_feed_2
   FROM chatbot_settings;
   ```

### Test workflow

1. **Zakliknout funkci v UI** → změna v state ✅
2. **Kliknout "Uložit"** → UPDATE v DB ✅
3. **Otevřít chat** → načíst nastavení z DB ❓
4. **Poslat zprávu** → funkce se projeví v chování ❓

---

## 📝 Závěr

**Ukládání nastavení do databáze funguje správně** ✅

**Propagace nastavení do funkcionality chatu je neúplná** ❌

Hlavní problém je v:
- Neúplném interface `SanaChatProps` 
- Chybějící implementaci `product_button_recommendations` v Message komponentě
- Neúplném vrácení dat z `getChatbotFilters()`

**Řešení vyžaduje:**
1. Úpravu interfaces (TypeScript)
2. Implementaci logiky pro zobrazení ProductRecommendationButton
3. Ověření migrace databáze

**Odhadovaný čas:** 30-45 minut

