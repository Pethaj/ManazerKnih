# CORE - Centrální Dokumentace Schválených Funkcí

> **DŮLEŽITÉ:** Tento dokument obsahuje pouze schválené a implementované funkce aplikace. Každá změna existující funkce nebo přidání nové funkce MUSÍ být nejdříve validována proti tomuto dokumentu pomocí příkazu "core it". Žádná změna se nesmí provést bez explicitního schválení.

## Účel dokumentu

CORE slouží jako:
- **Single source of truth** pro všechny schválené funkce
- **Záchranný bod** pro obnovu poškozených funkcí
- **Validační standard** pro kontrolu dopadu změn
- **Dokumentace** pro kompletní technickou specifikaci

## Pravidla práce s CORE

1. **Před jakoukoli změnou:** Spusť `core it` pro analýzu dopadu
2. **Přidání nové funkce:** Vyžaduje schválení a ruční zápis do CORE
3. **Úprava existující funkce:** Vyžaduje schválení a aktualizaci CORE
4. **Automatické změny CORE:** ZAKÁZÁNO - pouze ruční schválení

---

## 📋 Obsah funkcí

1. [Synchronizace Product Feed 2](#funkce-1-synchronizace-product-feed-2)

---

# Funkce 1: Synchronizace Product Feed 2

## Základní informace

- **Název:** Synchronizace Product Feed 2
- **ID:** FUNC-001
- **Oblast:** Správa chatbotu → Produktový feed → Synchronizovat Feed 2 nyní
- **Stav:** ✅ Aktivní a schváleno
- **Datum schválení:** 2024-11-26
- **Verze:** 1.0

## Popis funkce

Systém pro automatickou a manuální synchronizaci produktového katalogu z BEWIT API (nový XML formát) do databáze. Funkce stahuje produktové informace včetně krátkých a dlouhých popisů, ukládá je do tabulky `product_feed_2` a automaticky vytváří vektorové embeddings pro sémantické vyhledávání prostřednictvím N8N webhook integrace s OpenAI.

## Business logika

### Účel
- Udržovat aktuální produktový katalog v databázi
- Umožnit chatbotu doporučovat produkty na základě sémantického vyhledávání
- Poskytovat obohacené produktové informace (krátké a dlouhé popisy v markdown formátu)

### Použití
1. **Manuální synchronizace:** Admin klikne na tlačítko v UI
2. **Automatická synchronizace:** Denní cron job ve 2:00 UTC
3. **Chatbot doporučení:** Hybridní vyhledávání při konverzaci s uživatelem

## Technická implementace

### Frontend komponenty

#### 1. ProductSync.tsx
**Cesta:** `src/components/SanaChat/ProductSync.tsx`

**Klíčové funkce:**
```typescript
// Funkce pro synchronizaci Feed 2 (přes Edge Function)
export const syncProductsFeed2 = async (): Promise<boolean>
```

**Popis:** 
- Volá Supabase Edge Function `sync-feed-2`
- Používá user session token pro autorizaci
- Vrací boolean success/failure
- Zobrazuje statistiky synchronizace v UI

**Integrace:**
- Tab rozhraní pro přepínání mezi Feed 1 a Feed 2
- Tlačítko "🔄 Synchronizovat Feed 2 nyní"
- Zobrazení stavu poslední synchronizace

#### 2. ProductRecommendationButton.tsx
**Cesta:** `src/components/ProductRecommendationButton.tsx`

**Popis:**
- Button pro produktová doporučení v chatbotu
- Používá gradient text animaci
- Zobrazuje ProductCarousel s doporučenými produkty
- Maximálně 6 produktů v carousel

**Props:**
```typescript
interface ProductRecommendationButtonProps {
  userQuery: string;
  botResponse: string;
  sessionId: string;
  onProductsLoaded?: (products: EnrichedProduct[]) => void;
  className?: string;
}
```

### Backend služby

#### 1. hybridProductService.ts
**Cesta:** `src/services/hybridProductService.ts`

**Hlavní funkce:**
```typescript
export async function getHybridProductRecommendations(
  query: string,
  sessionId?: string,
  limit: number = 10,
  useFeed1: boolean = true,
  useFeed2: boolean = true
): Promise<HybridProductRecommendation[]>
```

**Proces:**
1. Vygeneruje embedding z dotazu uživatele
2. Volá SQL RPC funkce (`hybrid_product_search`, `search_products_by_vector`)
3. Filtruje podle `filter_feed_source` ('feed_1', 'feed_2', nebo null)
4. Obohacuje výsledky o aktuální metadata z příslušných tabulek
5. Vrací kombinovaná data pro zobrazení

**Fallback:**
- Při selhání hybridního vyhledávání použije čistě sémantické vyhledávání
- Funkce: `getPureSemanticRecommendations()`

**Obohacení dat:**
- Funkce: `enrichProductsWithMetadata()`
- Načítá z `product_feed_2` nebo `products` podle `feed_source`

#### 2. n8nProductEmbeddingService.ts
**Cesta:** `src/services/n8nProductEmbeddingService.ts`

**N8N Webhook URL:**
```
https://n8n.srv980546.hstgr.cloud/webhook/3890ccdd-d09f-461b-b409-660d477023a3
```

**Payload struktura:**
```typescript
interface N8nProductPayload {
  product_code: string;
  product_name: string;
  description_short: string;
  description_long: string;
  feed_source: 'feed_1' | 'feed_2';
  category?: string;
  price?: number;
  url?: string;
}
```

**Funkce:**
- `sendProductToN8n()` - Odešle jeden produkt
- `sendProductsBatchToN8n()` - Batch zpracování s delay mezi požadavky
- `createFeed2Payload()` - Vytvoří payload pro Feed 2 produkt
- `testN8nWebhook()` - Testovací funkce

### Edge Function

#### sync-feed-2/index.ts
**Cesta:** `supabase/functions/sync-feed-2/index.ts`

**Proces:**
1. Stáhne XML feed z BEWIT API
2. Parsuje XML pomocí fast-xml-parser
3. Dekóduje HTML entity
4. Upsert produktů do `product_feed_2` (based on product_code)
5. Volá N8N webhook pro každý produkt (volitelné)
6. Loguje výsledky do `sync_logs`

**Konfigurace:**
```typescript
const FEED_URL = "https://bewit.love/feed/bewit?auth=xr32PRbrs554K";
const N8N_WEBHOOK_URL = "https://n8n.srv980546.hstgr.cloud/webhook/3890ccdd-d09f-461b-b409-660d477023a3";
```

**XML Parser:**
```typescript
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  processEntities: false,
  htmlEntities: false
});
```

**Batch zpracování:**
- Chunk size: 50 produktů
- Upsert pomocí `.upsert()` s `onConflict: 'product_code'`

**N8N webhook:**
- Volá se pro produkty s description_short nebo description_long
- Odesílá feed_source: 'feed_2'
- Počítá sent/failed pro reporting

## Databázové schéma

### Tabulka: product_feed_2

**Definice:**
```sql
CREATE TABLE IF NOT EXISTS public.product_feed_2 (
  id BIGSERIAL PRIMARY KEY,
  product_code VARCHAR(100) UNIQUE NOT NULL,
  product_name VARCHAR(500) NOT NULL,
  description_short TEXT,
  description_long TEXT,
  category VARCHAR(255),
  url TEXT,
  thumbnail TEXT,
  price DECIMAL(10, 2),
  currency VARCHAR(10) DEFAULT 'CZK',
  availability INTEGER DEFAULT 0,
  in_action INTEGER DEFAULT 0,
  sales_last_30_days INTEGER DEFAULT 0,
  sync_status VARCHAR(50) DEFAULT 'pending',
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexy:**
```sql
CREATE INDEX idx_product_feed_2_code ON product_feed_2(product_code);
CREATE INDEX idx_product_feed_2_category ON product_feed_2(category);
CREATE INDEX idx_product_feed_2_sync_status ON product_feed_2(sync_status);
CREATE INDEX idx_product_feed_2_sales ON product_feed_2(sales_last_30_days DESC);
```

**Trigger:**
```sql
CREATE TRIGGER product_feed_2_updated_at
  BEFORE UPDATE ON product_feed_2
  FOR EACH ROW
  EXECUTE FUNCTION update_product_feed_2_updated_at();
```

### Tabulka: product_embeddings (rozšíření)

**Nové sloupce:**
```sql
ALTER TABLE product_embeddings 
ADD COLUMN feed_source VARCHAR(50) DEFAULT 'feed_1';

ALTER TABLE product_embeddings 
ADD COLUMN description_short TEXT;

ALTER TABLE product_embeddings 
ADD COLUMN description_long TEXT;
```

**Index:**
```sql
CREATE INDEX idx_product_embeddings_feed_source 
ON product_embeddings(feed_source);
```

**Trigger pro search_text:**
```sql
CREATE TRIGGER product_embeddings_search_text
  BEFORE INSERT OR UPDATE ON product_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION generate_product_search_text();
```

**Logika generate_product_search_text():**
- Feed 2: Kombinuje product_name, description_short, description_long, category
- Feed 1: Kombinuje product_name, description, category

### SQL Funkce pro vyhledávání

**Soubor:** `update_hybrid_search_for_feed_2.sql`

#### 1. search_products_by_vector()
```sql
CREATE OR REPLACE FUNCTION search_products_by_vector(
  query_embedding vector(1536),
  similarity_threshold float DEFAULT 0.5,
  max_results int DEFAULT 10,
  filter_feed_source text DEFAULT NULL
)
```
- Čistě sémantické vyhledávání
- Cosine similarity
- Filtrování podle feed_source

#### 2. hybrid_product_search()
```sql
CREATE OR REPLACE FUNCTION hybrid_product_search(
  query_text text,
  query_embedding vector(1536),
  match_count int DEFAULT 10,
  full_text_weight float DEFAULT 1.0,
  semantic_weight float DEFAULT 1.0,
  rrf_k int DEFAULT 50,
  filter_feed_source text DEFAULT NULL
)
```
- Kombinuje full-text search a sémantické vyhledávání
- Reciprocal Rank Fusion (RRF) algoritmus
- Weighted scoring
- Filtrování podle feed_source

#### 3. get_product_chunks_for_rag()
```sql
CREATE OR REPLACE FUNCTION get_product_chunks_for_rag(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5,
  filter_feed_source text DEFAULT NULL
)
```
- Získání chunků pro RAG (Retrieval Augmented Generation)
- Pro chatbot kontextové generování odpovědí

#### 4. search_products_by_feed()
```sql
CREATE OR REPLACE FUNCTION search_products_by_feed(
  feed_source_filter text
)
```
- Vyhledání všech produktů z konkrétního feedu

## API & Endpointy

### Edge Function Endpoint

**URL:** `https://<project-ref>.supabase.co/functions/v1/sync-feed-2`

**Metoda:** POST

**Authorization:** Bearer token (Supabase auth)

**Request Body:** 
```json
{}
```

**Response (Success):**
```json
{
  "ok": true,
  "processed": 150,
  "inserted": 10,
  "updated": 140,
  "failed": 0,
  "webhooks": {
    "sent": 150,
    "failed": 0
  }
}
```

**Response (Error):**
```json
{
  "ok": false,
  "error": "Error message",
  "processed": 50,
  "inserted": 0,
  "updated": 0,
  "failed": 50
}
```

### N8N Webhook Endpoint

**URL:** `https://n8n.srv980546.hstgr.cloud/webhook/3890ccdd-d09f-461b-b409-660d477023a3`

**Metoda:** POST

**Content-Type:** application/json

**Payload:**
```json
{
  "product_code": "2347",
  "product_name": "009 - Čistý dech",
  "description_short": "**009 – Te Xiao Bi Min Gan Wan** Protáhněte **nosní dírky**...",
  "description_long": "### Tradičně byla tato směs oblíbená...",
  "feed_source": "feed_2",
  "category": "TČM - Tradiční čínská medicína",
  "price": 175.00,
  "url": "https://bewit.love/produkt/bewit-cisty-dech"
}
```

**N8N Workflow:**
1. Přijme payload
2. Kombinuje description_short + description_long
3. Volá OpenAI API pro vytvoření embeddings
4. Uloží do `product_embeddings` tabulky

### BEWIT Feed API

**URL:** `https://bewit.love/feed/bewit?auth=xr32PRbrs554K`

**Formát:** XML

**Struktura:**
```xml
<CHANNEL>
  <ITEM>
    <ITEM_ID>2347</ITEM_ID>
    <PRODUCTNAME>009 - Čistý dech</PRODUCTNAME>
    <DESCRIPTION_SHORT>...</DESCRIPTION_SHORT>
    <DESCRIPTION>...</DESCRIPTION>
    <URL>...</URL>
    <IMGURL>...</IMGURL>
    <PRICE_VAT>175</PRICE_VAT>
    <CATEGORYTEXT>TČM - Tradiční čínská medicína</CATEGORYTEXT>
    <AVAILABILITY>1</AVAILABILITY>
    <AKCNI>0</AKCNI>
    <SALES_30>6</SALES_30>
  </ITEM>
</CHANNEL>
```

## Datové toky

### Flow 1: Manuální synchronizace

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User Action                                               │
│    Admin klikne "🔄 Synchronizovat Feed 2 nyní"             │
│    Component: ProductSync.tsx                                │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Frontend Call                                             │
│    syncProductsFeed2()                                       │
│    - Získá user session token                                │
│    - Volá supabaseClient.functions.invoke('sync-feed-2')    │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Edge Function: sync-feed-2/index.ts                      │
│    a) Fetch XML z BEWIT API                                  │
│    b) Parse XML (fast-xml-parser)                            │
│    c) Decode HTML entities                                   │
│    d) Batch upsert do product_feed_2 (chunks of 50)         │
│    e) Pro každý produkt → N8N webhook call                   │
│    f) Log do sync_logs                                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. N8N Webhook                                               │
│    URL: n8n.srv980546.hstgr.cloud/webhook/...               │
│    - Přijme product payload                                  │
│    - Zkombinuje descriptions                                 │
│    - Volá OpenAI embeddings API                              │
│    - Uloží do product_embeddings                             │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Database Updates                                          │
│    - product_feed_2: raw produktové data                     │
│    - product_embeddings: vectors pro vyhledávání             │
│    - sync_logs: log synchronizace                            │
└─────────────────────────────────────────────────────────────┘
```

### Flow 2: Automatická denní synchronizace

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Cron Job (2:00 UTC denně)                                │
│    - Supabase pg_cron                                        │
│    - Setup: setup_cron_feed_2.sql                            │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. HTTP POST Request                                         │
│    - Volá Edge Function sync-feed-2                          │
│    - Používá service_role_key                                │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
                    [Stejný proces jako Flow 1, kroky 3-5]
```

