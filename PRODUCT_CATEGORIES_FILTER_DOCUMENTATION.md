# Filtrování produktových kategorií v chatbotech

## Přehled

Tato funkce umožňuje administrátorům vybrat konkrétní kategorie z `product_feed_2`, ze kterých mohou pocházet Product Pills v chatbotu. Pokud nejsou vybrány žádné kategorie, všechny kategorie jsou povoleny. Pokud jsou vybrány konkrétní kategorie, pouze produkty z těchto kategorií se zobrazí v doporučeních.

## Datum implementace
2026-02-16

## Změny v databázi

### Nový sloupec v `chatbot_settings`

```sql
ALTER TABLE chatbot_settings 
ADD COLUMN allowed_product_categories TEXT[] DEFAULT '{}';
```

- **Typ:** TEXT[] (pole textových hodnot)
- **Default:** Prázdné pole `'{}'`
- **Význam:** Prázdné pole = všechny kategorie povoleny, neprázdné pole = pouze vybrané kategorie

### Index

```sql
CREATE INDEX idx_chatbot_settings_product_categories 
ON chatbot_settings USING GIN (allowed_product_categories);
```

GIN index pro rychlé vyhledávání v poli kategorií.

### Nová SQL funkce

```sql
CREATE FUNCTION get_product_feed_2_categories()
RETURNS TABLE (
  category varchar(255),
  product_count bigint
)
```

Vrací seznam všech unikátních kategorií z `product_feed_2` s počtem produktů v každé kategorii.

## Změny v SQL funkcích

Všechny vyhledávací funkce byly rozšířeny o parametr `filter_categories`:

### 1. `search_products_by_vector()`

```sql
CREATE OR REPLACE FUNCTION search_products_by_vector(
  query_embedding vector(1536),
  similarity_threshold float DEFAULT 0.5,
  max_results int DEFAULT 10,
  filter_feed_source text DEFAULT NULL,
  filter_categories text[] DEFAULT NULL  -- 🆕 Nový parametr
)
```

### 2. `hybrid_product_search()`

```sql
CREATE OR REPLACE FUNCTION hybrid_product_search(
  query_text text,
  query_embedding vector(1536),
  match_count int DEFAULT 10,
  full_text_weight float DEFAULT 1.0,
  semantic_weight float DEFAULT 1.0,
  rrf_k int DEFAULT 50,
  filter_feed_source text DEFAULT NULL,
  filter_categories text[] DEFAULT NULL  -- 🆕 Nový parametr
)
```

### 3. `get_product_chunks_for_rag()`

```sql
CREATE OR REPLACE FUNCTION get_product_chunks_for_rag(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5,
  filter_feed_source text DEFAULT NULL,
  filter_categories text[] DEFAULT NULL  -- 🆕 Nový parametr
)
```

### Logika filtrování

Ve všech funkcích je použita stejná logika:

```sql
AND (
  filter_categories IS NULL 
  OR array_length(filter_categories, 1) IS NULL 
  OR array_length(filter_categories, 1) = 0
  OR pe.category = ANY(filter_categories)
)
```

- `NULL` nebo prázdné pole = žádné filtrování
- Neprázdné pole = pouze produkty s kategorií v poli

## Změny v TypeScript

### Interface `ChatbotSettings`

```typescript
export interface ChatbotSettings {
  // ... existující pole
  allowed_product_categories?: string[];  // 🆕 Nové pole
}
```

### Interface `ProductCategory`

```typescript
export interface ProductCategory {
  category: string;
  product_count: number;
}
```

### Nová metoda v `ChatbotSettingsService`

```typescript
static async getProductCategories(): Promise<ProductCategory[]> {
  const { data, error } = await supabase
    .rpc('get_product_feed_2_categories');
  
  return data || [];
}
```

### Aktualizace `getHybridProductRecommendations()`

```typescript
export async function getHybridProductRecommendations(
  query: string,
  sessionId?: string,
  limit: number = 10,
  useFeed1: boolean = true,
  useFeed2: boolean = true,
  allowedCategories: string[] = []  // 🆕 Nový parametr
): Promise<HybridProductRecommendation[]>
```

## UI komponenty

### ChatbotSettingsManager.tsx

Přidána nová sekce "🛍️ Produktové kategorie (Product Pills)" s:

1. **Info box** - Vysvětlení funkce
2. **Tlačítka pro rychlý výběr:**
   - "✓ Vybrat vše" - vybere všechny kategorie
   - "✗ Zrušit výběr" - zruší všechny kategorie (= všechny povoleny)
