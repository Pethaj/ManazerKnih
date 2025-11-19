# 🖼️ Vision Metadata - Rychlý start

## Co je to?

**Metadata 2** je nová funkce pro automatickou extrakci metadat z PDF dokumentů pomocí vision LLM modelu (GPT-4o mini).

### Jak funguje:
1. **PDF → Obrázky** - Prvních 10 stránek se převede na PNG obrázky (v prohlížeči pomocí PDF.js)
2. **Obrázky → LLM** - Obrázky se pošlou do GPT-4o mini přes OpenRouter
3. **LLM → Metadata** - Model extrahuje a automaticky vyplní všechna metadata

## Použití

### V aplikaci:
1. Nahrajte PDF knihu
2. Klikněte **"Upravit"**
3. Najděte tlačítko **"🖼️ Metadata 2"** (fialové tlačítko vedle "Vyplnit metadata")
4. Klikněte a počkejte 1-2 minuty
5. Zkontrolujte vyplněná metadata a uložte

### Testování:
Otevřete `test-vision-metadata.html` v prohlížeči pro standalone test.

## Výhody

✅ **Bez OCR** - Funguje i pro dokumenty bez OCR textu  
✅ **Rychlejší** - Pouze 10 stránek místo celého dokumentu  
✅ **Přesnější** - Vision model lépe "vidí" titulní strany  
✅ **Levnější** - ~$0.0015 za dokument (GPT-4o mini)  

## Co extrahuje?

- 📖 Název publikace
- ✍️ Autor(ři)
- 📅 Rok vydání
- 🏢 Nakladatelství
- 🌍 Jazyk (v češtině)
- 📝 Sumarizace (2-3 věty)
- 🔖 5-7 klíčových slov
- 🔢 Verze vydání

## Kdy použít?

### "Metadata 2" (Vision) - použijte když:
- ✅ Potřebujete rychlou extrakci metadat
- ✅ PDF nemá OCR text
- ✅ Chcete preview před plným OCR
- ✅ Titulní strana má všechny info

### "Vyplnit metadata" (Standard) - použijte když:
- ✅ Potřebujete analýzu celého obsahu
- ✅ Chcete detailní sumarizaci
- ✅ Pracujete s EPUB/MOBI
- ✅ Metadata nejsou na začátku

## Soubory

```
/src/services/
  ├── pdfToImageService.ts         # PDF → PNG konverze
  └── openRouterVisionService.ts   # OpenRouter Vision API

/index.tsx                          # Hlavní aplikace
  ├── generateMetadataWithVision() # Vision extrakce
  └── handleBulkVisionGenerate()   # UI handler

/test-vision-metadata.html          # Standalone test
/VISION_METADATA_DOKUMENTACE.md     # Kompletní dokumentace
```

## Troubleshooting

**Tlačítko je disabled?**  
→ Funkce podporuje pouze PDF soubory

**Chyba při konverzi?**  
→ Zkontrolujte console (F12) a zkuste menší PDF

**LLM nereaguje?**  
→ Ověřte API klíč v `openRouterVisionService.ts`

**Nepřesná metadata?**  
→ Zkontrolujte, zda jsou info v prvních 10 stránkách  
→ Nebo použijte standardní "Vyplnit metadata"

## API klíč

OpenRouter API klíč je uložen v:
```
/src/services/openRouterVisionService.ts
const OPENROUTER_API_KEY = 'sk-or-v1-...'
```

Pro změnu nebo rotaci klíče upravte tento soubor.

## Ukázka konzole

```
🖼️ Generuji metadata pomocí vision LLM z prvních 10 stránek PDF...
📥 Stahuji PDF soubor z databáze...
✅ PDF staženo (2458 KB)
🔄 Převádím prvních 10 stránek PDF na obrázky...
📄 Zpracovávám stránku 1/10...
✅ Stránka 1 vykreslena (1920x2716px)
💾 Stránka 1 převedena na PNG (847 KB)
...
✅ Převedeno 10 stránek na obrázky
🤖 Odesílám obrázky do vision LLM pro extrakci metadat...
✅ Vision LLM úspěšně extrahoval metadata
✅ Metadata připravena k naplnění polí
```

## Další info

Kompletní dokumentace: `VISION_METADATA_DOKUMENTACE.md`

---

**Autor:** Petr Hajduk  
**Datum:** 8. října 2025  
**Verze:** 1.0


