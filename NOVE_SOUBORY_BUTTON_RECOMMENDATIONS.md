# 📁 Nové soubory - Produktové doporučení na tlačítko

## ✅ Vytvořené soubory

### 🔧 Backend / Service Layer

#### 1. `src/services/productButtonRecommendationService.ts`
**Účel:** Service pro komunikaci s N8N webhookem a obohacení produktů

**Exportuje:**
- `getButtonProductRecommendations(context)` - Hlavní funkce pro získání doporučení
- `testButtonRecommendationsWebhook()` - Test funkce
- `ConversationContext` - Interface pro kontext
- `EnrichedProduct` - Interface pro obohacený produkt
- `ProductRecommendation` - Interface pro doporučení z N8N
- `N8NButtonRecommendationResponse` - Interface pro N8N response

**Funkcionalita:**
- Volání N8N webhooku s kontextem konverzace
- Automatická konverze různých N8N formátů
- Obohacení produktů z `product_feed_2`
- Error handling a fallback

### 🎨 Frontend / UI Components

#### 2. `src/components/ProductRecommendationButton.tsx`
**Účel:** React komponenta tlačítka pro produktová doporučení

**Exportuje:**
- `ProductRecommendationButton` - Hlavní komponenta
- `ProductRecommendationButtonProps` - Interface pro props

**Props:**
```typescript
interface ProductRecommendationButtonProps {
  userQuery: string;        // Poslední dotaz uživatele
  botResponse: string;      // Aktuální odpověď chatbota
  sessionId: string;        // Session ID
  onProductsLoaded?: (products: EnrichedProduct[]) => void;
  className?: string;
}
```

**Funkcionalita:**
- Tlačítko s ikonou a loading state
- Volání API při kliknutí
- Error handling s chybovými zprávami
- Zobrazení carousel s produkty
- Možnost zavření carousel

#### 3. `src/components/ProductRecommendationButton/index.ts`
**Účel:** Export file pro snadnější import

**Použití:**
```typescript
import ProductRecommendationButton from '@/components/ProductRecommendationButton';
```

### 💾 Database

#### 4. `add_product_button_recommendations.sql`
**Účel:** SQL migrace pro přidání nového sloupce

**Co dělá:**
1. Přidává sloupec `product_button_recommendations` (BOOLEAN)
2. Nastavuje default hodnotu `false`
3. Aktualizuje existující záznamy
4. Validační queries

**Spuštění:**
```bash
psql -h db.supabase.co -U postgres -d postgres < add_product_button_recommendations.sql
```

### 📚 Dokumentace

#### 5. `PRODUCT_BUTTON_RECOMMENDATIONS.md`
**Účel:** Kompletní technická dokumentace

**Obsah:**
- Přehled funkcionality
- Implementační detaily
- API dokumentace
- N8N webhook setup
- Workflow diagramy
- Data flow
- UI komponenty
- Rozdíly oproti běžnému doporučení
- Testování
- Troubleshooting

#### 6. `PRODUCT_BUTTON_QUICK_START.md`
**Účel:** Rychlý návod na zprovoznění

**Obsah:**
- 4-krokový setup guide
- Příklady použití
- N8N workflow setup
- Testování
- Troubleshooting
- Seznam všech souborů

#### 7. `IMPLEMENTACE_BUTTON_RECOMMENDATIONS_SOUHRN.md`
**Účel:** Souhrn celé implementace

**Obsah:**
- Co bylo implementováno
- Nové a upravené soubory
- Funkcionalita a workflow
- Databázová struktura
- UI/UX návrh
- Rozdíly oproti běžnému doporučení
- Checklist pro nasazení
- Debug návod
- Status implementace

#### 8. `NOVE_SOUBORY_BUTTON_RECOMMENDATIONS.md`
**Účel:** Tento soubor - seznam všech nových souborů

## ♻️ Upravené soubory

### 1. `src/services/chatbotSettingsService.ts`
**Změny:**
- Přidán `product_button_recommendations: boolean` do interface `ChatbotSettings`
- Přidán `product_button_recommendations: boolean` do interface `CreateChatbotSettingsData`
- Přidán `product_button_recommendations?: boolean` do interface `UpdateChatbotSettingsData`

**Řádky:**
- Interface `ChatbotSettings` - řádek ~15
- Interface `CreateChatbotSettingsData` - řádek ~51
- Interface `UpdateChatbotSettingsData` - řádek ~67

### 2. `src/components/ChatbotManagement.tsx`
**Změny:**
- Přidán `product_button_recommendations: boolean` do interface `Chatbot.features`
- Přidán checkbox v UI pro novou funkci
- Aktualizována funkce `toggleChatbotFunction` pro podporu nové funkce
- Aktualizováno zobrazení aktivních funkcí

**Řádky:**
- Interface `Chatbot` - řádek ~79
- Mock data - řádky ~110, ~119
- Toggle funkce - řádek ~220
- UI checkbox - řádky ~454-469
- Feature display - řádek ~336
- Chat launch - řádek ~605

## 📦 Struktura souborů

