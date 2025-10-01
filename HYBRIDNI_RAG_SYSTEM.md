# 🚀 Hybridní RAG Vyhledávací Systém

## 📋 Přehled

Hybridní RAG systém kombinuje doporučení produktů z N8N webhooku s detailními informacemi z Supabase tabulky `products`. Webhook poskytuje AI-generovaná doporučení s ID produktů, zatímco Supabase poskytuje strukturované produktové údaje.

## 🔄 Architektura Systému

```
Uživatelský dotaz
       ↓
🌐 N8N Webhook (AI doporučení)
   Vrátí: [
     { id: "1002324245001", recommendation: "Text doporučení" },
     { id: "1002324245002", recommendation: "Další doporučení" }
   ]
       ↓
🗄️ Supabase tabulka `products`
   Dotaz: SELECT * FROM products WHERE product_code IN (...)
   Vrátí: detailní informace (název, cena, URL, obrázek)
       ↓
🔗 Kombinování dat
   Výsledek: kompletní produktové karty pro carousel
```

## 📁 Struktura Souborů

### `src/services/hybridProductService.ts`
Hlavní služba pro hybridní vyhledávání obsahující:

- **`getHybridProductRecommendations()`** - Hlavní funkce pro získání doporučení
- **`getProductRecommendationsFromWebhook()`** - Komunikace s N8N webhookem
- **`getProductsFromSupabase()`** - Dotazování Supabase databáze
- **`combineWebhookWithSupabaseData()`** - Kombinování dat z obou zdrojů
- **`extractProductIdsFromWebhookResponse()`** - Extrakce ID z webhook odpovědi

### Integrace v `src/components/SanaChat/SanaChat.tsx`
- Import hybridní služby
- Náhrada starého webhook systému
- Konverze na `ProductRecommendation` formát

## 🛠️ Používané Technologie

- **N8N Webhook**: AI-driven produktová doporučení
- **Supabase**: PostgreSQL databáze produktů
- **TypeScript**: Typová bezpečnost
- **React**: UI komponenty

## 📊 Datové Struktury

### Webhook Response
```typescript
interface WebhookProductData {
  id: string;                // ID produktu (product_code)
  recommendation: string;    // AI doporučení
}
```

### Supabase Product
```sql
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    product_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    category VARCHAR(200),
    price DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'CZK',
    product_url VARCHAR(1000),
    image_url VARCHAR(1000),
    -- další sloupce...
);
```

### Kombinovaný Výsledek
```typescript
interface HybridProductRecommendation {
  id: number;
  product_code: string;
  product_name: string;        // Z Supabase
  description: string | null;  // Z webhooku (doporučení)
  category: string | null;     // Z Supabase
  price: number | null;        // Z Supabase
  currency: string;            // Z Supabase
  product_url: string | null;  // Z Supabase
  image_url: string | null;    // Z Supabase
  similarity_score?: number;   // Generované
  webhook_recommendation: string; // Původní doporučení
}
```

## 🚀 Použití

### Základní použití
```typescript
import { getHybridProductRecommendations } from './services/hybridProductService';

const products = await getHybridProductRecommendations(
  "Doporuč mi něco na bolesti kloubů",
  "session_123"
);
```

### Testování
```typescript
import { testHybridProductSearch } from './services/hybridProductService';

// Spustí kompletní test systému
const results = await testHybridProductSearch("Test dotaz");
```

## 🔧 Konfigurace

### Webhook URL
```typescript
const WEBHOOK_URL = 'https://n8n.srv980546.hstgr.cloud/webhook/cd6b668b-1e35-4018-9bf4-28d0926b023b';
```

### Supabase Connection
```typescript
const SUPABASE_URL = 'https://umxkjdllhlkclrplxdxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

## 🧪 Testování

### HTML Test Interface
Soubor `test-hybrid-system.html` poskytuje webové rozhraní pro testování:

1. **Test Webhooku** - Ověří komunikaci s N8N
2. **Test Supabase** - Ověří databázové dotazy
3. **Test Hybridního Systému** - Kompletní end-to-end test

### Spuštění testů
```bash
# Otevřete v prohlížeči
open test-hybrid-system.html

# Nebo spusťte lokální server
python -m http.server 8000
# Navigujte na http://localhost:8000/test-hybrid-system.html
```

## 📝 Podporované Formáty Webhook Odpovědí

### Formát 1: Strukturovaný Array
```json
[{
  "data": [
    {
      "id": "1002324245001",
      "doporuceni": "Výborný pro bolesti kloubů"
    }
  ]
}]
```

### Formát 2: Přímý Array
```json
[
  {
    "product_id": "1002324245001",
    "recommendation": "Doporučený produkt"
  }
]
```

### Formát 3: Textový Output
```json
{
  "output": "Doporučuji produkt ID: 1002324245001 - skvělý na bolesti..."
}
```

## 🔍 Extrakce ID Produktů

Systém dokáže extrahovat product_code z různých formátů:

- **Strukturovaná data**: `id`, `product_id`, `product_code`, `SKU`
- **Textový obsah**: Regex vzory pro `ID: 123456`, `Kód: 123456`
- **Fallback**: Dlouhá čísla (8+ číslic) jako potenciální ID

## ⚠️ Error Handling

### Webhook Chyby
- Network timeout
- Neplatná JSON odpověď
- Chybějící data

### Supabase Chyby
- Databázové připojení
- Nevalidní dotazy
- Chybějící produkty

### Fallback Strategie
- Produkty nezalezené v Supabase se zobrazí s omezenými informacemi
- Webhook doporučení se použije jako popis produktu
- Přidá se mock kategorie a metadata

## 🔄 Vývojové Workflow

1. **Webhook vrátí ID produktů** s doporučeními
2. **Extrakce ID** z různých formátů odpovědi
3. **Supabase dotaz** `WHERE product_code IN (...)`
4. **Kombinování dat** webhook + Supabase
5. **Formátování** pro `ProductCarousel` komponentu

## 📈 Budoucí Rozšíření

### V1.1
- [ ] Cache produktových dat
- [ ] Metrics a monitoring
- [ ] Lepší error recovery

### V1.2
- [ ] Podpora více webhook endpointů
- [ ] Personalizace doporučení
- [ ] A/B testing frameworku

### V1.3
- [ ] Machine learning scoring
- [ ] Pokročilé filtry
- [ ] Real-time updates

## 🐛 Debugging

### Console Logy
Systém poskytuje detailní logy pro debugging:
```
🚀 Spouštím hybridní vyhledávání produktů pro: "dotaz"
🌐 Zasílám dotaz na webhook: "dotaz"
📥 Webhook response: {...}
📦 Zpracovávám X produktů z webhooku
✅ Extrahováno ID: 123456, doporučení: text...
🔍 Hledám produkty v Supabase podle ID: [...]
✅ Nalezeno X produktů v Supabase
🔗 Kombinuji X webhook doporučení s X Supabase produkty
✅ Kombinováno: Název produktu s doporučením
🎯 Celkem zkombinováno X produktů
```

### Test Funkce
```typescript
// Spustí kompletní test s debug výstupem
await testHybridProductSearch("Test dotaz");
```

## 📞 Podpora

Pro technické dotazy kontaktujte:
- **Vývojový tým**: dev@bewit.eu
- **Dokumentace**: Tento soubor a komentáře v kódu
- **Issues**: GitHub issues v repository
