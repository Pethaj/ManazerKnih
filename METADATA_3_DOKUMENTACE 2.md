# 🤖 Metadata 3 - Inteligentní extrakce metadat

## Přehled

**Metadata 3** je pokročilá funkce pro automatickou extrakci metadat z PDF dokumentů s inteligentní detekcí OCR. Na rozdíl od předchozích řešení:

1. **Automaticky detekuje OCR** - aplikace sama pozná, zda PDF obsahuje text
2. **Optimální model** - podle detekce volá buď textový nebo vision AI model
3. **Bezpečné** - API klíč je uložen na serveru (Supabase Edge Function)
4. **Efektivní** - pro text používá levnější model, pro obrázky vision model

## Jak funguje

### Flow procesu:
1. **Uživatel klikne "🤖 Metadata 3"** v editačním režimu knihy
2. **Stažení PDF** - aplikace stáhne PDF ze Supabase storage
3. **Detekce OCR** - pokusí se extrahovat text z prvních 10 stránek
4. **Rozhodnutí**:
   - **Text > 500 znaků** → Má OCR → Použije textový model (`meta-llama/llama-3.1-8b-instruct`)
   - **Text < 500 znaků** → Nemá OCR → Převede na obrázky → Použije vision model (`openai/gpt-4o-mini`)
5. **Volání Edge Function** - zavolá zabezpečenou Supabase funkci s daty
6. **OpenRouter API** - Edge funkce volá OpenRouter s optimálním modelem
7. **Výsledek** - metadata se automaticky vyplní do formuláře

## Architektura

```
┌─────────────────┐
│  React App      │
│  (index.tsx)    │
└────────┬────────┘
         │ 1. Click Metadata 3
         ▼
┌─────────────────────────────┐
│ openRouterMetadataService   │
│ - Stáhne PDF                │
│ - Detekuje OCR              │
│ - Připraví data             │
└────────┬────────────────────┘
         │ 2. Zavolá Edge Function
         ▼
┌────────────────────────────────┐
│ Supabase Edge Function         │
│ extract-metadata-ai            │
│ - Přijme text nebo obrázky     │
│ - Vybere model                 │
│ - Zavolá OpenRouter            │
└────────┬───────────────────────┘
         │ 3. API call
         ▼
┌─────────────────┐
│  OpenRouter     │
│  API            │
└────────┬────────┘
         │ 4. AI response
         ▼
┌─────────────────┐
│  Metadata       │
│  vyplněna       │
└─────────────────┘
```

## Instalace a nastavení

### 1. Nastavení OpenRouter API klíče v Supabase

API klíč je již připraven: `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`

**Postup nastavení:**

1. Přejděte do Supabase Dashboard
2. Vyberte projekt: https://modopafybeslbcqjxsve.supabase.co
3. V levém menu klikněte na **"Edge Functions"**
4. Klikněte na **"Secrets"** (nebo **"Settings"** → **"Edge Functions"** → **"Secrets"**)
5. Přidejte nový secret:
   - **Name:** `OPENROUTER_API_KEY`
   - **Value:** `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`
6. Klikněte **"Save"**

### 2. Nasazení Edge Function

Edge funkce je v `/supabase/functions/extract-metadata-ai/index.ts`

**Nasazení pomocí Supabase CLI:**

```bash
# Přihlášení do Supabase
supabase login

# Link k projektu
supabase link --project-ref modopafybeslbcqjxsve

# Nasazení Edge Function
supabase functions deploy extract-metadata-ai
```

**Alternativa - nasazení přes Dashboard:**

1. Přejděte do Supabase Dashboard
2. Edge Functions → New Function
3. Name: `extract-metadata-ai`
4. Zkopírujte obsah souboru `/supabase/functions/extract-metadata-ai/index.ts`
5. Deploy

### 3. Ověření instalace

Po nasazení můžete otestovat funkci:

```bash
# Test Edge Function
curl -X POST \
  'https://modopafybeslbcqjxsve.supabase.co/functions/v1/extract-metadata-ai' \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "text",
    "content": "Test document content about natural medicine",
    "fileName": "test.pdf"
  }'
```

## Použití v aplikaci

### V editačním režimu knihy:

1. Nahrajte nebo vyberte PDF knihu
2. Klikněte **"Upravit"** 
3. Najděte tlačítko **"🤖 Metadata 3"** (zelené tlačítko)
4. Klikněte na tlačítko
5. Potvrďte dialog
6. Počkejte 1-3 minuty na zpracování
7. Zkontrolujte a uložte vyplněná metadata

## Metadata která se extrahují

Funkce automaticky vyplní následující pole:

- **title** - Název publikace
- **author** - Autor/autoři
- **publicationYear** - Rok prvního vydání
- **publisher** - Nakladatelství
- **language** - Jazyk dokumentu (v češtině)
- **summary** - Stručné shrnutí obsahu (2-3 věty)
- **keywords** - 5-7 klíčových slov
- **releaseVersion** - Verze vydání (např. "1. vydání")

## Srovnání s jinými metodami