### Flow 3: Chatbot produktová doporučení

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User Query v Chatbotu                                     │
│    - Uživatel zadá dotaz: "bolest hlavy"                     │
│    - Component: SanaChat.tsx                                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Hybrid Search Call                                        │
│    getHybridProductRecommendations(query, sessionId, limit,  │
│                                     useFeed1, useFeed2)      │
│    - Service: hybridProductService.ts                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Embedding Generation                                      │
│    - generateEmbedding(query)                                │
│    - Service: embeddingService.ts                            │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Database Search                                           │
│    RPC Call: hybrid_product_search()                         │
│    - query_text: "bolest hlavy"                              │
│    - query_embedding: [vector 1536]                          │
│    - filter_feed_source: 'feed_2' nebo null                  │
│    - Kombinuje full-text + semantic search                   │
│    - RRF ranking                                             │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Metadata Enrichment                                       │
│    enrichProductsWithMetadata()                              │
│    - Načte feed_source z product_embeddings                  │
│    - Podle feed_source načte z product_feed_2 nebo products  │
│    - Obohací o: name, description, price, url, image         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. UI Display                                                │
│    - ProductCarousel zobrazí top 6 produktů                  │
│    - Každý s personalizovaným doporučením                    │
│    - Gradient animace, price, add to cart                    │
└─────────────────────────────────────────────────────────────┘
```

## Závislosti

### Externí služby
1. **BEWIT API**
   - URL: `https://bewit.love/feed/bewit?auth=xr32PRbrs554K`
   - Formát: XML
   - Kritické: Bez tohoto API nelze synchronizovat