3. **Multi-select seznam** - Scrollovatelný seznam všech kategorií s checkboxy
   - Zobrazuje název kategorie
   - Zobrazuje počet produktů v kategorii
   - Hover efekt pro lepší UX
4. **Indikátor stavu:**
   - Žlutý badge: "Všechny povoleny" (žádná kategorie nevybrána)
   - Zelený badge: "X vybraných" (konkrétní počet kategorií)

### Přehled chatbotů

V kartě každého chatbota se zobrazuje:

```
Produktové kategorie: [Všechny povoleny] nebo [5 vybraných]
```

## Datový tok

### 1. Načtení kategorií při editaci chatbota

```
ChatbotSettingsManager.tsx
  └─> ChatbotSettingsService.getProductCategories()
      └─> supabase.rpc('get_product_feed_2_categories')
          └─> SQL funkce vrátí seznam kategorií s počty
```

### 2. Uložení vybraných kategorií

```
ChatbotSettingsManager.tsx (form submit)
  └─> ChatbotSettingsService.updateChatbotSettings()
      └─> supabase.from('chatbot_settings').update({ allowed_product_categories: [...] })
```

### 3. Vyhledávání produktů s filtrem

```
SanaChat.tsx (user query)
  └─> getHybridProductRecommendations(query, sessionId, limit, useFeed1, useFeed2, allowedCategories)
      └─> supabase.rpc('hybrid_product_search', { ..., filter_categories: allowedCategories })
          └─> SQL funkce filtruje podle kategorií
              └─> Vrací pouze produkty z povolených kategorií
```

## Příklady použití

### Příklad 1: Chatbot pouze pro esenciální oleje

```typescript
// V admin UI vybereš:
allowed_product_categories: [
  'Jednodruhové esenciální oleje',
  'Směsi esenciálních olejů'
]

// Výsledek: Product Pills budou obsahovat pouze produkty z těchto 2 kategorií
```

### Příklad 2: Chatbot pro TČM produkty

```typescript
allowed_product_categories: [
  'TČM - Tradiční čínská medicína'
]

// Výsledek: Pouze TČM produkty se zobrazí
```

### Příklad 3: Všechny kategorie povoleny

```typescript
allowed_product_categories: []

// Výsledek: Žádné omezení, všechny kategorie jsou dostupné
```

## Testování

### Test 1: Načtení kategorií

```sql
SELECT * FROM get_product_feed_2_categories() LIMIT 10;
```

Očekávaný výsledek: Seznam kategorií s počty produktů.

### Test 2: Aktualizace chatbota

```sql
UPDATE chatbot_settings 
SET allowed_product_categories = ARRAY['TČM - Tradiční čínská medicína', 'Jednodruhové esenciální oleje']
WHERE chatbot_id = 'test_chat'
RETURNING allowed_product_categories;
```

### Test 3: Vyhledávání s filtrem

```typescript
const products = await getHybridProductRecommendations(
  'bolest hlavy',
  'session-123',
  10,
  true,
  true,
  ['TČM - Tradiční čínská medicína']
);

// Očekávaný výsledek: Pouze TČM produkty
```

## Migrace existujících chatbotů

Všechny existující chatboty mají `allowed_product_categories = []`, což znamená, že všechny kategorie jsou povoleny. Toto je zpětně kompatibilní - žádná změna v chování.

## Výkon

- **GIN index** zajišťuje rychlé vyhledávání v poli kategorií
- **Filtrování na databázové úrovni** je efektivnější než frontend filtrování
- **Žádný dopad** pokud není použito filtrování (prázdné pole)

## Budoucí vylepšení

1. **Skupinové výběry** - Přednastavené skupiny kategorií (např. "Kosmetika", "Potraviny")
2. **Negace** - Možnost vyloučit konkrétní kategorie místo výběru povolených
3. **Prioritizace** - Váhy pro jednotlivé kategorie v ranking algoritmu
4. **Analytics** - Sledování, které kategorie jsou nejčastěji doporučovány

## Soubory změněny

- `add_product_categories_to_chatbot_settings.sql` - SQL migrace
- `src/services/chatbotSettingsService.ts` - TypeScript interfaces a služby
- `src/components/ChatbotSettings/ChatbotSettingsManager.tsx` - UI komponenta
- `src/services/hybridProductService.ts` - Vyhledávací logika
- `src/components/SanaChat/SanaChat.tsx` - Předávání kategorií do vyhledávání

## Závěr

Tato funkce poskytuje granulární kontrolu nad tím, které produkty se mohou zobrazit v Product Pills. Je plně zpětně kompatibilní a přidává flexibilitu pro různé typy chatbotů s různými produktovými zaměřeními.
