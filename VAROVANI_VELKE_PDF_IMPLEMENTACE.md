# Implementace varování pro velké PDF soubory

## ✅ Dokončeno

Implementována kontrola počtu stránek PDF před odesláním do vektorové databáze (VDB) s automatickým varováním pro soubory větší než 1000 stránek.

---

## 🎯 Co bylo přidáno

### 1. Automatická kontrola počtu stránek před odesláním PDF do VDB

**Lokace:** `index.tsx` - funkce `sendToVectorDatabase()` (řádek ~1220)

**Proces:**
1. ✅ Stáhne PDF soubor z Supabase Storage
2. ✅ Spočítá počet stránek pomocí PDF.js
3. ✅ Pokud PDF má více než 1000 stránek → zobrazí varování
4. ✅ Uživatel může:
   - **Pokračovat** s odesláním PDF (může trvat dlouho)
   - **Zrušit** akci a místo toho odeslat text-only

**Implementace:**
```typescript
// ⚠️ KONTROLA POČTU STRÁNEK PDF - VAROVÁNÍ PRO VELKÉ SOUBORY
if (book.format.toLowerCase() === 'pdf') {
    console.log('📄 Kontroluji počet stránek PDF před odesláním do VDB...');
    
    try {
        const pdfLib = getPdfjsLib();
        if (!pdfLib) {
            console.warn('⚠️ PDF.js není dostupný, přeskakuji kontrolu počtu stránek');
        } else {
            const fileBuffer = await fileData.arrayBuffer();
            const loadingTask = pdfLib.getDocument(fileBuffer);
            const pdf = await loadingTask.promise;
            const pageCount = pdf.numPages;
            
            console.log(`📊 PDF má ${pageCount} stránek`);
            
            // Varování pro velké PDF soubory (více než 1000 stránek)
            if (pageCount > 1000) {
                console.warn(`⚠️ PDF má ${pageCount} stránek, což je více než doporučený limit 1000 stránek!`);
                
                // Zobrazíme varování uživateli
                const warningMessage = [
                    `⚠️ VAROVÁNÍ: Vysoký počet stránek`,
                    ``,
                    `PDF dokument má ${pageCount} stránek, což překračuje doporučený limit 1000 stránek.`,
                    ``,
                    `📋 Důvody:`,
                    `• Zpracování může trvat velmi dlouho (několik minut)`,
                    `• Vyšší náklady na embeddings`,
                    `• Možné timeout při zpracování`,
                    ``,
                    `💡 DOPORUČENÍ: Odeslat pouze extrahovaný text`,
                    ``,
                    `Chcete pokračovat s odesláním PDF, nebo raději odeslat jen text?`,
                    ``,
                    `Klikněte na:`,
                    `• OK = Pokračovat s PDF (může trvat dlouho)`,
                    `• ZRUŠIT = Zrušit akci (doporučeno odeslat text)`,
                ].join('\n');
                
                const userWantsToContinue = confirm(warningMessage);
                
                if (!userWantsToContinue) {
                    // Uživatel zrušil odeslání PDF
                    await api.updateBook({...book, vectorStatus: 'none'});
                    
                    throw new Error(`❌ Odeslání PDF zrušeno uživatelem.\n\n📝 Doporučení: Použijte tlačítko "Odeslat pouze text do VDB" pro rychlejší zpracování.\n\n💡 Text-only režim je vhodný pro PDF s více než 1000 stránkami.`);
                }
                
                console.log(`⚠️ Uživatel potvrdil odeslání velkého PDF (${pageCount} stránek) do VDB`);
                alert(`⏳ Zpracování může trvat několik minut.\n\nPočet stránek: ${pageCount}\nOčekávaná doba: 5-10 minut\n\nProsím, čekejte...`);
            }
        }
    } catch (pdfError) {
        console.warn('⚠️ Nepodařilo se zkontrolovat počet stránek PDF:', pdfError);
        // Pokračujeme i při chybě kontroly stránek
    }
}
```

---

### 2. Informační banner v modalu s doporučeními

**Lokace:** `index.tsx` - Modal "Potvrdit odeslání do vektorové databáze" (řádek ~5485)

**Přidán nový informační box:**

```typescript
<div style={{margin: '1.5rem 0', padding: '1rem', backgroundColor: '#fff3cd', borderRadius: '8px', border: '1px solid #ffc107'}}>
    <div style={{fontSize: '0.95em'}}>
        <div style={{fontWeight: '500', marginBottom: '8px', color: '#856404'}}>💡 Doporučení pro velké PDF</div>
        <div style={{fontSize: '0.85em', color: '#856404', lineHeight: '1.5'}}>
            <strong>PDF s více než 1000 stránkami:</strong> Doporučujeme použít tlačítko <strong>"Odeslat pouze text do VDB"</strong> 
            pro rychlejší zpracování a nižší náklady. Systém automaticky varuje při detekci velkých souborů.
        </div>
        <div style={{fontSize: '0.85em', color: '#856404', lineHeight: '1.5', marginTop: '8px'}}>
            <strong>Text-only výhody:</strong> ⚡ Rychlejší • 💰 Nižší náklady • ✅ Spolehlivější pro velké soubory
        </div>
    </div>
</div>
```

