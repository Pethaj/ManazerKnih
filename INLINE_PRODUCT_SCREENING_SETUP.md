# 🤖 Inline Product Screening - Nastavení

## Co to dělá?

Nová funkce pro automatickou detekci produktů v odpovědích chatbota pomocí OpenRouter GPT-4o-mini. Agent analyzuje text a identifikuje:
- Konkrétní produkty (např. "009 - Čistý dech")
- Témata z čínské medicíny (TČM)
- Bylinné směsi, wany
- Přírodní/alternativní léčebné metody

## Nastavení

### Krok 1: Přidat OpenRouter API klíč do .env

Vytvoř nebo uprav soubor `.env` v root složce projektu:

```bash
# .env
VITE_OPENROUTER_API_KEY=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
```

**Poznámka:** Tento API klíč už máš - je to stejný klíč jako pro metadata extrakci.

### Krok 2: Restart dev serveru

```bash
# Zastav server (Ctrl+C)
npm run dev  # Spusť znovu
```

### Krok 3: Aktivovat funkci v chatbot nastavení

1. Přejdi do **Správa chatbotů**
2. Vyber chatbot (např. "Sana Local Format")
3. Zaškrtni **"Inline produktové linky"**
4. Ulož změny

## Jak to testovat?

### Test 1: Přímý test služby

Otevři browser console a spusť:

```javascript
import { testProductScreening } from './src/services/inlineProductScreeningService';
testProductScreening();
```

### Test 2: V reálném chatu

1. Otevři chatbot s aktivovanou funkcí "Inline produktové linky"
2. Napiš dotaz související s produkty: *"Mám bolest hlavy, co mi poradíš?"*
3. Po odpovědi chatbota sleduj console
4. Měl by se zobrazit log s detekovanými produkty:

```
🔍 Spouštím screening produktů v textu...
📝 Délka textu: 245 znaků
📡 Volám OpenRouter API...
✅ OpenRouter response received
✅ Screening dokončen: 3 produktů/témat nalezeno
📦 Nalezené produkty/témata: ["009 - Čistý dech", "bolest hlavy", "nosní průchodnost"]
```

## Technické detaily

### Architektura
- **Frontend** → volá Supabase Edge Function `screen-products`
- **Edge Function** → volá OpenRouter GPT-4o-mini (API klíč v secrets)
- **Model:** GPT-4o-mini - rychlý, levný
- **Cena:** ~$0.15 / 1M input tokens, ~$0.60 / 1M output tokens
- **Odpověď:** ~2-5 sekund

### Kdy se spouští?
- Pouze pokud `inline_product_links === true` v chatbot nastavení
- Po každé bot odpovědi
- Asynchronně (neblokuje UI)

### Co se zobrazuje?
- **Momentálně:** Pouze v console logu
- **Příště:** Bude zobrazení v UI (seznam produktů)
- **Nakonec:** Propojení s produktovou databází

## Soubory

- **Frontend Service:** `src/services/inlineProductScreeningService.ts`
- **Edge Function:** `supabase/functions/screen-products/index.ts` ✅ **NASAZENO**
- **Integrace:** `src/components/SanaChat/SanaChat.tsx`
- **Nastavení:** `chatbot_settings.inline_product_links` (už existuje v DB)

## Troubleshooting

### Edge Function error
```
❌ Edge Function chyba: ...
```
→ Zkontroluj Edge Function logy v Supabase Dashboard

### Prázdný seznam produktů
```
✅ Screening dokončen: 0 produktů/témat nalezeno
```
→ Text neobsahuje relevantní produkty/témata (to je OK!)

### OpenRouter API error
```
❌ OpenRouter API chyba: 401
```
→ API klíč v Supabase secrets může být neplatný (kontaktuj admina)

