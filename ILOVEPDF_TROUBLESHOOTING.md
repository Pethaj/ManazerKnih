# iLovePDF - Řešení problémů při uploadu

## Co se stane při HTTP 500 chybě

Když iLovePDF API vrátí HTTP 500 (server error), aplikace automaticky:

### 1. **Retry mechanismus** (automaticky)
- 🔄 Pokus 1/3 → Selže (HTTP 500)
- ⏳ Čekání 2 sekundy
- 🔄 Pokus 2/3 → Selže (HTTP 500) 
- ⏳ Čekání 4 sekundy
- 🔄 Pokus 3/3 → Selže (HTTP 500)

### 2. **Fallback dialog** (uživatelská volba)
Zobrazí se dialog s textem:
```
Zpracování pomocí iLovePDF se nezdařilo:

iLovePDF server má dočasný problém (HTTP 500). 
Zkuste nahrát soubor bez OCR zpracování nebo to zkuste za chvíli.

Zvolené operace: OCR rozpoznání textu

Můžete:
• ZRUŠIT nahrání a zkusit to později
• POKRAČOVAT a nahrát soubor bez zpracování

Chcete pokračovat s nahráním bez zpracování?
```

### 3. **Uživatelské volby**

#### ✅ **POKRAČOVAT** (doporučeno)
- Soubor se nahraje bez iLovePDF zpracování
- Zobrazí se potvrzení: "Pokračuji s nahráním bez zpracování"
- Kniha se uloží do databáze s původními metadaty
- OCR můžete zkusit později

#### ❌ **ZRUŠIT**
- Upload se zastaví
- Soubor se nenahraje
- Můžete to zkusit později

## Doporučený postup

### Pro běžné uživatele:
1. **Klikněte POKRAČOVAT** - soubor se nahraje okamžitě
2. OCR můžete provést později, když API funguje
3. Kniha bude dostupná v aplikaci normálně

### Pro pokročilé uživatele:
1. Pokud potřebujete OCR nutně, klikněte **ZRUŠIT**
2. Zkuste to za 5-10 minut (server problém se obvykle vyřeší)
3. Nebo použijte externí OCR nástroj

## Časté situace

### ✅ "Server má dočasný problém"
- **Příčina**: iLovePDF API má výpadek
- **Řešení**: Pokračovat bez zpracování nebo zkusit později
- **Obvykle se vyřeší**: Během několika minut

### ✅ "Problém se síťovým připojením"
- **Příčina**: Internetové připojení nebo síťová chyba
- **Řešení**: Zkontrolovat připojení, pak pokračovat bez zpracování

### ✅ "API odpovídá příliš pomalu"
- **Příčina**: Vysoké zatížení serveru
- **Řešení**: Pokračovat bez zpracování nebo zkusit později

## Testování

Pro otestování fallback mechanismu:
1. Otevřete konzoli v prohlížeči (F12)
2. Načtěte script: `<script src="test-upload-fallback.js"></script>`
3. Spusťte: `testUploadFallback.runAllTests()`

## Kontakt na podporu

Pokud problémy přetrvávají:
- Zkontrolujte konzoli prohlížeče (F12) pro detaily
- Uložte screenshot chybové zprávy
- Kontaktujte technickou podporu s informacemi o chybě

---
*Aktualizováno: ${new Date().toLocaleDateString('cs-CZ')}*