```
app/
├── src/
│   ├── services/
│   │   ├── chatbotSettingsService.ts           (upraveno)
│   │   └── productButtonRecommendationService.ts  (NOVÉ)
│   │
│   └── components/
│       ├── ChatbotManagement.tsx               (upraveno)
│       ├── ProductRecommendationButton.tsx     (NOVÉ)
│       └── ProductRecommendationButton/
│           └── index.ts                        (NOVÉ)
│
├── add_product_button_recommendations.sql      (NOVÉ)
├── PRODUCT_BUTTON_RECOMMENDATIONS.md           (NOVÉ)
├── PRODUCT_BUTTON_QUICK_START.md               (NOVÉ)
├── IMPLEMENTACE_BUTTON_RECOMMENDATIONS_SOUHRN.md (NOVÉ)
└── NOVE_SOUBORY_BUTTON_RECOMMENDATIONS.md      (NOVÉ)
```

## 📊 Statistika změn

| Typ | Počet |
|-----|-------|
| **Nové soubory** | 8 |
| **Upravené soubory** | 2 |
| **Celkem řádků kódu** | ~700 |
| **Celkem řádků dokumentace** | ~1500 |

### Breakdown:

**Backend/Service (TypeScript):**
- `productButtonRecommendationService.ts`: ~280 řádků

**Frontend/UI (React/TypeScript):**
- `ProductRecommendationButton.tsx`: ~270 řádků
- `index.ts`: ~5 řádků

**Database (SQL):**
- `add_product_button_recommendations.sql`: ~50 řádků

**Dokumentace (Markdown):**
- `PRODUCT_BUTTON_RECOMMENDATIONS.md`: ~550 řádků
- `PRODUCT_BUTTON_QUICK_START.md`: ~400 řádků
- `IMPLEMENTACE_BUTTON_RECOMMENDATIONS_SOUHRN.md`: ~500 řádků
- `NOVE_SOUBORY_BUTTON_RECOMMENDATIONS.md`: ~200 řádků (tento soubor)

**Upravené soubory:**
- `chatbotSettingsService.ts`: +3 řádky (3 interface updates)
- `ChatbotManagement.tsx`: +50 řádků (UI checkbox + logic)

## 🎯 Klíčové funkce

### Service Layer
```typescript
// Hlavní API funkce
getButtonProductRecommendations({
  userQuery: string,
  botResponse: string,
  sessionId: string
}) -> {
  text: string,
  products: EnrichedProduct[]
}
```

### UI Component
```tsx
// React komponenta
<ProductRecommendationButton
  userQuery="user's question"
  botResponse="bot's response"
  sessionId="session-id"
  onProductsLoaded={(products) => {}}
/>
```

### Database
```sql
-- Nový sloupec
product_button_recommendations BOOLEAN DEFAULT false
```

## ✅ Checklist pro použití

### Pro vývojáře:
- [ ] Zkontrolovat všechny nové soubory jsou přítomné
- [ ] Spustit SQL migraci
- [ ] Aktualizovat N8N webhook URL
- [ ] Testovat service funkci
- [ ] Integrovat komponenty do chatbot UI
- [ ] Deploy do produkce

### Pro administrátory:
- [ ] Spustit SQL script v Supabase
- [ ] Nakonfigurovat N8N workflow
- [ ] Aktivovat funkci v nastavení chatbota
- [ ] Otestovat v prohlížeči

### Pro testery:
- [ ] Manuální test tlačítka
- [ ] Zkontrolovat carousel display
- [ ] Ověřit personalizovaná doporučení
- [ ] Test error handling

## 🔗 Quick Links

- [📚 Kompletní dokumentace](./PRODUCT_BUTTON_RECOMMENDATIONS.md)
- [🚀 Quick Start](./PRODUCT_BUTTON_QUICK_START.md)
- [📋 Souhrn implementace](./IMPLEMENTACE_BUTTON_RECOMMENDATIONS_SOUHRN.md)
- [🔧 Service kód](./src/services/productButtonRecommendationService.ts)
- [🎨 UI komponenta](./src/components/ProductRecommendationButton.tsx)
- [💾 SQL migrace](./add_product_button_recommendations.sql)

## 📝 Git commands

```bash
# Zobrazit status
git status

# Přidat nové soubory
git add src/services/productButtonRecommendationService.ts
git add src/components/ProductRecommendationButton.tsx
git add src/components/ProductRecommendationButton/index.ts
git add add_product_button_recommendations.sql
git add PRODUCT_BUTTON_RECOMMENDATIONS.md
git add PRODUCT_BUTTON_QUICK_START.md
git add IMPLEMENTACE_BUTTON_RECOMMENDATIONS_SOUHRN.md
git add NOVE_SOUBORY_BUTTON_RECOMMENDATIONS.md

# Přidat upravené soubory
git add src/services/chatbotSettingsService.ts
git add src/components/ChatbotManagement.tsx

# Commit
git commit -m "feat: Produktové doporučení na tlačítko

- Přidána nová funkce pro chatboty
- Service pro N8N webhook komunikaci
- UI komponenta s tlačítkem
- SQL migrace pro databázi
- Kompletní dokumentace

Closes #XXX"

# Push
git push origin main
```

---

**Vytvořeno:** 2025-11-26  
**Celkem nových souborů:** 8  
**Celkem upravených souborů:** 2  
**Status:** ✅ Připraveno k nasazení

