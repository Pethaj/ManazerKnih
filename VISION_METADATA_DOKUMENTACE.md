# 🖼️ Vision Metadata - Dokumentace

## Přehled

Funkce "Metadata 2" umožňuje automatickou extrakci metadat z PDF dokumentů pomocí vision LLM modelů. Na rozdíl od standardního přístupu, který vyžaduje OCR text, tato funkce:

1. **Převede prvních 10 stránek PDF na PNG obrázky** (pomocí PDF.js v prohlížeči)
2. **Odešle obrázky do vision LLM modelu** (GPT-4o mini přes OpenRouter)
3. **Extrahuje a automaticky vyplní metadata** do formuláře knihy

## Výhody

- ✅ **Bez nutnosti OCR** - funguje i pro dokumenty bez OCR textu
- ✅ **Vizuální analýza** - model "vidí" formátování, strukturu, obrázky
- ✅ **Rychlejší** - zpracuje pouze prvních 10 stránek
- ✅ **Přesnější** - vision modely lépe rozpoznají titulní strany a metadata
- ✅ **Klientská konverze** - PDF se převádí v prohlížeči, žádné serverové licencování

## Jak to funguje

### 1. PDF.js konverze (klient)
```
PDF soubor → PDF.js → Canvas → PNG obrázky (base64)
```

- Maximálně 10 stránek
- Scale 2.0 (≈192 DPI)
- Výstup: Base64 encoded PNG

### 2. Vision LLM extrakce (OpenRouter)
```
PNG obrázky → GPT-4o mini → JSON metadata
```

Model GPT-4o mini analyzuje obrázky a extrahuje:
- `title` - Název publikace
- `author` - Autor(ři)
- `publicationYear` - Rok vydání
- `publisher` - Nakladatelství
- `language` - Jazyk (v češtině)
- `summary` - Stručné shrnutí (2-3 věty)
- `keywords` - 5-7 klíčových slov
- `releaseVersion` - Verze vydání

### 3. Automatické vyplnění
```
JSON metadata → Formulář knihy
```

Všechna dostupná metadata se automaticky vyplní do příslušných polí.

## Použití v aplikaci

### V editačním režimu knihy:

1. Klikněte na **"Upravit"** u knihy
2. Najděte tlačítko **"🖼️ Metadata 2"** (vedle "Vyplnit metadata")
3. Klikněte na tlačítko
4. Potvrďte dialog
5. Počkejte 1-2 minuty na zpracování
6. Zkontrolujte a uložte vyplněná metadata

### Tlačítko je dostupné pouze pro:
- ✅ PDF soubory
- ❌ Tlačítko je disabled pro ostatní formáty (EPUB, MOBI, atd.)

## Technické detaily

### Soubory

#### 1. `/src/services/pdfToImageService.ts`
Konverze PDF stránek na PNG obrázky pomocí PDF.js.

**Hlavní funkce:**
- `convertPdfPagesToImages(pdfFile, maxPages, scale)` - Konvertuje PDF na obrázky
- `convertPdfUrlToImages(pdfUrl, maxPages, scale)` - Konvertuje PDF z URL
- `testPdfToImage(file)` - Test funkce

**Parametry:**
- `maxPages` - Max počet stránek (výchozí: 10)
- `scale` - DPI scale (výchozí: 2.0 = ~192 DPI)

#### 2. `/src/services/openRouterVisionService.ts`
Komunikace s OpenRouter Vision API pro extrakci metadat.

**Hlavní funkce:**
- `extractMetadataFromImages(images, fileName)` - Extrahuje metadata z obrázků
- `testVisionAPI()` - Test API připojení

**API:**
- Endpoint: `https://openrouter.ai/api/v1/chat/completions`
- Model: `openai/gpt-4o-mini`
- Formát: Multimodal (text + images)

#### 3. `/index.tsx`
Hlavní aplikační logika.

**Nové funkce:**
- `generateMetadataWithVision(book)` - Hlavní funkce pro vision metadata
- `handleBulkVisionGenerate()` - Handler pro tlačítko "Metadata 2"

### OpenRouter API konfigurace

```typescript
const OPENROUTER_API_KEY = 'sk-or-v1-...';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Request format
{
  model: 'openai/gpt-4o-mini',
  messages: [
    { role: 'system', content: '...' },
    { role: 'user', content: [
      { type: 'text', text: '...' },
      { type: 'image_url', image_url: { url: 'data:image/png;base64,...' } }
    ]}
  ],
  max_tokens: 2000,
  temperature: 0.3
}
```

## Testování

### Test v aplikaci
1. Nahrajte PDF knihu
2. Klikněte "Upravit"
3. Klikněte "🖼️ Metadata 2"
4. Sledujte console log pro debug info

### Standalone test
Otevřete `test-vision-metadata.html` v prohlížeči:

```bash
open test-vision-metadata.html
```