**Vizuální ukázka:**

```
┌─────────────────────────────────────────────────────────┐
│ 💡 Doporučení pro velké PDF                             │
│                                                          │
│ PDF s více než 1000 stránkami: Doporučujeme použít     │
│ tlačítko "Odeslat pouze text do VDB" pro rychlejší      │
│ zpracování a nižší náklady.                             │
│                                                          │
│ Text-only výhody: ⚡ Rychlejší • 💰 Nižší náklady •     │
│                   ✅ Spolehlivější pro velké soubory     │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Datový tok

### Flow: Odeslání PDF do VDB s kontrolou stránek

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User Action                                               │
│    Uživatel klikne "Odeslat PDF do VDB"                     │
│    Component: Modal → confirmVectorDatabaseAction()         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. API Call                                                  │
│    api.sendToVectorDatabase(book, true)                     │
│    - Stáhne PDF z Supabase Storage                          │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. PDF.js Kontrola Stránek                                  │
│    - Načte PDF pomocí PDF.js                                │
│    - Spočítá pdf.numPages                                   │
│    - Log: "📊 PDF má X stránek"                             │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Podmínka: pageCount > 1000?                              │
│    ┌─────────────────────┐    ┌─────────────────────┐      │
│    │ ANO (>1000 stránek) │    │ NE (≤1000 stránek)  │      │
│    │ → Zobraz varování   │    │ → Pokračuj normálně │      │
│    └────────┬────────────┘    └──────────┬──────────┘      │
└─────────────┼───────────────────────────┼─────────────────┘
              │                            │
              ▼                            ▼
┌─────────────────────────────┐  ┌─────────────────────────────┐
│ 5A. Varování Dialog         │  │ 5B. Normální zpracování      │
│    - Zobraz confirm dialog  │  │    - Pokračuj s odesláním    │
│    - Uživatel volí:         │  │    - Webhook call            │
│      • OK → pokračovat      │  │    - Čekání na odpověď       │
│      • ZRUŠIT → stop        │  │    - Aktualizace statusu     │
│                              │  └─────────────────────────────┘
│    Pokud ZRUŠIT:            │
│    → throw Error s návodem  │
│    → Doporuč text-only      │
│                              │
│    Pokud OK:                │
│    → Alert "čekejte..."     │
│    → Pokračuj v kroku 6     │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Webhook Call                                              │
│    - POST na N8N webhook                                     │
│    - FormData s PDF binárním souborem                        │
│    - Timeout 5 minut                                         │
│    - Čekání na odpověď (waitForResponse: true)              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Response Processing                                       │
│    - Parse statusy (qdrant_ok, supabase_ok)                 │
│    - Aktualizuj books tabulku                               │
│    - Zobraz výsledek uživateli                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Technické detaily

### Kontrola počtu stránek

**Knihovna:** PDF.js (načtená globálně z CDN)

**Metoda:**
```typescript
const pdfLib = getPdfjsLib(); // Helper funkce pro získání PDF.js
const fileBuffer = await fileData.arrayBuffer();
const loadingTask = pdfLib.getDocument(fileBuffer);
const pdf = await loadingTask.promise;
const pageCount = pdf.numPages;
```

**Důležité:**
- PDF.js je načten globálně přes `window.pdfjsLib`
- Používáme helper funkci `getPdfjsLib()` pro bezpečný přístup
- Kontrola stránek je **před** odesláním na webhook (šetří náklady)
- Pokud PDF.js není dostupný → přeskočí kontrolu (fallback)

### Prahová hodnota: 1000 stránek

**Důvody:**
1. **Zpracování:** PDF s >1000 stránkami trvá 5-10 minut
2. **Náklady:** Embeddings pro každou stránku → vysoké náklady
3. **Timeout:** Webhook má timeout 5 minut → riziko selhání
4. **Spolehlivost:** Text-only režim je rychlejší a spolehlivější

**Alternativa:** Text-only režim
- Rychlejší: Pouze text bez PDF parsing
- Levnější: Menší velikost dat → méně API volání
- Spolehlivější: Bez rizika timeout

---

## 🎨 UI/UX

### 1. Varovný dialog (confirm)

**Text:**
```
⚠️ VAROVÁNÍ: Vysoký počet stránek

