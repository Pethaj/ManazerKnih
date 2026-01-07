# Vany Chat - Debug průvodce pro metadata filtering

## Problém
Když admin v nastavení chatbota odškrtne některé kategorie (např. nechá pouze Wany a TČM), měly by se při otevření chatu zobrazit pouze tyto kategorie a zároveň být defaultně zaškrtnuté. Místo toho se zobrazují všechny kategorie.

## Datový tok

### 1. Ukládání nastavení (Admin UI)
**Soubor:** `src/components/ChatbotSettings/ChatbotSettingsManager.tsx`

**Kdy:** Admin upraví chatbot a klikne "Uložit změny"

**Co se uloží do DB:**
```typescript
// Řádek 124-130
const toggleCategory = (categoryId: string) => {
  setFormData(prev => ({
    ...prev,
    allowed_categories: prev.allowed_categories.includes(categoryId)
      ? prev.allowed_categories.filter(id => id !== categoryId)  // Odškrtnutí
      : [...prev.allowed_categories, categoryId]                  // Zaškrtnutí
  }));
};
```

**Výsledek:** Do `chatbot_settings.allowed_categories` se uloží pole UUID kategorií, které admin zaškrtl.

---

### 2. Načítání nastavení při otevření chatu
**Soubor:** `src/components/ChatbotSettings/FilteredSanaChatWithSettings.tsx`

**Kdy:** Uživatel otevře chat s daným chatbot_id

**Krok 1 - Načtení z DB (řádek 71):**
```typescript
const filters = await ChatbotSettingsService.getChatbotFilters(chatbotId);
```

**Co vrátí:**
```typescript
{
  categories: [ { id: '...', name: 'Wany' }, { id: '...', name: 'TČM' } ],
  publicationTypes: [...],
  labels: [...],
  // ... další nastavení
}
```

**Krok 2 - Nastavení dostupných filtrů (řádek 79-81):**
```typescript
setAvailableCategories(filters.categories);      // ✅ Správně - pouze Wany a TČM
setAvailablePublicationTypes(filters.publicationTypes);
setAvailableLabels(filters.labels);
```

**Krok 3 - Nastavení vybraných (zaškrtnutých) filtrů (řádek 84-86):**
```typescript
// ✅ SPRÁVNĚ - Zaškrtne pouze ty, co jsou v DB jako allowed
setSelectedCategories(filters.categories.map(c => c.name));  
setSelectedPublicationTypes(filters.publicationTypes.map(pt => pt.name));
setSelectedLabels(filters.labels.map(l => l.name));
```

**Výsledek:**
- `availableCategories` = [ { id: 'xxx', name: 'Wany' }, { id: 'yyy', name: 'TČM' } ]
- `selectedCategories` = [ 'Wany', 'TČM' ]

---

### 3. Zobrazení ve filtrovacím panelu
**Soubor:** `src/components/ChatbotSettings/FilteredSanaChatWithSettings.tsx`

**Řádek 253-272:**
```tsx
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
              ? 'bg-bewit-blue text-white shadow-md'      // ✅ Zaškrtnuté
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'  // Odškrtnuté
          }`}
        >
          {category.name}
        </button>
      ))}
    </div>
  </div>
)}
```

**Výsledek:** Zobrazí se pouze tlačítka pro Wany a TČM, obě zaškrtnutá (modrá).

---

### 4. Předání metadata do chatu
**Soubor:** `src/components/ChatbotSettings/FilteredSanaChatWithSettings.tsx`

**Řádek 387-393:**
```tsx
<SanaChatContent 
  selectedCategories={selectedCategories}          // ['Wany', 'TČM']
  selectedLabels={selectedLabels}
  selectedPublicationTypes={selectedPublicationTypes}
  chatbotSettings={chatbotSettings}
  chatbotId={chatbotId}
