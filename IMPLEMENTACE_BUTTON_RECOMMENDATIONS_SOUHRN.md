# 📋 Implementace: Produktové doporučení na tlačítko - Souhrn

## 🎯 Co bylo implementováno

Nová funkce **"Produktové doporučení na tlačítko"** umožňuje chatbotům zobrazit tlačítko na konci odpovědi. Po kliknutí se zavolá N8N webhook s kontextem konverzace (poslední dotaz + aktuální odpověď) a vygeneruje se carousel s personalizovanými produkty.

## 📁 Nové soubory

### 1. **Service pro API komunikaci**
```
src/services/productButtonRecommendationService.ts
```
- Komunikace s N8N webhookem
- Obohacení produktů z `product_feed_2`
- Automatická konverze N8N response formátu
- Test funkce

### 2. **UI komponenta tlačítka**
```
src/components/ProductRecommendationButton.tsx
src/components/ProductRecommendationButton/index.ts
```
- React komponenta s tlačítkem
- Loading states
- Error handling
- Zobrazení carousel s produkty

### 3. **SQL migrace**
```
add_product_button_recommendations.sql
```
- Přidává sloupec `product_button_recommendations` do `chatbot_settings`
- Default hodnota: `false`

### 4. **Dokumentace**
```
PRODUCT_BUTTON_RECOMMENDATIONS.md           - Kompletní dokumentace
PRODUCT_BUTTON_QUICK_START.md               - Quick start guide
IMPLEMENTACE_BUTTON_RECOMMENDATIONS_SOUHRN.md  - Tento soubor
```

## 📝 Upravené soubory

### 1. **Chatbot Settings Service**
```typescript
// src/services/chatbotSettingsService.ts

export interface ChatbotSettings {
  // ... existující pole
  product_button_recommendations: boolean;  // 🆕 NOVÉ
}

export interface CreateChatbotSettingsData {
  // ... existující pole
  product_button_recommendations: boolean;  // 🆕 NOVÉ
}

export interface UpdateChatbotSettingsData {
  // ... existující pole
  product_button_recommendations?: boolean;  // 🆕 NOVÉ
}
```

### 2. **ChatbotManagement komponenta**
```typescript
// src/components/ChatbotManagement.tsx

interface Chatbot {
  features: {
    product_recommendations: boolean;
    product_button_recommendations: boolean;  // 🆕 NOVÉ
    book_database: boolean;
  };
}

// Nový checkbox v UI
<label style={styles.settingLabel}>
  <input
    type="checkbox"
    checked={chatbot.product_button_recommendations}
    onChange={() => toggleChatbotFunction(chatbot.chatbot_id, 'product_button_recommendations')}
  />
  <IconProduct />
  Produktové doporučení na tlačítko
</label>
```

## 🔧 Funkcionalita

### Workflow

```
1. Uživatel se zeptá
   👤 "Potřebuji něco na bolest hlavy"

2. Chatbot odpoví
   🤖 "Pro bolest hlavy doporučuji..."

3. Zobrazí se tlačítko
   [💊 Doporučit produkty]

4. Po kliknutí
   → Zavolá N8N s kontextem
   → GPT vybere produkty
   → Zobrazí carousel s personalizovanými doporučeními
```

### API Flow

```typescript
// 1. Kontext do N8N
{
  userQuery: "bolest hlavy",
  botResponse: "Pro bolest hlavy...",
  session_id: "session-123"
}

// 2. Response z N8N
{
  data: [
    {
      "ID produktu": "2318",
      "Doporuceni": "Tato směs..."
    }
  ]
}

// 3. Automatická konverze na standardní formát
{
  text: "Na základě konverzace jsem pro vás vybral 5 produktů:",
  products: [
    {
      product_code: "2318",
      recommendation: "Tato směs..."
    }
  ]
}

// 4. Obohacení z product_feed_2
{
  product_code: "2318",
  product_name: "Wan 015",
  recommendation: "Tato směs...",  // ⭐ Z N8N
  url: "https://bewit.love/...",
  image_url: "https://...",
  price: 189,
  currency: "CZK"
}
```

