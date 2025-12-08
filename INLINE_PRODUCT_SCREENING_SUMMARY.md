# 🤖 Inline Product Screening - Souhrn implementace

## ✅ Co bylo dokončeno (Krok 1)

Implementovali jsme **první fázi** nové funkce pro automatické doporučování produktů v chatbotu.

### Vytvořené soubory

1. **`src/services/inlineProductScreeningService.ts`**
   - Služba pro screening produktů přes OpenRouter GPT-4o-mini
   - Funkce: `screenTextForProducts(text: string): Promise<ScreeningResult>`
   - Funkce: `testProductScreening()` pro testování
   - Model: `openai/gpt-4o-mini` (levný, rychlý)
   - Cena: ~$0.15 / 1M input tokens, ~$0.60 / 1M output tokens

2. **`src/components/SanaChat/SanaChat.tsx`** (rozšíření)
   - Import nové služby
   - Nový useEffect pro screening bot odpovědí
   - Podmíněné spouštění pokud `inline_product_links === true`
   - Console output s výsledky

3. **`INLINE_PRODUCT_SCREENING_SETUP.md`**
   - Návod na nastavení OpenRouter API klíče
   - Aktivace funkce v chatbot nastavení
   - Základní troubleshooting

4. **`INLINE_SCREENING_TESTING.md`**
   - 4 testovací scénáře s očekávanými výsledky
   - Návod jak sledovat console
   - Pokročilé testování
   - Časté problémy a řešení

## 🎯 Co funkce dělá

1. **Čeká na odpověď z N8N webhook** (chatbot odpověď)
2. **Automaticky analyzuje text** pomocí GPT-4o-mini
3. **Identifikuje produkty/témata:**
   - Konkrétní produkty (např. "009 - Čistý dech")
   - Témata z čínské medicíny (TČM)
   - Bylinné směsi, wany
   - Přírodní/alternativní léčebné metody
4. **Zobrazí výsledky v console** jako číslovaný seznam

## 📋 Technické detaily

### Kdy se spouští?
- ✅ Pouze pro **bot zprávy** (ne user zprávy)
- ✅ Pouze pokud `chatbotSettings.inline_product_links === true`
- ✅ Pouze pokud zpráva obsahuje text
- ✅ Asynchronně (neblokuje UI)

### Jak funguje screening?

```
User → N8N webhook → Bot odpověď
         ↓
   SanaChat zobrazí zprávu
         ↓
   useEffect trigger
         ↓
   screenTextForProducts(text)
         ↓
   OpenRouter GPT-4o-mini
         ↓
   JSON array produktů/témat
         ↓
   Console output
```

### Prompt strategie

Model dostává instrukce:
- Analyzovat text z pohledu čínské medicíny
- Identifikovat konkrétní produkty a témata
- Vrátit pouze to, co je skutečně zmíněno (nevymýšlet)
- Formát: JSON array stringů

### Příklad vstupu/výstupu

**Vstup:**
> "Pro bolest hlavy doporučuji wan 009 - Čistý dech, který pomáhá s průchodností nosních dírek."

**Výstup:**
```json
["009 - Čistý dech", "bolest hlavy", "nosní průchodnost"]
```

## 🔧 Nastavení pro uživatele

### Krok 1: Přidat API klíč

V souboru `.env`:
```bash
VITE_OPENROUTER_API_KEY=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
```

### Krok 2: Restart serveru
```bash
npm run dev
```

### Krok 3: Aktivovat v chatbot nastavení
1. Správa chatbotů → Vyber chatbot
2. ✅ "Inline produktové linky"
3. Uložit

### Krok 4: Testovat
1. Otevři chatbot
2. Napiš dotaz s produkty/tématy
3. Sleduj console (F12)
4. Měl by se zobrazit seznam produktů

## 📊 Co teď?

### ✅ Krok 1: HOTOVO
- Agent screenuje text a zobrazuje v console

### 🔄 Krok 2: Mapování na produkty (DALŠÍ)
- Vzít témata z screeningu
- Vyhledat v `product_feed_2` databázi
- Vrátit konkrétní `product_code`, URL, obrázky

### 🔄 Krok 3: UI zobrazení (BUDOUCÍ)
- Místo console → UI komponenta
- Seznam produktů pod odpovědí
- Clickable linky

### 🔄 Krok 4: Separátní nastavení (BUDOUCÍ)
- Nový sloupec `product_screening` v `chatbot_settings`
- Oddělit od `inline_product_links`

## 🎨 Odlišnosti od existujících funkcí

Tato funkce je **zcela separátní** od:

1. **"Produktové doporučení na tlačítko"** (`product_button_recommendations`)
   - To používá N8N pro screening
   - To se zobrazuje v ProductCarousel
   - To má tlačítko "Doporuč produkty"

2. **"Inline produktové linky"** (`inline_product_links` - STARÁ funkce)
   - To dělá vektorové vyhledávání v `product_embeddings`
   - To zobrazuje malé ikony v textu
   - To nepotřebuje GPT screening

3. **Nová funkce** (product screening)
   - Používá GPT-4o-mini lokálně na frontendu
   - Zobrazuje v console (zatím)
   - Bude mapovat na databázi (příště)

## 🚨 Důležité poznámky

### Momentální trigger
⚠️ **Používáme `inline_product_links` jako trigger** pro testování.

Později přidáme separátní nastavení:
```sql
ALTER TABLE chatbot_settings 
ADD COLUMN product_screening BOOLEAN DEFAULT false;
```

### API náklady
- GPT-4o-mini je velmi levný (~$0.20 za 1000 requestů)
- Každá bot odpověď = 1 request
- Pro 100 konverzací denně = ~$0.02/den

### Performance
- Screening trvá ~2-5 sekund
- Probíhá asynchronně (neblokuje UI)
- Výsledky se zobrazí v console ihned po dokončení

## 📝 Testovací scénáře

1. ✅ **Produkt wan 009** - mělo by najít "009 - Čistý dech", "bolest hlavy"
2. ✅ **Obecná konverzace** - mělo by najít 0 produktů (to je OK)
3. ✅ **Bewit produkt** - mělo by najít "Bewit Levandule", "uklidnění"
4. ✅ **TČM téma** - mělo by najít "harmonizace Qi", "bylinné směsi"

Detaily viz `INLINE_SCREENING_TESTING.md`

## ✅ Status

**Krok 1 DOKONČEN:** Agent screenuje text a zobrazuje produkty v console.

**Připraveno na testování!** 🎉

---

**Vytvořeno:** 3. prosince 2025
**Autor:** AI Assistant  
**Status:** ✅ Implementováno a připraveno k testování




