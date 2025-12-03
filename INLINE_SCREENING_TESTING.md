# 🧪 Testování Inline Product Screening

## Přehled

Nová funkce automaticky analyzuje odpovědi chatbota pomocí GPT-4o-mini a identifikuje produkty/témata z čínské medicíny.

## Příprava na testování

### 1. Nastav OpenRouter API klíč

V souboru `.env` (v root složce):

```bash
VITE_OPENROUTER_API_KEY=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
```

### 2. Restartuj dev server

```bash
# Zastav server (Ctrl+C)
npm run dev
```

### 3. Aktivuj funkci v nastavení

1. Otevři **Správa chatbotů**
2. Vyber chatbot (např. "Sana Local Format")
3. Zaškrtni ✅ **"Inline produktové linky"**
4. Klikni **Uložit**

⚠️ **Poznámka:** Momentálně používáme `inline_product_links` jako trigger. Později přidáme separátní nastavení `product_screening`.

## Testovací scénáře

### Test 1: Produkt wan 009

**Dotaz uživatele:**
```
Mám bolest hlavy a rýmu, co mi doporučíš?
```

**Očekávaná odpověď chatbota:**
> Pro bolest hlavy a rýmu doporučuji wan 009 - Čistý dech, který pomáhá s průchodností nosních dírek a uvolňuje dutiny.

**Očekávaný console output:**
```
🤖 ✅ SPOUŠTÍM screening produktů přes GPT mini...
📝 Text k analýze: Pro bolest hlavy a rýmu doporučuji wan 009 - Čistý dech...
🔍 Spouštím screening produktů v textu...
📡 Volám OpenRouter API...
✅ OpenRouter response received
✅ Screening dokončen: 3 produktů/témat nalezeno
🎉 ✅ Screening ÚSPĚŠNÝ!
📦 Nalezené produkty/témata: ["009 - Čistý dech", "bolest hlavy", "rýma"]
📊 Počet produktů: 3
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 VÝSLEDKY SCREENINGU:
   1. 009 - Čistý dech
   2. bolest hlavy
   3. rýma
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### Test 2: Obecná konverzace (bez produktů)

**Dotaz uživatele:**
```
Jak se máš dnes?
```

**Očekávaná odpověď chatbota:**
> Dobrý den! Mám se skvěle, děkuji za optání. Jak vám mohu pomoci?

**Očekávaný console output:**
```
🤖 ✅ SPOUŠTÍM screening produktů přes GPT mini...
📝 Text k analýze: Dobrý den! Mám se skvěle, děkuji za optání...
🔍 Spouštím screening produktů v textu...
📡 Volám OpenRouter API...
✅ OpenRouter response received
✅ Screening dokončen: 0 produktů/témat nalezeno
ℹ️ Screening dokončen - žádné produkty nenalezeny (to je OK)
```

---

### Test 3: Bewit produkt

**Dotaz uživatele:**
```
Máš něco na uklidnění a lepší spánek?
```

**Očekávaná odpověď chatbota:**
> Doporučuji Bewit Levandule 15ml - éterický olej, který pomáhá s uklidněním mysli a podporou spánku.

**Očekávaný console output:**
```
🤖 ✅ SPOUŠTÍM screening produktů přes GPT mini...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 VÝSLEDKY SCREENINGU:
   1. Bewit Levandule
   2. uklidnění mysli
   3. podpora spánku
   4. éterický olej
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### Test 4: TČM téma

**Dotaz uživatele:**
```
Co je to harmonizace Qi?
```

**Očekávaná odpověď chatbota:**
> V tradiční čínské medicíně (TČM) se harmonizace Qi týká vyvážení životní energie v těle pomocí bylinných směsí a akupunktury.

**Očekávaný console output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 VÝSLEDKY SCREENINGU:
   1. harmonizace Qi
   2. tradiční čínská medicína
   3. bylinné směsi
   4. životní energie
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Jak sledovat console

### V Chrome/Edge/Brave:
1. Stiskni **F12** nebo **Cmd+Option+I** (Mac)
2. Klikni na tab **Console**
3. Filtruj podle emoji 🤖 nebo textu "screening"

### V Firefox:
1. Stiskni **F12** nebo **Cmd+Option+K** (Mac)
2. Klikni na tab **Konzole**

## Co sledovat v console

### ✅ Úspěšný screening
- `🤖 ✅ SPOUŠTÍM screening...`
- `📡 Volám OpenRouter API...`
- `✅ Screening dokončen: X produktů/témat nalezeno`
- `🔍 VÝSLEDKY SCREENINGU:` s číslovaným seznamem

### ⚠️ Žádné produkty
- `ℹ️ Screening dokončen - žádné produkty nenalezeny (to je OK)`
- To je normální pro obecné konverzace

### ❌ Chyby

**API klíč nenalezen:**
```
❌ VITE_OPENROUTER_API_KEY není nastaven v .env souboru
```
→ Zkontroluj `.env` a restartuj server

**OpenRouter API chyba:**
```
❌ OpenRouter API chyba: 401 - Unauthorized
```
→ Ověř platnost API klíče

**Parsing chyba:**
```
❌ Nepodařilo se parsovat JSON odpověď
```
→ GPT model vrátil nevalidní JSON (vzácné)

## Pokročilé testování

### Direct test funkce (v browser console)

```javascript
// Import funkce
import { testProductScreening } from '/src/services/inlineProductScreeningService';

// Spusť test
testProductScreening();
```

### Kontrola nastavení chatbota

V browser console:
```javascript
// Zkontroluj, zda je funkce zapnutá
const settings = await fetch('/api/chatbot-settings/sana_local_format').then(r => r.json());
console.log('inline_product_links:', settings.inline_product_links);
```

## Časté problémy

### Screening se nespouští
1. ✅ Zkontroluj, že je funkce zapnutá v nastavení chatbota
2. ✅ Zkontroluj, že jsi v bot odpovědi (ne user zpráva)
3. ✅ Zkontroluj console - měl by být log "🤖 Product Screening - useEffect trigger"

### API timeout
- Screening trvá ~2-5 sekund
- Pokud trvá >10 sekund, může být problém s OpenRouter API
- Zkontroluj network tab v DevTools

### Příliš mnoho false positives
- Model identifikuje témata, která nejsou produkty
- To je OK pro tuto fázi - budeme ladit prompt

## Další kroky

Po úspěšném otestování:
1. ✅ **Krok 2:** Mapování témat na konkrétní produkty z databáze
2. ✅ **Krok 3:** UI zobrazení produktů (ne jen console)
3. ✅ **Krok 4:** Separátní nastavení `product_screening` v DB

---

**Status:** ✅ Krok 1 dokončen - Screening funguje a zobrazuje výsledky v console