## 📊 Databázová struktura

### Před migrací
```sql
CREATE TABLE chatbot_settings (
  chatbot_id TEXT PRIMARY KEY,
  product_recommendations BOOLEAN DEFAULT false,
  book_database BOOLEAN DEFAULT false,
  -- ... další sloupce
);
```

### Po migraci
```sql
CREATE TABLE chatbot_settings (
  chatbot_id TEXT PRIMARY KEY,
  product_recommendations BOOLEAN DEFAULT false,
  product_button_recommendations BOOLEAN DEFAULT false,  -- 🆕 NOVÉ
  book_database BOOLEAN DEFAULT false,
  -- ... další sloupce
);
```

## 🎨 UI/UX

### Nastavení v administraci

```
🤖 Sana Chat                              [AKTIVNÍ]
────────────────────────────────────────────────

🔧 Základní funkce
  ☐ Produktová doporučení
     Zobrazovat relevantní produkty na základě uživatelských dotazů
     
  ☑ Produktové doporučení na tlačítko  ← NOVÉ
     Zobrazit tlačítko "Doporučit produkty" na konci odpovědi chatbota
     
  ☑ Databáze knih
     Vyhledávat v databázi lékařské literatury a dokumentů

[💾 Uložit nastavení]
```

### Tlačítko v chatu

```
┌─────────────────────────────────────┐
│ 🤖 Bot                               │
│ Pro bolest hlavy doporučuji...       │
│                                      │
│ [💊 Doporučit produkty]  ← Tlačítko│
└─────────────────────────────────────┘
```

### Po kliknutí

