# Oprava Vany Chat - Metadata Filtering

## Problém
Když admin v nastavení chatbota "vany_chat" zaškrtl pouze kategorie **Wany** a **TČM**, při otevření chatu se zobrazovaly **všechny kategorie** místo pouze povolených.

## Příčina
V `index.tsx` se používala **špatná komponenta** - `FilteredSanaChat` z `SanaChat.tsx`.

Tato komponenta:
- ❌ Ignorovala `chatbotId` prop
- ❌ Načítala metadata přímo z databáze (všechny kategorie, typy publikací, štítky)
- ❌ Nerespektovala nastavení `allowed_categories` z `chatbot_settings` tabulky

## Řešení
Změna na správnou komponentu - `FilteredSanaChatWithSettings`.

Tato komponenta:
- ✅ Respektuje `chatbotId` prop
- ✅ Načítá nastavení z `chatbot_settings` pomocí `ChatbotSettingsService.getChatbotFilters(chatbotId)`
- ✅ Zobrazí pouze povolené kategorie (`allowed_categories`)
- ✅ Defaultně zaškrtne pouze povolené kategorie
- ✅ Posílá do N8N pouze zaškrtnuté kategorie

---

## Provedené změny

### 1. `index.tsx` - Import komponenty

**PŘED:**
```typescript
import { FilteredSanaChat } from './src/components/SanaChat/SanaChat';
```

**PO:**
```typescript
import FilteredSanaChatWithSettings from './src/components/ChatbotSettings/FilteredSanaChatWithSettings';
```

---

### 2. `index.tsx` - Použití komponenty

**PŘED:**
```tsx
<FilteredSanaChat 
    chatbotId={activeChatbot.id}
    onClose={() => setActiveChatbot(null)}
    chatbotSettings={{
        product_recommendations: activeChatbot.features.product_recommendations || false,
        product_button_recommendations: activeChatbot.features.product_button_recommendations || false,
        inline_product_links: activeChatbot.features.inline_product_links || false,
        book_database: activeChatbot.features.book_database || false,
        use_feed_1: activeChatbot.features.use_feed_1 !== undefined ? activeChatbot.features.use_feed_1 : true,
        use_feed_2: activeChatbot.features.use_feed_2 !== undefined ? activeChatbot.features.use_feed_2 : true,
        enable_product_router: activeChatbot.features.enable_product_router !== undefined ? activeChatbot.features.enable_product_router : true,
        enable_manual_funnel: activeChatbot.features.enable_manual_funnel || false
    }}
/>
```

**PO:**
```tsx
<FilteredSanaChatWithSettings 
    chatbotId={activeChatbot.id}
    onClose={() => setActiveChatbot(null)}
/>
```

**Důvod:** `FilteredSanaChatWithSettings` si načítá všechna nastavení sama podle `chatbotId`. Není třeba je předávat manuálně.

---

### 3. `FilteredSanaChatWithSettings.tsx` - Přidání `onClose` prop

**Změna v interface:**
```typescript
interface FilteredSanaChatWithSettingsProps {
  chatbotId: string;
  chatbotName?: string;
  onClose?: () => void; // 🆕 Přidáno
}
```

**Změna v komponentě:**
```typescript
const FilteredSanaChatWithSettings: React.FC<FilteredSanaChatWithSettingsProps> = ({ 
  chatbotId, 
  chatbotName,
  onClose  // 🆕 Přidáno
}) => {
```

**Přidání tlačítka zavřít do headeru:**
```tsx
{/* Tlačítko pro zavření chatu */}
{onClose && (
  <button
    onClick={onClose}
    className="flex items-center justify-center h-9 w-9 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white bg-white/10 hover:bg-white/20 text-white"
    aria-label="Zavřít chat"
    title="Zavřít chat"
  >
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  </button>
)}
```

---

## Testování

### 1. Otevři admin "Správa chatbotů"
- Edituj "Wany.Chat"
- V sekci "Povolené kategorie" zaškrtni pouze **Wany** a **TČM**
- Ulož změny

