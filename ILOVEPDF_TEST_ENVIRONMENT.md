# iLovePDF Testovací Prostředí

## Přehled

Vytvořil jsem kompletní testovací prostředí pro iLovePDF OCR a kompresi funkcionalitu přímo v detailu už nahrané knihy. Toto umožňuje individuální testování každé funkce před integrací do hlavního upload workflow.

## Umístění Testovacího Prostředí

**Kde najít:** Detail knihy → Pravý panel → Sekce "🧪 Testovací prostředí iLovePDF"

**Kdy se zobrazí:**
- ✅ Pouze u PDF souborů (`book.format === 'PDF'`)
- ✅ Pouze v read-only režimu (ne při editaci metadat)
- ✅ Zobrazí se automaticky pod základními akcemi

## Funkcionalita

### 🔍 OCR Test Sekce

**Zobrazené informace:**
- 🟢 **Stav OCR**: "✅ Má OCR" nebo "❌ Bez OCR" 
- 🌐 **Výběr jazyka**: Dropdown se všemi 30+ podporovanými jazyky
- 🗂️ **Jazyky**: Seřazené podle české abecedy

**Akce:**
- Výběr jazyka pro OCR zpracování
- Tlačítko "🔍 Test OCR" → spustí OCR test

### 🗜️ Komprese Test Sekce

**Zobrazené informace:**
- 📊 **Aktuální velikost**: Zobrazuje velikost v MB
- 🎯 **Typ komprese**: Extreme compression

**Akce:**
- Tlačítko "🗜️ Test Komprese" → spustí kompresi test

## Workflow Testování

### OCR Test:
1. **Vybere jazyk** z dropdown
2. **Stáhne soubor** z Supabase Storage (`Books` bucket)
3. **Zavolá iLovePDF API** pro OCR zpracování
4. **Nahraje zpracovaný soubor** s novým názvem (`timestamp-ocr-originalname`)
5. **Aktualizuje databázi** (`file_path`, `has_ocr: true`)
6. **Obnoví UI** s novými daty

### Komprese Test:
1. **Stáhne soubor** z Supabase Storage
2. **Zavolá iLovePDF API** pro kompresi
3. **Vypočítá úspory** (původní vs komprimovaná velikost)
4. **Nahraje komprimovaný soubor** (`timestamp-compressed-originalname`)
5. **Aktualizuje databázi** (`file_path`, `file_size`)
6. **Zobrazí výsledky** (% úspory, nová velikost)

## Bezpečnostní Opatření

### ⚠️ Upozornění pro uživatele:
- Červené upozornění: "Testy nahradí původní soubor zpracovanou verzí. Ujistěte se, že máte zálohu."
- Názvy tlačítek jasně označují, že jde o test

### 🔄 Stav during processing:
- **OCR**: "🔄 Zpracovávám..." (disabled state)
- **Komprese**: "🔄 Komprimuji..." (disabled state)
- Dropdown je disabled během OCR zpracování

### 🏷️ Naming convention nových souborů:
- **OCR**: `timestamp-ocr-originalfilename.pdf`
- **Komprese**: `timestamp-compressed-originalfilename.pdf`

## Výsledky & Feedback

### ✅ Úspěšný OCR:
```
✅ OCR test úspěšný!

Soubor byl zpracován a nahrazen.
Nový soubor: 1640543210000-ocr-originalfile.pdf
```

### ✅ Úspěšná Komprese:
```
✅ Komprese test úspěšná!

Původní velikost: 2.45 MB
Nová velikost: 1.82 MB
Ušetřeno: 25.7%

Soubor byl nahrazen: 1640543210000-compressed-originalfile.pdf
```

### ❌ Error Handling:
- Zobrazí se alert s detailní chybovou zprávou
- Console logy pro debugging
- Retry mechanismus už implementován v iLovePDF službe

## Technické Detaily

### API Integrace:
- **OCR**: `ILovePDFService.performOCR(file, language)`
- **Komprese**: `ILovePDFService.compressPDF(file)`
- **Jazyky**: `ILovePDFService.getAvailableLanguages()`

### Database Updates:
```sql
-- OCR test
UPDATE books SET file_path = 'new-path', has_ocr = true WHERE id = 'book-id';

-- Komprese test  
UPDATE books SET file_path = 'new-path', file_size = new_size WHERE id = 'book-id';
```

### Storage Operations:
- **Download**: `supabaseClient.storage.from('Books').download(filePath)`
- **Upload**: `supabaseClient.storage.from('Books').upload(newPath, processedFile)`

## Debugging

### Console Logy:
```
🧪 Testování OCR pro knihu: název-knihy
📄 Soubor: original-file-path.pdf  
🌐 Jazyk: Čeština
📊 Velikost souboru: 2.45 MB
🔍 OCR zpracování dokončeno pro jazyk ces
✅ OCR dokončeno. Nová velikost: 2.52 MB
```

### Error Logy:
```
❌ Test OCR selhal: [error details]
❌ Test komprese selhal: [error details]
```

## Následující Kroky

Po úspěšném otestování obou funkcí můžete:
1. ✅ Ověřit správnost OCR rozpoznání
2. ✅ Ověřit kvalitu komprese  
3. ✅ Zkontrolovat, že soubory se správně nahradily
4. 🔄 Integrovat do hlavního upload workflow
5. 🗑️ Odstranit testovací prostředí (nebo ho zachovat pro debug)

---
*Testovací prostředí je připraveno k použití!*