```
┌─────────────────────────────────────┐
│ 🤖 Bot                               │
│ Pro bolest hlavy doporučuji...       │
│                                      │
│ ┌─────────────────────────────────┐ │
│ │ 📦 Doporučené produkty          │ │
│ │                                 │ │
│ │ [Produkt 1] [Produkt 2] ...    │ │
│ │                                 │ │
│ │        [Zavřít doporučení]     │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

## 🔍 Rozdíl oproti běžnému produktovému doporučení

| Aspekt | Běžné doporučení | Button doporučení |
|--------|------------------|-------------------|
| **Trigger** | Automaticky | Na tlačítko |
| **Kontext** | Pouze user query | Query + Bot response |
| **Timing** | Okamžitě | Když user chce |
| **Use case** | Přímé dotazy | Návazná doporučení |
| **Příklad** | "Wany na bolest" | Obecný dotaz → tlačítko |

## ✅ Checklist pro nasazení

### 1. Databáze
- [ ] Spustit `add_product_button_recommendations.sql`
- [ ] Zkontrolovat sloupec v tabulce
- [ ] Ověřit default hodnoty

### 2. N8N
- [ ] Vytvořit nový webhook workflow
- [ ] Nastavit GPT prompt
- [ ] Připojit Supabase query
- [ ] Formátovat response
- [ ] Zkopírovat webhook URL

### 3. Frontend
- [ ] Aktualizovat `BUTTON_RECOMMENDATIONS_WEBHOOK_URL` v service
- [ ] Deploy nové verze
- [ ] Aktivovat funkci v administraci

### 4. Testing
- [ ] Test servicu (`testButtonRecommendationsWebhook()`)
- [ ] Manuální test v prohlížeči
- [ ] Zkontrolovat console logs
- [ ] Ověřit carousel display

## 📦 Import & Použití

### Import servicu
```typescript
import { 
  getButtonProductRecommendations,
  testButtonRecommendationsWebhook 
} from '@/services/productButtonRecommendationService';
```

### Import komponenty
```typescript
import ProductRecommendationButton from '@/components/ProductRecommendationButton';
// nebo
import { ProductRecommendationButton } from '@/components/ProductRecommendationButton';
```

### Použití v chatbot UI
```tsx
{chatbotSettings.product_button_recommendations && (
  <ProductRecommendationButton
    userQuery={lastUserQuery}
    botResponse={currentBotResponse}
    sessionId={sessionId}
    onProductsLoaded={(products) => {
      console.log('Načteno:', products.length);
    }}
  />
)}
```

## 🧪 Testování

### Automatický test
```typescript
const success = await testButtonRecommendationsWebhook();
// Vrátí: true/false
```

### Manuální test
1. Administrace → Chatboty
2. Aktivuj "Produktové doporučení na tlačítko"
3. Ulož nastavení
4. Otevři chat
5. Napiš dotaz
6. Klikni na tlačítko
7. Zkontroluj produkty

## 🐛 Debug

### Console logs

Při normálním běhu uvidíš:
```
🔘 Kliknutí na tlačítko produktových doporučení
📝 User Query: bolest hlavy
🤖 Bot Response: Pro bolest hlavy...
🚀 Volám N8N webhook...
✅ N8N webhook raw response: {"data":[...
🔧 Rozbaluji N8N response...
✅ Konvertováno na standardní formát
📊 Obohacuji produkty o metadata...
✅ Načteno 6 metadat z product_feed_2
✅ Produkty úspěšně obohaceny
🎉 Produktová doporučení úspěšně získána
📦 Počet produktů: 6
```

### Při chybě:
```
❌ N8N webhook error: 500 Internal Server Error
❌ Chyba při volání N8N webhooku
❌ Kritická chyba při získávání produktových doporučení
```

## 📈 Další možná vylepšení

- [ ] Cache pro N8N response (aby se při opakovaném kliknutí nemuselo znovu volat)
- [ ] Možnost customizovat text tlačítka v nastavení
- [ ] Analytics - trackování kliknutí na tlačítko
- [ ] A/B testing - měřit konverzi s/bez tlačítka
- [ ] Inteligentní zobrazení - tlačítko jen když má smysl (NLP analýza)

## 📚 Související dokumentace

- [Kompletní dokumentace](./PRODUCT_BUTTON_RECOMMENDATIONS.md)
- [Quick Start Guide](./PRODUCT_BUTTON_QUICK_START.md)
- [Product Chat](./PRODUCT_CHAT_IMPLEMENTATION.md)
- [N8N Response Format](./N8N_RESPONSE_FORMAT.md)

## 🎯 Status implementace

| Komponenta | Status |
|-----------|--------|
| Database Schema | ✅ Hotovo |
| Service Layer | ✅ Hotovo |
| UI Component | ✅ Hotovo |
| Admin UI | ✅ Hotovo |
| SQL Migration | ✅ Hotovo |
| Documentation | ✅ Hotovo |
| N8N Webhook | ⚠️ Vyžaduje konfiguraci |
| Testing | ⚠️ Vyžaduje N8N setup |
| Deployment | ⚠️ Čeká na testing |

## 🚀 Co zbývá udělat

1. **Nakonfigurovat N8N workflow**
   - Vytvořit webhook
   - Nastavit GPT prompt
   - Zkopírovat URL

2. **Aktualizovat webhook URL v kódu**
   - `src/services/productButtonRecommendationService.ts`
   - Řádek 10: `BUTTON_RECOMMENDATIONS_WEBHOOK_URL`

3. **Spustit SQL migraci**
   - V Supabase SQL Editor
   - Nebo z CLI

4. **Otestovat funkci**
   - Automatický test
   - Manuální test v prohlížeči

5. **Deploy do produkce**
   - Build & deploy frontend
   - Aktivovat v administraci

---

**Implementováno:** 2025-11-26  
**Autor:** AI Assistant  
**Verze:** 1.0  
**Status:** ✅ Ready for testing