/>
```

---

### 5. Odeslání do N8N webhooku
**Soubor:** `src/components/SanaChat/SanaChat.tsx`

**Řádek 2050-2058:**
```typescript
const currentMetadata: ChatMetadata = {};
if (selectedCategories.length > 0) {
  currentMetadata.categories = selectedCategories;  // ['Wany', 'TČM']
}
if (selectedLabels.length > 0) {
  currentMetadata.labels = selectedLabels;
}
if (selectedPublicationTypes.length > 0) {
  currentMetadata.publication_types = selectedPublicationTypes;
}
```

**Payload do N8N:**
```json
{
  "sessionId": "...",
  "action": "sendMessage",
  "chatInput": "dotaz uživatele",
  "metadata": {
    "categories": ["Wany", "TČM"],
    "publication_types": ["public", "students"],
    "labels": []
  }
}
```

---

## Možné příčiny problému

### 1. ❌ Nastavení se neuložilo do DB
**Kontrola:**
Spusť SQL script `CHECK_VANY_CHAT_SETTINGS.sql` a zkontroluj:
- Kolik kategorií je v `allowed_categories`?
- Které konkrétní kategorie to jsou?

**Řešení:**
Pokud jsou v DB všechny kategorie, pak problém je v ukládání. Zkontroluj:
1. Zda kliknutím "Uložit změny" v admin UI proběhne request na server
2. Zda request obsahuje správná data (`allowed_categories` pouze s UUID pro Wany a TČM)
3. Zda RLS politika povoluje UPDATE

---

### 2. ❌ Načítá se jiný chatbot než myslíš
**Kontrola:**
V konzoli prohlížeče hledej log:
```
🤖 Načítám nastavení pro chatbota: vany_chat
```

Pokud tam je jiné ID, pak komponenta dostává špatné `chatbotId` prop.

**Řešení:**
Zkontroluj, odkud se volá `<FilteredSanaChatWithSettings chatbotId="???" />`

---

### 3. ❌ Fallback se aktivuje kvůli chybě
**Kontrola:**
V konzoli prohlížeče hledej:
```
Chyba při načítání nastavení chatbota: ...
```

Pokud je tam chyba, aktivuje se fallback (řádek 117-145) který nastaví výchozí kategorie.

**Řešení:**
Oprav chybu v načítání. Možné příčiny:
- Chybí RLS politika pro SELECT na `chatbot_settings`
- Chybějící tabulky `categories`, `publication_types`, `labels`
- Network error

---

## Debug checklist

1. ✅ Otevři chat s vany_chat
2. ✅ Otevři Developer Console (F12)
3. ✅ Hledej tyto logy:
   ```
   🤖 Načítám nastavení pro chatbota: vany_chat
   📊 Načtené filtrace pro chatbota: { ... }
   🔧 Nastavuji chatbotSettings: { ... }
   ```
4. ✅ Zkontroluj, co je v objektu `filters`:
   - Kolik je `filters.categories.length`?
   - Jaké názvy mají?
5. ✅ Spusť SQL: `CHECK_VANY_CHAT_SETTINGS.sql`
6. ✅ Porovnej výsledky z DB s tím, co vidíš v konzoli

---

## Řešení podle diagnostiky

### Scénář A: DB obsahuje všechny kategorie
→ **Problém v ukládání** - nastavení se správně neuložilo
→ **Řešení:** Oprav `ChatbotSettingsManager` nebo RLS politiku

### Scénář B: DB obsahuje pouze Wany a TČM, ale v konzoli je víc
→ **Problém v načítání** - `getChatbotFilters()` vrací špatná data
→ **Řešení:** Debug `ChatbotSettingsService.getChatbotFilters()`

### Scénář C: DB i konzole správné, ale UI špatné
→ **Problém v UI logice** - `FilteredSanaChatWithSettings` špatně renderuje
→ **Řešení:** Debug `availableCategories` vs `selectedCategories` state

---

## Kontakt na pomoc
Pokud problém přetrvává, pošli:
1. Screenshot admin UI (sekce "Povolené kategorie")
2. Výsledek SQL dotazu `CHECK_VANY_CHAT_SETTINGS.sql`
3. Screenshot konzole při otevření chatu (všechny logy)
