**Test funkce:**
- **Test: Převést na obrázky** - Otestuje pouze PDF→PNG konverzi
- **Test: Plná extrakce metadat** - Otestuje celý proces včetně LLM

## Troubleshooting

### Chyba: "Vision metadata lze generovat pouze z PDF souborů"
**Řešení:** Funkce podporuje pouze PDF. Pro EPUB/MOBI použijte standardní "Vyplnit metadata".

### Chyba při konverzi PDF na obrázky
**Možné příčiny:**
- PDF.js není načten správně
- Poškozený PDF soubor
- Nedostatek paměti v prohlížeči

**Řešení:**
- Zkontrolujte console log
- Zkuste menší PDF
- Obnovte stránku

### Chyba při volání OpenRouter API
**Možné příčiny:**
- Neplatný API klíč
- Překročený rate limit
- Chybná struktura požadavku

**Řešení:**
- Zkontrolujte API klíč v `/src/services/openRouterVisionService.ts`
- Počkejte a zkuste znovu
- Zkontrolujte OpenRouter dashboard pro limity

### LLM vrátil nevalidní JSON
**Příčina:** Model někdy přidá markdown formátování nebo text před/po JSON.

**Řešení:** Automaticky ošetřeno - extrahuje se JSON z markdown code blocků.

### Metadata nejsou přesná
**Příčiny:**
- Špatně čitelná titulní strana
- Nestandardní formátování
- Chybějící informace v prvních 10 stránkách

**Řešení:**
- Zkontrolujte a opravte metadata ručně
- Nebo použijte standardní "Vyplnit metadata" s plným OCR textem

## Limity a omezení

### Technické limity
- ⚠️ **Max 10 stránek** - Pevný limit pro rychlost a cenu
- ⚠️ **Pouze PDF** - EPUB, MOBI nejsou podporovány
- ⚠️ **Velikost obrázků** - ~500 KB na stránku → max ~5 MB celkem
- ⚠️ **API rate limit** - OpenRouter free tier má limity

### Obsahové limity
- Model vidí pouze prvních 10 stránek
- Pokud metadata nejsou v prvních 10 stránkách, nebudou extrahována
- Vizuálně složité stránky mohou být špatně interpretovány

### Cena
- GPT-4o mini: ~$0.00015 za obrázek
- 10 stránek: ~$0.0015 (0.04 Kč)
- Velmi levné oproti OCR službám

## Srovnání s "Vyplnit metadata"

| Funkce | Vyplnit metadata | Metadata 2 (Vision) |
|--------|------------------|---------------------|
| **Vstup** | OCR text (celý dokument) | Obrázky (prvních 10 stránek) |
| **Model** | Gemini (text) | GPT-4o mini (vision) |
| **OCR nutný** | ✅ Ano | ❌ Ne |
| **Rychlost** | Pomalejší (celý dokument) | Rychlejší (10 stránek) |
| **Přesnost** | Dobrá (pokud je OCR kvalitní) | Výborná (pro titulní strany) |
| **Formáty** | PDF, EPUB, MOBI | Pouze PDF |
| **Cena** | Střední | Nízká |
| **Použití** | Kompletní analýza obsahu | Rychlá extrakce metadat |

## Best Practices

### Kdy použít "Metadata 2"
✅ Pro nové PDF knihy bez OCR
✅ Pro rychlou extrakci základních metadat
✅ Pro dokumenty s pěknou titulní stranou
✅ Pro preview před plným OCR

### Kdy použít "Vyplnit metadata"
✅ Pro detailní analýzu obsahu
✅ Pro generování sumarizace z celého dokumentu
✅ Pro knihy bez standardní titulní strany
✅ Pro EPUB a MOBI soubory

### Workflow doporučení
1. Nahrajte PDF knihu
2. **První krok:** Klikněte "🖼️ Metadata 2" pro rychlou extrakci
3. Zkontrolujte vyplněná metadata
4. Pokud chybí sumarizace nebo je nepřesná:
   - Spusťte OCR webhook
   - Použijte "Vyplnit metadata" pro detailní analýzu

## Changelog

### v1.0 (2025-10-08)
- ✨ Initial release
- ✅ PDF.js konverze do PNG
- ✅ OpenRouter Vision API integrace
- ✅ Automatické vyplnění všech polí
- ✅ UI tlačítko "Metadata 2"
- ✅ Standalone test HTML

## Future Ideas

- 🔮 Podpora pro více vision modelů (Claude 3, Gemini Vision)
- 🔮 Konfigurovatelný počet stránek (5-20)
- 🔮 Preview obrázků před odesláním
- 🔮 Batch processing pro více knih najednou
- 🔮 Ukládání vision metadat do cache
- 🔮 Porovnání výsledků mezi standardním a vision přístupem

## Podpora

Při problémech:
1. Zkontrolujte browser console (F12)
2. Ověřte API klíč v source kódu
3. Otestujte na `test-vision-metadata.html`
4. Kontaktujte vývojáře s console log výpisem