2. **N8N Webhook**
   - URL: `https://n8n.srv980546.hstgr.cloud/webhook/3890ccdd-d09f-461b-b409-660d477023a3`
   - Účel: Generování embeddings přes OpenAI
   - Fallback: Pokud selže, produkty se uloží bez embeddings

3. **OpenAI API** (via N8N)
   - Model: text-embedding-ada-002 (nebo novější)
   - Dimenze: 1536
   - Volá se přes N8N workflow

### NPM Balíčky
1. **fast-xml-parser** (v Edge Function)
   - Verze: npm:fast-xml-parser
   - Účel: Parsování XML feedu

2. **@supabase/supabase-js**
   - Pro Edge Function i frontend
   - Service role client v Edge Function

### Supabase komponenty
1. **Edge Functions**
   - sync-feed-2
   - Vyžaduje: SB_URL, SB_SERVICE_ROLE_KEY

2. **Database Tables**
   - product_feed_2
   - product_embeddings
   - sync_logs

3. **pg_cron Extension**
   - Pro denní automatickou synchronizaci

4. **RLS Policies**
   - Na všech tabulkách

### Interní závislosti
1. **embeddingService.ts** - Pro generování query embeddings
2. **supabase.ts** - Supabase client konfigurace
3. **ProductCarousel.tsx** - Pro zobrazení doporučení
4. **GradientText.tsx** - UI komponenta pro animace

