# Grupování produktů podle kategorií v chatbotech

## Přehled

Tato funkce umožňuje administrátorům zobrazit tabulku "Súvisející produkty BEWIT" rozdělenou podle kategorií. Produkty zůstávají v jednom bloku, ale jsou vizuálně seskupené do sekcí podle jejich kategorií.

## Datum implementace
2026-02-16

## Změny v databázi

### Nový sloupec v `chatbot_settings`

```sql
ALTER TABLE chatbot_settings 
ADD COLUMN IF NOT EXISTS group_products_by_category BOOLEAN DEFAULT FALSE;
```

- **Typ:** BOOLEAN
- **Default:** FALSE (standardní zobrazení v carousel)
- **Význam:** TRUE = produkty rozdělené podle kategorií, FALSE = standardní carousel

### Index

```sql
CREATE INDEX IF NOT EXISTS idx_chatbot_settings_group_by_category 
ON chatbot_settings(group_products_by_category) 
WHERE group_products_by_category = TRUE;
```

Partial index pro rychlejší dotazování chatbotů s aktivním grupováním.

## Změny v TypeScript

### Interface `ChatbotSettings`

```typescript
export interface ChatbotSettings {
  // ... existující pole
  group_products_by_category?: boolean;  // 🆕 Nové pole
}
```

### Interface `ChatbotFilters`

```typescript
export interface ChatbotFilters {
  // ... existující pole
  groupProductsByCategory: boolean;  // 🆕 Nové pole
}
```

### Aktualizace `getChatbotFilters()`

```typescript
groupProductsByCategory: settings.group_products_by_category === true, // default false
```

## UI komponenty

### 1. ChatbotSettingsManager.tsx

Přidán nový checkbox v sekci "Produktový funnel":

```tsx
<label className="flex items-start">
  <input
    type="checkbox"
    checked={formData.group_products_by_category}
    onChange={(e) => setFormData(prev => ({ 
      ...prev, 
      group_products_by_category: e.target.checked 
    }))}
    className="mr-2 mt-1"
  />
  <div className="flex flex-col">
    <span className="text-sm text-gray-700 font-medium">
      Rozdělit produkty podle kategorií
    </span>
    <span className="text-xs text-gray-500">
      Tabulka "Súvisející produkty BEWIT" se zobrazí rozdělená na sekce podle kategorií. 
      Produkty zůstanou v jednom bloku, ale budou vizuálně seskupené.
    </span>
  </div>
</label>
```

**Indikátor v přehledu:**
- Fialový badge: "Podle kategorií" (když je zapnuto)
- Šedý badge: "Standardní" (když je vypnuto)

### 2. CategorizedProductTable.tsx (NOVÁ komponenta)

Nová komponenta pro zobrazení produktů rozdělených podle kategorií.

**Hlavní features:**
- ✅ Grupování produktů podle `category` pole
- ✅ Seřazení kategorií abecedně (kategorie "Ostatní" vždy na konci)
- ✅ Sticky kategorie headers při scrollování
- ✅ Thumbnail obrázky produktů
- ✅ Název, popis, cena pro každý produkt
- ✅ Tlačítko "Zobrazit" pro otevření produktu
- ✅ Affiliate token tracking (pokud je dostupný)
- ✅ Responsive design
- ✅ Hover efekty
- ✅ Celkový počet kategorií v patičce

**Struktura zobrazení:**
```
┌─────────────────────────────────────────────────┐
│ 🛍️ Súvisející produkty BEWIT        [15 produktů] │
├─────────────────────────────────────────────────┤
│ 📦 Jednodruhové esenciální oleje (5)            │
│ ┌───┬─────────────────────┬─────────┬─────────┐ │
│ │ 🖼 │ Produkt 1           │ 250 CZK │ Zobrazit│ │
│ │ 🖼 │ Produkt 2           │ 350 CZK │ Zobrazit│ │
│ └───┴─────────────────────┴─────────┴─────────┘ │
├─────────────────────────────────────────────────┤
│ 📦 TČM - Tradiční čínská medicína (3)           │
│ ┌───┬─────────────────────┬─────────┬─────────┐ │
│ │ 🖼 │ Produkt 3           │ 175 CZK │ Zobrazit│ │
│ └───┴─────────────────────┴─────────┴─────────┘ │
├─────────────────────────────────────────────────┤
│              Celkem 2 kategorie                 │
└─────────────────────────────────────────────────┘
```

**Styly:**
- Světle modrý header pro kategorie (`#e3f2fd`)
- Sticky positioning pro kategorie při scrollování
- Max výška 600px s vertikálním scrollem
- Hover efekt na produktových řádcích
- Responsive layout

### 3. SanaChat.tsx

Přidána podmíněná logika pro zobrazení:

```tsx
{chatbotSettings?.group_products_by_category ? (
    <CategorizedProductTable 
        products={message.productRecommendations}
        token={token}
    />
) : (
    <ProductCarousel 
        products={message.productRecommendations} 
        showSimilarity={true}
        title="🛍️ Doporučené produkty"
        token={token}
    />
)}
```

## Datový tok

### 1. Načtení nastavení chatbota

```
SanaChat.tsx (mount)
  └─> ChatbotSettingsService.getChatbotSettings(chatbotId)
      └─> supabase.from('chatbot_settings').select('*')
          └─> Vrátí group_products_by_category: true/false
```

### 2. Zobrazení produktů

```
SanaChat.tsx (render message s produkty)
  └─> Zkontroluje chatbotSettings?.group_products_by_category
      ├─> TRUE → Renderuje <CategorizedProductTable />
      │           └─> Grupuje produkty podle category
      │               └─> Zobrazí kategorizovanou tabulku
      └─> FALSE → Renderuje <ProductCarousel />
                  └─> Zobrazí standardní carousel
```

