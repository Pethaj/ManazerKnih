# ✅ Edge Function Nasazena - screen-products

## 🎉 Co bylo provedeno

Úspěšně jsem nasadil **Supabase Edge Function** pro screening produktů pomocí MCP!

### Edge Function Details

- **Název:** `screen-products`
- **Status:** ✅ **ACTIVE**
- **Verze:** 1
- **ID:** `cb88862f-9116-4957-a827-f365c54d0da3`
- **URL:** `https://modopafybeslbcqjxsve.supabase.co/functions/v1/screen-products`

### Co dělá?

1. Přijímá text z frontendu
2. Volá OpenRouter GPT-4o-mini (klíč je v Supabase secrets)
3. Analyzuje text na produkty/témata z čínské medicíny
4. Vrací JSON array s nálezy

### API klíč

✅ **Automaticky dostupný** z Supabase Environment Secrets:
- Klíč: `OPENROUTER_API_KEY`
- Stejný klíč jako používá `extract-metadata-ai` funkce
- **Není potřeba nastavovat v .env!**

## 🔧 Změny v kódu

### Frontend Service

**Soubor:** `src/services/inlineProductScreeningService.ts`

**Změny:**
- ❌ Odstraněn přímý přístup k OpenRouter API
- ❌ Odstraněn VITE_OPENROUTER_API_KEY requirement
- ✅ Přidáno volání Supabase Edge Function
- ✅ Zjednodušená implementace

**Nový flow:**
```typescript
// Frontend
await supabase.functions.invoke('screen-products', {
  body: { text: text }
});

// Edge Function (server-side)
// Má přístup k OPENROUTER_API_KEY z secrets
// Volá OpenRouter API
// Vrací výsledky
```

### Edge Function

**Soubor:** `supabase/functions/screen-products/index.ts`

**Features:**
- CORS support
- Input validace (prázdný text, krátký text)
- OpenRouter GPT-4o-mini integration
- JSON parsing s fallbackem
- Error handling
- Detailed logging

## 🧪 Jak testovat?

### Automatický test (doporučeno)

Otevři aplikaci a:
1. Aktivuj "Inline produktové linky" v chatbot nastavení
2. Napiš: **"Mám bolest hlavy, co mi poradíš?"**
3. Otevři console (F12)
4. Sleduj výstup:

```
🔍 Spouštím screening produktů v textu...
📡 Volám Supabase Edge Function...
✅ Edge Function response received
✅ Screening dokončen: 3 produktů/témat nalezeno
📦 Nalezené produkty/témata: ["009 - Čistý dech", "bolest hlavy", "nosní průchodnost"]
```

### Manuální test (curl)

```bash
curl -X POST \
  'https://modopafybeslbcqjxsve.supabase.co/functions/v1/screen-products' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer eyJhbGciOi...' \
  -d '{
    "text": "Pro bolest hlavy doporučuji wan 009 - Čistý dech."
  }'
```

**Očekávaná odpověď:**
```json
{
  "success": true,
  "products": ["009 - Čistý dech", "bolest hlavy"]
}
```

## 📊 Výhody tohoto řešení

### ✅ Bezpečnost
- API klíč není v frontendu
- API klíč není v .env souboru
- API klíč je pouze na serveru (Supabase secrets)

### ✅ Jednoduchost
- Není potřeba nastavovat .env
- Automaticky funguje pro všechny vývojáře
- Jeden zdroj pravdy (Supabase secrets)

### ✅ Údržba
- Změna API klíče na jednom místě (Supabase Dashboard)
- Okamžitě platí pro všechny
- Není potřeba redistribuovat .env soubory

### ✅ Monitoring
- Všechny requesty viditelné v Supabase Edge Function logs
- Snadný debug
- Centralizované error tracking

## 📝 Co dál?

### ✅ Krok 1: HOTOVO
- Edge Function nasazena ✅
- Frontend aktualizován ✅
- Dokumentace aktualizována ✅

### 🔄 Krok 2: Připraveno k testování
- Otestuj v reálném chatbotu
- Ověř výsledky v console
- Potvrď funkčnost

### 🚀 Krok 3: Až bude hotovo
- Mapování na produkty z databáze
- UI zobrazení
- Separátní nastavení v DB

---

**Status:** ✅ Připraveno k testování!
**Nasazeno:** 3. prosince 2025