## Bezpečnost

### RLS Policies

#### product_feed_2
```sql
-- Čtení pro všechny authenticated users
CREATE POLICY "Allow read access to all authenticated users"
ON product_feed_2 FOR SELECT TO authenticated USING (true);

-- Čtení pro anonymous users
CREATE POLICY "Allow read access to anonymous users"
ON product_feed_2 FOR SELECT TO anon USING (true);

-- Zápis pouze pro service role
CREATE POLICY "Allow insert/update for service role"
ON product_feed_2 FOR ALL TO service_role
USING (true) WITH CHECK (true);
```

#### Permissions
```sql
GRANT SELECT ON product_feed_2 TO anon;
GRANT SELECT ON product_feed_2 TO authenticated;
GRANT ALL ON product_feed_2 TO service_role;
GRANT USAGE, SELECT ON SEQUENCE product_feed_2_id_seq TO service_role;
```

### Autentizace

1. **BEWIT Feed URL**
   - Obsahuje auth token v query parametru
   - Token: `xr32PRbrs554K`
   - Pouze v Edge Function (server-side)

2. **Edge Function**
   - Používá Supabase auth bearer token
   - Nebo service_role_key pro cron
   - CORS headers nakonfigurovány

3. **N8N Webhook**
   - Public endpoint
   - Bez explicitní autentizace
   - Rate limiting na N8N straně