### 3. Kliknutí na produkt

```
CategorizedProductTable.tsx (handleProductClick)
  └─> openBewitProductLink(product_url, token, '_blank')
      └─> Přidá affiliate token do URL (pokud existuje)
          └─> Otevře produkt v novém tabu
```

## Příklady použití

### Příklad 1: Zapnutí grupování pro chatbot

```typescript
// V admin UI zapni checkbox "Rozdělit produkty podle kategorií"
// Výsledek v databázi:
{
  chatbot_id: 'sana_chat',
  group_products_by_category: true
}

// Uživatel uvidí produkty rozdělené podle kategorií
```

### Příklad 2: Standardní zobrazení (default)

```typescript
// Checkbox je vypnutý (nebo chatbot je starý bez tohoto nastavení)
{
  chatbot_id: 'sana_chat',
  group_products_by_category: false
}

// Uživatel uvidí standardní carousel s produkty
```

## Testování

### Test 1: SQL migrace

```sql
-- Spusť SQL script
\i add_group_products_by_category.sql

-- Ověř, že sloupec byl přidán
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'chatbot_settings' 
  AND column_name = 'group_products_by_category';

-- Očekávaný výsledek:
-- column_name: group_products_by_category
-- data_type: boolean
-- column_default: false
```

### Test 2: Aktualizace chatbota

```sql
-- Zapni grupování pro testovací chatbot
UPDATE chatbot_settings 
SET group_products_by_category = TRUE
WHERE chatbot_id = 'sana_chat'
RETURNING group_products_by_category;

-- Očekávaný výsledek: TRUE
```

### Test 3: Frontend zobrazení

1. Přihlaš se jako admin
2. Naviguj: Správa chatbotu → Nastavení chatbotů
3. Edituj chatbot "Sana Chat"
4. Zapni checkbox "Rozdělit produkty podle kategorií"
5. Ulož nastavení
6. Otevři chat a zadej dotaz, který vrátí produkty
7. Ověř, že produkty jsou zobrazeny v kategorizované tabulce

**Očekávaný výsledek:**
- ✅ Produkty jsou seskupené podle kategorií
- ✅ Kategorie jsou seřazené abecedně
- ✅ Každá kategorie má sticky header
- ✅ Produkty mají thumbnail, název, popis, cenu
- ✅ Tlačítko "Zobrazit" funguje a otevře produkt

### Test 4: Zpětná kompatibilita

```typescript
// Starý chatbot bez tohoto nastavení
const oldChatbot = {
  chatbot_id: 'old_chat',
  // group_products_by_category není definováno
};

// Očekávané chování: Zobrazí standardní carousel (default false)
```

## Výkon

- **Žádný dopad na databázové dotazy** - grupování se děje na frontendu
- **Rychlé renderování** - React efektivně renderuje kategorizované seznamy
- **Partial index** - Rychlé vyhledávání chatbotů s aktivním grupováním
- **Lazy rendering** - Pouze viditelné produkty jsou plně renderovány

## Kompatibilita

### Zpětná kompatibilita
✅ Plně zpětně kompatibilní
- Existující chatboty mají `group_products_by_category = FALSE` (default)
- Žádná změna v chování pro existující chatboty
- Nová funkce je opt-in (musí být explicitně zapnuta)

### Kompatibilita s existujícími funkcemi
✅ Kompatibilní se všemi existujícími funkcemi:
- ✅ Filtrování podle `allowed_product_categories`
- ✅ Produktový router (`enable_product_router`)
- ✅ Manuální funnel (`enable_manual_funnel`)
- ✅ Sumarizace historie (`summarize_history`)
- ✅ Feed 1 a Feed 2 (`use_feed_1`, `use_feed_2`)
- ✅ Affiliate token tracking

## Známá omezení

1. **Produkty bez kategorie** - Zobrazí se v kategorii "Ostatní"
2. **Pořadí kategorií** - Pouze abecední řazení (nelze custom pořadí)
3. **Mobilní zobrazení** - Může být náročné na malých obrazovkách (doporučeno testovat)

## Budoucí vylepšení

1. **Custom pořadí kategorií** - Možnost definovat pořadí kategorií v admin UI
2. **Sbalitelné kategorie** - Možnost skrýt/zobrazit jednotlivé kategorie
3. **Filtrování kategorií** - Možnost skrýt konkrétní kategorie per chatbot
4. **Statistiky** - Sledování, které kategorie jsou nejčastěji kliknuté
5. **Ikony kategorií** - Custom ikony pro jednotlivé kategorie

## Soubory změněny

- ✅ `add_group_products_by_category.sql` - SQL migrace
- ✅ `src/services/chatbotSettingsService.ts` - TypeScript interfaces
- ✅ `src/components/ChatbotSettings/ChatbotSettingsManager.tsx` - Admin UI
- ✅ `src/components/CategorizedProductTable.tsx` - Nová komponenta (VYTVOŘENO)
- ✅ `src/components/SanaChat/SanaChat.tsx` - Podmíněné zobrazení

## Závěr

Tato funkce poskytuje alternativní způsob zobrazení produktů, který je vhodnější pro větší počet produktů z různých kategorií. Je plně zpětně kompatibilní a snadno se zapíná/vypíná v admin UI.

**Implementováno:** Varianta A - Minimální dopad (pouze frontend grupování)
**Status:** ✅ Implementováno a připraveno k testování
**CORE dopad:** 🟡 Střední - Rozšiřuje existující funkci Product Feed 2 bez změny CORE funkcionality