| Funkce | Vyplnit metadata | Metadata 2 (Vision) | **Metadata 3 (Intelligent)** |
|--------|------------------|---------------------|------------------------------|
| **Vstup** | OCR text (webhook) | Obrázky (10 stránek) | **Auto-detekce (text nebo obrázky)** |
| **OCR nutný** | ✅ Ano | ❌ Ne | **❌ Ne** |
| **Model** | Gemini (text) | GPT-4o mini (vision) | **Llama nebo GPT-4o mini** |
| **Rychlost** | Pomalá (webhook + AI) | Střední (1-2 min) | **Střední-rychlá (1-3 min)** |
| **Přesnost** | Vysoká | Vysoká | **Vysoká** |
| **Cena** | Střední | Nízká (~$0.0015) | **Velmi nízká** |
| **API klíč** | localStorage | Veřejný kód | **Supabase Secret (bezpečné)** |
| **Kdy použít** | Po OCR webhooků | Rychlá extrakce bez OCR | **Univerzální - vždy!** |

## Výhody Metadata 3

### ✅ Inteligentní
- Automaticky volí nejlepší metodu podle typu PDF
- Žádné ruční rozhodování potřeba

### ✅ Bezpečné
- API klíč uložen na serveru (nikdy se nedostane do browseru)
- Komunikace přes zabezpečenou Supabase Edge Function

### ✅ Ekonomické
- Pro text: `meta-llama/llama-3.1-8b-instruct` (~$0.0001/1K tokens)
- Pro obrázky: `openai/gpt-4o-mini` (~$0.0015/request)
- Mnohem levnější než konkurenční služby

### ✅ Spolehlivé
- Funguje i pro PDF bez OCR
- Fallback na vision model když text není dostupný

### ✅ Rychlé
- Zpracovává pouze prvních 10 stránek
- Textový model je extrémně rychlý
- Vision model optimalizován pro rychlost

## Technické detaily

### Komponenty

1. **`openRouterMetadataService.ts`** - Client-side služba
   - Stahuje PDF ze storage
   - Detekuje OCR (pokus o extrakci textu)
   - Připravuje data (text nebo obrázky)
   - Volá Edge Function

2. **`extract-metadata-ai/index.ts`** - Supabase Edge Function
   - Přijímá request s daty
   - Volá OpenRouter API
   - Vrací extrahovaná metadata

3. **`index.tsx`** - UI komponenta
   - Handler `handleBulkIntelligentGenerate`
   - Tlačítko "🤖 Metadata 3"
   - Zobrazení výsledků

### Detekce OCR logika

```typescript
// Pokus o extrakci textu z PDF pomocí PDF.js
const text = await extractTextFromPDF(pdfBlob, 10);

if (text.length > 500) {
  // ✅ Má OCR → Pošle text na textový model
  return { type: 'text', content: text }
} else {
  // ❌ Nemá OCR → Převede na obrázky → vision model
  const images = await convertToImages(pdfBlob, 10);
  return { type: 'images', content: images }
}
```

### OpenRouter modely

**Textový model:** `meta-llama/llama-3.1-8b-instruct`
- Cena: ~$0.0001 za 1K tokens
- Rychlost: Velmi rychlý
- Použití: PDF s OCR textem

**Vision model:** `openai/gpt-4o-mini`
- Cena: ~$0.0015 za request (10 obrázků)
- Rychlost: Rychlý
- Použití: PDF bez OCR (pouze obrázky)

## Troubleshooting

### Edge Function se nenačte

**Problém:** `Failed to fetch from Edge Function`

**Řešení:**
1. Zkontrolujte, že je Edge Function nasazena: https://modopafybeslbcqjxsve.supabase.co/functions/v1/extract-metadata-ai
2. Ověřte API klíč v Supabase Secrets
3. Zkontrolujte konzoli pro detaily chyby

### API klíč není platný

**Problém:** `OPENROUTER_API_KEY není nastaven`

**Řešení:**
1. Přejděte do Supabase Dashboard → Edge Functions → Secrets
2. Přidejte secret `OPENROUTER_API_KEY` s hodnotou API klíče
3. Restartujte Edge Function (redeploy)

### Metadata se nevyplní

**Problém:** Tlačítko funguje, ale metadata zůstanou prázdná

**Řešení:**
1. Otevřete konzoli (F12) a hledejte chyby
2. Zkontrolujte, že PDF je validní a čitelné
3. Zkuste jiný PDF soubor
4. Zkontrolujte OpenRouter API kredit

### PDF bez OCR nefunguje

**Problém:** Detekce OCR selže a vision model také

**Řešení:**
1. Zkontrolujte velikost PDF (max ~50 MB doporučeno)
2. Ověřte, že PDF obsahuje obrázky/skeny
3. Zkuste menší/jednodušší PDF

## Best Practices

### ✅ Doporučujeme
- Používat Metadata 3 jako první volbu pro všechny PDF
- Nechat aplikaci automaticky rozhodnout o metodě
- Zkontrolovat metadata před uložením
- Pro komplexní sumarizaci použít "Vyplnit metadata" po OCR

### ❌ Nedoporučujeme
- Používat na velmi velké PDF (>100 stránek není potřeba, jen prvních 10 se použije)
- Spoléhat se na metadata bez kontroly
- Používat pro ne-PDF formáty (EPUB, MOBI)

## Changelog

### v1.0 (2025-11-18)
- ✨ Initial release
- ✅ Automatická detekce OCR
- ✅ Inteligentní výběr AI modelu
- ✅ Supabase Edge Function integrace
- ✅ OpenRouter API podpora
- ✅ UI tlačítko "🤖 Metadata 3"
- ✅ Bezpečné uložení API klíče

## Podpora

Pro otázky a problémy:
- Otevřete konzoli (F12) pro debug informace
- Zkontrolujte Supabase Edge Function logs
- Ověřte OpenRouter API status: https://openrouter.ai/docs