### 2. Otevři Vany Chat
- Klikni "Otevřít chat" u Wany.Chat
- Otevři filtrační panel (posuvník "Filtry")

### 3. Ověř výsledek
✅ **Očekávaný výsledek:**
- Ve filtru vidíš pouze 2 kategorie: **Wany** a **TČM**
- Obě jsou defaultně zaškrtnuté (modré)
- Ostatní kategorie nejsou viditelné

✅ **Pošli zprávu a zkontroluj Network tab:**
- Payload obsahuje: `metadata: { categories: ["Wany", "TČM"], ... }`

---

## Datový tok po opravě

```
1. Admin nastaví chatbot v DB
   ↓
   chatbot_settings.allowed_categories = [UUID_Wany, UUID_TČM]

2. Uživatel otevře chat
   ↓
   index.tsx → <FilteredSanaChatWithSettings chatbotId="vany_chat" />

3. Komponenta načte nastavení
   ↓
   ChatbotSettingsService.getChatbotFilters("vany_chat")
   ↓
   SELECT * FROM categories WHERE id IN (UUID_Wany, UUID_TČM)
   ↓
   Vrátí: [{ id: '...', name: 'Wany' }, { id: '...', name: 'TČM' }]

4. Komponenta nastaví state
   ↓
   availableCategories = [Wany, TČM]
   selectedCategories = ['Wany', 'TČM']  ← Defaultně zaškrtnuté

5. UI zobrazí filtry
   ↓
   2 tlačítka: [Wany - modrá] [TČM - modrá]

6. Uživatel pošle zprávu
   ↓
   Metadata do N8N: { categories: ['Wany', 'TČM'] }
```

---

## Proč to původně nefungovalo?

### `FilteredSanaChat` (špatná komponenta)
```typescript
// Načítala metadata přímo z databáze - VŠECHNY kategorie
const [labels, categories, publicationTypes] = await Promise.all([
    api.getLabels(),       // Všechny štítky
    api.getCategories(),   // Všechny kategorie ← PROBLÉM!
    api.getPublicationTypes()  // Všechny typy publikací
]);

// Ignorovala chatbotId prop
// Nepoužívala ChatbotSettingsService.getChatbotFilters()
```

### `FilteredSanaChatWithSettings` (správná komponenta)
```typescript
// Načítá pouze povolené kategorie pro konkrétního chatbota
const filters = await ChatbotSettingsService.getChatbotFilters(chatbotId);

// filters.categories obsahuje pouze ty, které má chatbot v allowed_categories
// např. pouze [Wany, TČM]
```

---

## Soubory změněné

1. ✅ `index.tsx` - Import a použití správné komponenty
2. ✅ `src/components/ChatbotSettings/FilteredSanaChatWithSettings.tsx` - Přidán `onClose` prop a tlačítko zavřít

---

## Soubory nezměněné (ale důležité pro pochopení)

- `src/services/chatbotSettingsService.ts` - Již správně funguje
- `src/components/SanaChat/SanaChat.tsx` - Stará komponenta (nepoužívá se už)
- `src/components/ChatbotSettings/ChatbotSettingsManager.tsx` - Admin UI (funguje správně)

---

## Status
✅ **OPRAVENO** - Změna dokončena

**Datum opravy:** 2024-12-10

**Testováno:** ⬜ Čeká na test

---

## Další poznámky

### Proč existují 2 komponenty?
- `FilteredSanaChat` (stará) - Legacy komponenta, která ignorovala nastavení chatbota
- `FilteredSanaChatWithSettings` (nová) - Správná komponenta respektující nastavení

**TODO:** Smazat starou komponentu `FilteredSanaChat` aby nedošlo k záměně v budoucnu.

### Kde se ještě používá stará komponenta?
```bash
# Najdi všechny použití
grep -r "FilteredSanaChat" --include="*.tsx" --include="*.ts"
```

Pokud se ještě někde používá, změnit na `FilteredSanaChatWithSettings`.



