### Env Variables

**Edge Function (.env):**
```
SB_URL=https://<project-ref>.supabase.co
SB_SERVICE_ROLE_KEY=<service-role-key>
```

**Hardcoded (v Edge Function):**
- FEED_URL - s auth tokenem
- N8N_WEBHOOK_URL

## Automatizace

### Cron Job Setup

**Soubor:** `setup_cron_feed_2.sql`

**Schedule:** Denně ve 2:00 UTC
```sql
SELECT cron.schedule(
  'sync-product-feed-2-daily',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://<PROJECT-REF>.supabase.co/functions/v1/sync-feed-2',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    ),
    body := '{}'::jsonb
  )
  $$
);
```

**Monitoring:**
- Výsledky v tabulce `sync_logs`
- Dotaz: `SELECT * FROM sync_logs WHERE sync_type = 'product_feed_2' ORDER BY started_at DESC`

**Manuální trigger:**
- Přes UI: ProductSync.tsx → Tab "Feed 2" → Tlačítko
- Přes SQL: Direct invoke Edge Function

### Logování

**Tabulka:** `sync_logs`

**Struktura záznamu:**
```sql
{
  sync_type: 'product_feed_2',
  status: 'running' | 'success' | 'error',
  started_at: TIMESTAMPTZ,
  finished_at: TIMESTAMPTZ,
  records_processed: INT,
  records_inserted: INT,
  records_updated: INT,
  records_failed: INT,
  feed_url: TEXT,
  error_message: TEXT
}
```

## UI Komponenty

### ProductSync.tsx - Tabs interface

**Lokace:** Správa chatbotu → Produkty

**Features:**
- Tab 1: Feed 1 (zbozi.xml) - původní feed
- Tab 2: Feed 2 (Product Feed 2) - nový feed
- Pro každý tab:
  - Statistiky (počet produktů, poslední sync)
  - Tlačítko "Synchronizovat"
  - Status indikátor (success/error/running)

**State management:**
```typescript
const [activeTab, setActiveTab] = useState<'feed1' | 'feed2'>('feed1');
const [isSyncing, setIsSyncing] = useState(false);
const [lastSyncLog, setLastSyncLog] = useState<SyncLog | null>(null);
```

### ProductRecommendationButton.tsx

**Lokace:** V chatbot konverzaci (na konci bot odpovědi)

**Vzhled:**
- Gradient animated text: "Doporuč produkty"
- Ikona: Shopping bag SVG
- Loading state: Spinner + "Načítám doporučení..."
- Po kliknutí: ProductCarousel s produkty

**Interakce:**
1. Click → getButtonProductRecommendations()
2. Loading state
3. Zobrazí carousel s max 6 produkty
4. Každý produkt má personalizované doporučení
5. Tlačítko "Zavřít doporučení"

### ProductCarousel

**Props z Feed 2:**
```typescript
{
  id: product_code,
  product_code: product_code,
  product_name: product_name,
  description: recommendation, // Personalizované!
  product_url: url,
  image_url: thumbnail,
  price: price,
  currency: currency
}
```

