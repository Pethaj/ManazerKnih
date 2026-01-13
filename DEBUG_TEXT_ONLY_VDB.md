# Debug: Odeslat pouze text do VDB

## 🎯 Účel

Diagnostika problému, kdy se do N8N webhooku posílá prázdný/chybný dokument místo extrahovaného textu.

---

## 🔍 Přidaný Debug Logging

Do funkce `sendTextOnlyToVectorDatabase` byl přidán podrobný debug logging na 5 klíčových míst:

### A. Po stažení PDF ze Storage
```javascript
🔍 DEBUG fileData: { size, type, constructor }
```

### B. Před voláním extractTextLocallyFromPDF
```javascript
🔍 DEBUG pdfFile před extrakcí: { name, size, type }
```

### C. Po volání extractTextLocallyFromPDF
```javascript
🔍 DEBUG txtFile po extrakci: { name, size, type }
```

### D. Po načtení textu ze souboru
```javascript
🔍 DEBUG prvních 500 znaků textu: [text...]
```

### E. Po vytvoření txtBlob pro webhook
```javascript
🔍 DEBUG txtBlob: { size, type }
🔍 DEBUG prvních 200 bajtů txtBlob: [text...]
```

---

## 🧪 Jak testovat

### Krok 1: Příprava
1. Otevři aplikaci v prohlížeči
2. Otevři Developer Console (F12 → Console tab)
3. Vymaž console (`clear()` nebo Ctrl+L)

### Krok 2: Vyber testovací knihu
**DŮLEŽITÉ:** Kniha MUSÍ být nahraná jako **PDF** (ne TXT)

Jak poznat:
- V seznamu knih najdi knihu s formátem "PDF"
- Ideálně knihu, která má více stránek (100+)

### Krok 3: Smaž mezipaměť (volitelné)
Pro čistý test smaž cached text:
```javascript
// V console:
const bookId = 'BOOK_ID_HERE'; // Nahraď skutečným ID knihy
localStorage.removeItem(`extracted_text_${bookId}`);
localStorage.removeItem(`extracted_text_${bookId}_timestamp`);
console.log('✅ Mezipaměť smazána');
```

### Krok 4: Spusť "Odeslat pouze text do VDB"
1. Klikni na knihu (otevře detail)
2. Klikni zelené tlačítko **"📄 Odeslat pouze text do VDB"**
3. Potvrď modal dialog

### Krok 5: Sleduj console logy
Očekávané logy (úspěšný průběh):

```
📄 Připravuji text-only data pro vektorovou databázi...
📥 Text není v mezipaměti, spouštím LOKÁLNÍ extrakci z PDF...
📄 PDF staženo, velikost: 4319719 bytes
🔍 DEBUG fileData: {
  size: 4319719,
  type: "application/pdf",
  constructor: "Blob"
}
🔍 DEBUG pdfFile před extrakcí: {
  name: "book_1768213424248_wn5xoi8wj.pdf",
  size: 4319719,
  type: "application/pdf"
}
📄 Spouštím lokální extrakci textu z PDF...
📄 Soubor: book_1768213424248_wn5xoi8wj.pdf Velikost: 4218.48 KB
📚 Načítám PDF dokument...
📄 PDF má 245 stránek
📄 Zpracováno 10/245 stránek
📄 Zpracováno 20/245 stránek
...
📄 Zpracováno 245/245 stránek
✅ Extrakce textu dokončena
📊 Celková délka textu: 125643 znaků
✅ Vytvořen textový soubor: {
  name: "book_1768213424248_wn5xoi8wj.txt",
  size: 125643,
  sizeKB: "122.70",
  type: "text/plain"
}
🔍 DEBUG txtFile po extrakci: {
  name: "book_1768213424248_wn5xoi8wj.txt",
  size: 125643,
  type: "text/plain"
}
✅ Text extrahován lokálně: 125643 znaků
🔍 DEBUG prvních 500 znaků textu:

--- Stránka 1 ---

[skutečný text z knihy...]
💾 Text uložen do mezipaměti
📄 Vytvořen TXT soubor: book_1768213424248_wn5xoi8wj.txt Velikost: 125643 bytes
🔍 DEBUG txtBlob: {
  size: 125643,
  type: "text/plain; charset=utf-8"
}
🔍 DEBUG prvních 200 bajtů txtBlob:

--- Stránka 1 ---

[skutečný text z knihy...]
📦 FormData připraven s TXT souborem a metadaty: {...}
⏳ Odesílám webhook (text-only) a čekám na odpověď (timeout 5 minut)...
```