PDF dokument má 1234 stránek, což překračuje doporučený limit 1000 stránek.

📋 Důvody:
• Zpracování může trvat velmi dlouho (několik minut)
• Vyšší náklady na embeddings
• Možné timeout při zpracování

💡 DOPORUČENÍ: Odeslat pouze extrahovaný text

Chcete pokračovat s odesláním PDF, nebo raději odeslat jen text?

Klikněte na:
• OK = Pokračovat s PDF (může trvat dlouho)
• ZRUŠIT = Zrušit akci (doporučeno odeslat text)
```

### 2. Informační banner v modalu

**Barva:** #fff3cd (světle žlutá)
**Border:** #ffc107 (oranžová)
**Pozice:** Mezi popisem a tlačítky

**Obsah:**
- 💡 Ikona pro doporučení
- **Bold** důležité informace
- Výhody text-only režimu (emoji)

---

## ✅ Testování

### Test 1: PDF s méně než 1000 stránkami

**Kroky:**
1. Vybrat knihu s PDF < 1000 stránek
2. Kliknout "Odeslat PDF do VDB"

**Očekávaný výsledek:**
- ✅ Žádné varování
- ✅ Přímé odeslání na webhook
- ✅ Normální zpracování

### Test 2: PDF s více než 1000 stránkami

**Kroky:**
1. Vybrat knihu s PDF > 1000 stránek
2. Kliknout "Odeslat PDF do VDB"
3. Zobrazí se varování s počtem stránek

**Scénář A: Uživatel klikne ZRUŠIT**
- ✅ Akce se zruší
- ✅ Status zůstane "none"
- ✅ Zobrazí se error s návodem

**Scénář B: Uživatel klikne OK**
- ✅ Zobrazí se alert "čekejte..."
- ✅ Pokračuje odeslání PDF
- ✅ Webhook se zavolá
- ✅ Čeká na odpověď (5 minut timeout)

### Test 3: PDF.js není dostupný

**Kroky:**
1. Simulovat nedostupnost PDF.js
2. Vybrat jakoukoli knihu
3. Kliknout "Odeslat PDF do VDB"

**Očekávaný výsledek:**
- ✅ Varování v console: "⚠️ PDF.js není dostupný"
- ✅ Přeskočí kontrolu stránek
- ✅ Pokračuje normální odeslání (bez varování)

---

## 📋 Validace dat

### Console logy

```javascript
// Kontrola stránek
console.log('📄 Kontroluji počet stránek PDF před odesláním do VDB...');
console.log(`📊 PDF má ${pageCount} stránek`);

// Varování
console.warn(`⚠️ PDF má ${pageCount} stránek, což je více než doporučený limit 1000 stránek!`);

// Uživatelské rozhodnutí
console.log(`⚠️ Uživatel potvrdil odeslání velkého PDF (${pageCount} stránek) do VDB`);

// Chyby
console.warn('⚠️ Nepodařilo se zkontrolovat počet stránek PDF:', pdfError);
console.warn('⚠️ PDF.js není dostupný, přeskakuji kontrolu počtu stránek');
```

---

## 🔗 Související funkce

### Text-only režim

**Funkce:** `api.sendTextOnlyToVectorDatabase(book, true)`

**Výhody:**
- ⚡ **Rychlejší:** Pouze text bez PDF parsing
- 💰 **Levnější:** Menší velikost → méně API volání
- ✅ **Spolehlivější:** Bez rizika timeout
- 📦 **Menší:** Textový soubor vs binární PDF

**Kdy použít:**
- PDF s více než 1000 stránkami
- Pomalé internetové připojení
- Úspora nákladů
- Priorita rychlosti

---

## 🚀 Budoucí vylepšení

### Možná rozšíření:

1. **Dynamický limit:** Nastavitelný limit stránek (ne fixed 1000)
2. **Progress bar:** Zobrazení pokroku při velkých PDF
3. **Auto-text režim:** Automaticky text-only pro >1000 stránek
4. **Batch processing:** Rozdělení velkých PDF na menší chunky
5. **Estimace času:** Výpočet očekávané doby zpracování podle stránek

---

## ✅ Status

**Implementace:** ✅ Dokončeno  
**Testování:** ⏳ Připraveno k testování  
**Dokumentace:** ✅ Dokončeno  
**Datum:** 2026-01-13

---

## 📝 Poznámky

- Kontrola stránek běží **před** odesláním na webhook → šetří náklady
- PDF.js je globální knihovna načtená z CDN
- Varování je **neblokující** → uživatel může pokračovat
- Text-only režim je **doporučený** pro velké soubory
- Modal obsahuje **vizuální** návod pro uživatele