**Features:**
- Scroll horizontálně
- Každý produkt: obrázek, název, cena, popis, CTA
- Max 6 produktů zobrazeno

## Testování & Monitoring

### Test manuální synchronizace
1. Přihlásit jako admin
2. Navigovat: Správa chatbotu → Produkty
3. Vybrat Tab "Feed 2"
4. Kliknout "🔄 Synchronizovat Feed 2 nyní"
5. Očekávaný výsledek: Success, statistiky se aktualizují

### Validace dat
```sql
-- Počet produktů v Feed 2
SELECT COUNT(*) FROM product_feed_2;

-- Posledních 10 synchronizací
SELECT * FROM sync_logs 
WHERE sync_type = 'product_feed_2' 
ORDER BY started_at DESC 
LIMIT 10;

-- Produkty s embeddings
SELECT COUNT(*) FROM product_embeddings 
WHERE feed_source = 'feed_2';

-- Produkty BEZ embeddings
SELECT p.product_code, p.product_name 
FROM product_feed_2 p
LEFT JOIN product_embeddings e ON p.product_code = e.product_code 
  AND e.feed_source = 'feed_2'
WHERE e.id IS NULL;
```

### Console logs
```javascript
// Frontend (ProductSync.tsx)
console.log('🔄 Spouštím synchronizaci Product Feed 2...');
console.log('✅ Synchronizace Feed 2 dokončena:', data);

// Edge Function (sync-feed-2/index.ts)
console.log('📥 Fetching XML feed from BEWIT...');
console.log('📊 Parsed products:', products.length);
console.log('📤 Odesílám na n8n webhook:', product.product_code);
console.log('✅ Synchronizace Product Feed 2 dokončena!');

// Hybrid Service (hybridProductService.ts)
console.log('🔍 Spouštím hybridní vyhledávání produktů pro dotaz:', query);
console.log('📋 Použité feedy: Feed1=', useFeed1, 'Feed2=', useFeed2);
console.log('✅ Hybridní vyhledávání našlo', allResults.length, 'produktů');
```

### Monitoring metriky
1. **Úspěšnost synchronizace:** % success vs error v sync_logs
2. **Počet produktů:** Růst product_feed_2 tabulky
3. **Embeddings coverage:** % produktů s embeddings
4. **Response time:** Doba trvání sync job
5. **N8N webhooks:** sent vs failed ratio

## Obnova při selhání

### Scénář 1: Poškozená tabulka product_feed_2
**Řešení:**
1. Spustit `create_product_feed_2_table.sql`
2. Spustit manuální synchronizaci z UI
3. Validovat data pomocí SQL queries

### Scénář 2: Chybějící embeddings
**Řešení:**
1. Identifikovat produkty bez embeddings
2. Re-trigger N8N webhook pro tyto produkty
3. Nebo použít batch script z `n8nProductEmbeddingService.ts`

### Scénář 3: Edge Function selhání
**Řešení:**
1. Zkontrolovat logs: Supabase Dashboard → Functions → sync-feed-2
2. Ověřit env variables (SB_URL, SB_SERVICE_ROLE_KEY)
3. Re-deploy: `supabase functions deploy sync-feed-2`

### Scénář 4: N8N webhook nedostupný
**Řešení:**
- Produkty se uloží do product_feed_2
- Embeddings se nevytvoří (lze doplnit později)
- Není kritické pro základní funkčnost

## Známá omezení

1. **N8N Webhook timeout:** Dlouhé synchronizace (>1000 produktů) mohou způsobit timeout
   - Řešení: Batch processing s delay

2. **Markdown v popisech:** Zůstává zachován (není renderován v některých částech UI)
   - Záměr: Pro budoucí rich text zobrazení

3. **Duplicitní volání:** Při rychlém opakovaném kliknutí možné duplicitní synchronizace
   - Řešení: Loading state blokuje další kliky

4. **Rate limiting:** OpenAI API přes N8N má rate limity
   - Řešení: Delay mezi webhook calls v Edge Function

## Related dokumentace

- `IMPLEMENTACE_FEED_2_SOUHRN.md` - Souhrn implementace
- `PRODUCT_FEED_2_README.md` - Detailní README
- `N8N_RESPONSE_FORMAT.md` - Formát N8N odpovědí
- Email template setup pro admin notifikace (budoucí feature)

---

**Status:** ✅ Plně funkční a testováno  
**Poslední aktualizace:** 2024-11-26  
**Vlastník:** Admin/Developer  
**Schváleno:** ✅ Ano