---

## 🚨 Možné chybové stavy

### Chyba A: PDF se nestahuje
```
❌ Chyba: "Nepodařilo se stáhnout soubor: ..."
```

**Příčina:**
- `book.filePath` je špatně
- Soubor neexistuje ve Supabase Storage
- Problém s přístupovými právy

**Řešení:**
1. Zkontroluj `book.filePath` v databázi
2. Ověř, že soubor existuje ve Storage
3. Zkontroluj RLS policies

---

### Chyba B: PDF.js není načtený
```
❌ Chyba: "PDF.js není načten. Zkuste obnovit stránku."
```

**Příčina:**
- PDF.js knihovna není dostupná na stránce
- CDN script se nenačetl

**Řešení:**
1. Obnov stránku (F5)
2. Zkontroluj Network tab - načetl se `pdf.js` script?
3. Zkontroluj `index.html` - je tam `<script>` tag pro PDF.js?

---

### Chyba C: PDF je poškozený nebo šifrovaný
```
📚 Načítám PDF dokument...
❌ Chyba při načítání PDF dokumentu: Invalid PDF structure
```

**Příčina:**
- PDF je poškozené
- PDF je šifrované (heslem chráněné)
- PDF má nestandardní formát

**Řešení:**
1. Zkus jinou knihu
2. Pokud problém přetrvává u všech PDF → problém v kódu
3. Pro šifrované PDF použij "Nahrát pouze text 1" (OCR webhook)

---

### Chyba D: Text je prázdný
```
✅ Extrakce textu dokončena
📊 Celková délka textu: 0 znaků
❌ Chyba: "Extrahovaný text je prázdný..."
```

**Příčina:**
- PDF obsahuje pouze obrázky (bez OCR vrstvy)
- PDF má text jako vektorovou grafiku

**Řešení:**
- Použij "Nahrát pouze text 1" (OCR webhook) pro extrakci textu z obrázků

---

### Chyba E: Text je extrahovaný ale txtBlob je malý
```
✅ Text extrahován: 125643 znaků
📄 Vytvořen TXT soubor: 84 bytes  ← 🚨 NESOUHLASÍ!
🔍 DEBUG prvních 200 bajtů txtBlob:
{"output":"Please upload the document..."}
```

**Příčina:**
- Proměnná `extractedText` je přepsána
- Vytvoření Blob selhává
- **BUG v kódu**

**Řešení:**
- Toto je přesně ten problém, který hledáme!
- Pošli logy vývojářům

---

## 📊 Co sledovat

### ✅ SPRÁVNÝ výsledek:
```
🔍 DEBUG fileData: { size: 4319719, ... }           ← Velký soubor (MB)
🔍 DEBUG pdfFile před extrakcí: { size: 4319719 }   ← Stejná velikost
📊 Celková délka textu: 125643 znaků                ← Velký text (100K+)
🔍 DEBUG txtBlob: { size: 125643 }                  ← Stejná velikost jako text
🔍 DEBUG prvních 200 bajtů txtBlob:
--- Stránka 1 ---                                   ← Skutečný text knihy
Going Natural...
```

### ❌ CHYBNÝ výsledek:
```
🔍 DEBUG txtBlob: { size: 84 }                      ← Malý soubor!
🔍 DEBUG prvních 200 bajtů txtBlob:
{"output":"Please upload..."}                       ← JSON error místo textu!
```

---

## 📝 Co poslat vývojářům

Pokud najdeš chybu, pošli:

1. **Celé console logy** (zkopíruj vše)
2. **Informace o knize:**
   - ID knihy
   - Název knihy
   - Formát (PDF/TXT)
   - Velikost souboru
3. **Screenshot problému**

---

## 🔧 Dočasné řešení

Pokud problém přetrvává, použij **dočasné řešení**:

1. **"Nahrát pouze text 1"** (OCR webhook) - pro upload nových knih
2. **"Odeslat PDF do VDB"** (původní metoda) - pro knihy v databázi

---

**Status:** 🧪 Debug režim aktivní  
**Datum:** 2025-01-13  
**Verze:** 1.0
