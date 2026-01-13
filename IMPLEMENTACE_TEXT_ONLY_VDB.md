# Implementace: Odeslání pouze textu do vektorové databáze

## ✅ Dokončeno

Implementována nová funkce pro **odeslání pouze extrahovaného textu** (TXT) do vektorové databáze, paralelně k existující funkci pro odeslání PDF.

---

## 🎯 Co bylo přidáno

### 1. Nová API funkce: `sendTextOnlyToVectorDatabase`

**Lokace:** `index.tsx:1547-1884`

**Funkce:**
- Extrahuje text z PDF (z mezipaměti nebo přes OCR webhook)
- Vytvoří TXT Blob soubor
- Odešle TXT + metadata na existující webhook s parametrem `contentType: 'text'`
- Podporuje režim čekání na odpověď (timeout 5 minut) i fire-and-forget
- Parsuje response stejně jako PDF verze (Qdrant Local, Cloud, Supabase)
- Aktualizuje statusy v databázi

**Klíčové vlastnosti:**
```typescript
async sendTextOnlyToVectorDatabase(
  book: Book, 
  waitForResponse: boolean = false
): Promise<{success: boolean, message: string, details?: any}>
```

**Proces:**
1. ✅ Získá extrahovaný text (mezipaměť nebo **LOKÁLNÍ extrakce pomocí PDF.js**)
2. ✅ Vytvoří TXT Blob: `new Blob([text], { type: 'text/plain' })`
3. ✅ Přidá do FormData:
   - `file` - TXT binární soubor
   - `fileType: 'txt'`
   - `contentType: 'text'` 🔑 **KLÍČOVÝ PARAMETR**
   - Všechna metadata knihy
4. ✅ POST na webhook `10f5ed9e-e0b1-465d-8bc8-b2ba9a37bc58`
5. ✅ Parsuje odpověď a aktualizuje statusy

---

### 2. Nová UI funkce: `confirmTextOnlyVectorDatabaseAction`

**Lokace:** `index.tsx:4665-4717`

**Funkce:**
- Handler pro tlačítko "Odeslat pouze text do VDB"
- Volá `api.sendTextOnlyToVectorDatabase(book, true)`
- Zobrazuje loading state během zpracování
- Aktualizuje status knihy v seznamu (success/error)
- Zobrazuje alert s výsledkem

---

### 3. Nové UI tlačítko v modalu

**Lokace:** `index.tsx:5375-5386`

**Modal:** "Potvrdit odeslání do vektorové databáze"

**Nová tlačítka:**

```tsx
// NOVÉ - Text-only tlačítko
<button 
  style={{backgroundColor: '#28a745', color: 'white'}}
  onClick={confirmTextOnlyVectorDatabaseAction}
  title="Odešle pouze extrahovaný text do VDB (rychlejší, menší velikost)"
>
  📄 Odeslat pouze text do VDB
</button>

// UPRAVENÉ - Původní PDF tlačítko (přejmenováno)
<button 
  style={{backgroundColor: '#007bff', color: 'white'}}
  onClick={confirmVectorDatabaseAction}
  title="Odešle celé PDF včetně binárních dat do VDB"
>
  <IconDatabase status="pending" /> Odeslat PDF do VDB
</button>
```

**UI změny:**
- ✅ Přidáno zelené tlačítko "📄 Odeslat pouze text do VDB"
- ✅ Modré tlačítko přejmenováno na "Odeslat PDF do VDB" (jasné rozlišení)
- ✅ Tooltip nápověda pro obě tlačítka
- ✅ Flexwrap pro responsive layout

---

### 4. N8N Workflow dokumentace

**Nový soubor:** `N8N_WORKFLOW_TEXT_ONLY_UPDATE.md`

**Obsah:**
- ✅ Detekce `contentType` parametru v N8N workflow
- ✅ Conditional branching (PDF vs TXT)
- ✅ Code node příklady pro čtení TXT souboru
- ✅ Backwards compatibility pravidla
- ✅ Testing příklady (cURL)
- ✅ Diagram workflow
- ✅ Response formát specifikace

---

## 🔧 Technické detaily

### Webhook endpoint

**URL:** `https://n8n.srv980546.hstgr.cloud/webhook/10f5ed9e-e0b1-465d-8bc8-b2ba9a37bc58`

**Použití:** STEJNÝ webhook pro PDF i TXT (rozlišení přes `contentType` parametr)

### FormData parametry

#### Text-only specifické:
```javascript
formData.append('file', txtBlob, 'book.txt');
formData.append('fileType', 'txt');
formData.append('contentType', 'text'); // 🔑 KLÍČOVÝ
formData.append('format', 'TXT');
```

#### PDF režim (původní):
```javascript
formData.append('file', pdfBlob, 'book.pdf');
formData.append('fileType', 'pdf');
formData.append('contentType', 'pdf'); // NEBO není nastaveno
formData.append('format', 'PDF');
```

### Detekce režimu v N8N

```javascript
const contentType = $input.all()[0].json.contentType || 'pdf';
const isTextMode = contentType === 'text';
```

---

## 📊 Datový tok - Text-only

```
┌─────────────────────────────────────────────┐
│ 1. Uživatel klikne "Odeslat pouze text"    │
│    Component: Modal dialog                  │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│ 2. Frontend: confirmTextOnlyVectorDatabase  │
│    - Zkontroluj mezipaměť pro extrahovaný   │
│      text                                   │
│    - Pokud není → zavolej OCR webhook       │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│ 3. sendTextOnlyToVectorDatabase()           │
│    - Stáhni PDF z Supabase Storage          │
│    - Extrahuj text lokálně (PDF.js)         │
│    - Vytvoř TXT Blob                        │
│    - Přidej do FormData + contentType='text'│
│    - POST na webhook                        │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│ 4. N8N Webhook (10f5ed9e)                   │
│    - Detekuj contentType === 'text'         │
│    - Read TXT file from binary              │
│    - Vytvoř embeddings (OpenAI)             │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│ 5. Parallel Upload                          │
│    ├─ Qdrant Local                          │
│    ├─ Qdrant Cloud                          │
│    └─ Supabase Vector                       │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│ 6. Response Processing                      │
│    - Parse statusy (qdrant_ok, supabase_ok) │
│    - Aktualizuj books tabulku               │
│    - Zobraz alert uživateli                 │
└─────────────────────────────────────────────┘
```

---

## 🆚 Porovnání: PDF vs Text-only

| Vlastnost | PDF režim | Text-only režim |
|-----------|-----------|-----------------|
| **Soubor** | PDF binární data | TXT binární data |
| **Velikost** | Řádově MB | Řádově KB |
| **Zpracování** | PDF parsing v N8N | Přímé čtení textu |
| **OCR nutná** | Ano (v N8N) | Ne (už extrahováno) |
| **Rychlost** | Pomalejší | Rychlejší ⚡ |
| **Náklady** | Vyšší (PDF parsing) | Nižší 💰 |
| **Webhook** | `10f5ed9e` | `10f5ed9e` (stejný!) |
| **contentType** | `pdf` nebo prázdné | `text` |

---

## ✅ Výhody Text-only režimu

1. **Rychlejší zpracování:**
   - Žádný PDF parsing nutný
   - Text už extrahovaný a připravený

2. **Menší velikost:**
   - TXT soubor je 10-100× menší než PDF
   - Rychlejší upload, menší bandwidth

3. **Nižší náklady:**
   - Méně API calls v N8N (bez PDF parsingu)
   - Rychlejší = levnější compute

4. **Jednodušší debugging:**
   - Text je readable, PDF je binární
   - Snazší validace

5. **Fallback ready:**
   - Pokud PDF parsing selže, text-only funguje

---

## 🔒 Bezpečnost & Validace

### Frontend validace:
- ✅ Kontrola, že extrahovaný text není prázdný
- ✅ Pokud text není v mezipaměti → automatická OCR extrakce
- ✅ Loading state během zpracování
- ✅ Error handling s user-friendly zprávami

### N8N workflow validace (doporučeno):
- ⚠️ Validovat, že `contentType` je `text` nebo `pdf`
- ⚠️ Validovat, že TXT soubor není prázdný
- ⚠️ Validovat UTF-8 encoding
- ⚠️ Chunking pro dlouhé texty (>8000 tokenů)

---

## 🧪 Testing

### Manuální test v aplikaci:

1. **Otevřít aplikaci** a přihlásit se jako admin
2. **Nahrát PDF knihu** (nebo vybrat existující)
3. **Kliknout na ikonu databáze** u knihy
4. **Otevře se modal** "Potvrdit odeslání do vektorové databáze"
5. **Viditelná 2 tlačítka:**
   - 📄 **Odeslat pouze text do VDB** (zelené) 🆕
   - 📊 **Odeslat PDF do VDB** (modré)
6. **Kliknout na "Odeslat pouze text"**
7. **Očekávaný výsledek:**
   - Loading state (ikona se točí)
   - Po ~30-120s → Success alert
   - Status knihy → ✅ success (zelená)

### Konzole log validace:

```javascript
// Očekávané logy:
📄 Připravuji text-only data pro vektorovou databázi...
✅ Používám text z mezipaměti: 12345 znaků
📄 Vytvořen TXT soubor: book.txt Velikost: 12345 bytes
📦 FormData připraven s TXT souborem a metadaty
⏳ Odesílám webhook (text-only) a čekám na odpověď...
📥 Webhook raw odpověď (text-only): [...]
✅ Webhook odpověď parsována
🔄 Aktualizuji statusy jednotlivých databází...
✅ Statusy úspěšně aktualizovány v databázi
```

### N8N workflow test (před nasazením):

**DŮLEŽITÉ:** N8N workflow MUSÍ být aktualizován před použitím!

```bash
# Test cURL request:
curl -X POST https://n8n.srv980546.hstgr.cloud/webhook/10f5ed9e-e0b1-465d-8bc8-b2ba9a37bc58 \
  -F "file=@test.txt" \
  -F "contentType=text" \
  -F "fileType=txt" \
  -F "bookId=test-123" \
  -F "title=Test Book"
```

---

## 🚨 Známá omezení

1. **N8N workflow MUSÍ být aktualizován**
   - Bez aktualizace workflow funkce nebude fungovat
   - Viz: `N8N_WORKFLOW_TEXT_ONLY_UPDATE.md`

2. **Text je extrahován LOKÁLNĚ pomocí PDF.js**
   - Pokud text není v mezipaměti → automatická lokální extrakce
   - Extrakce funguje přímo v prohlížeči (žádný webhook nutný)
   - Rychlejší a spolehlivější než webhook OCR

3. **TXT soubor je dočasný**
   - TXT soubor existuje pouze v paměti (Blob)
   - Není uložen do Supabase Storage
   - Pro opakované odeslání se vytvoří znovu

4. **Backwards compatibility**
   - Stávající PDF režim NESMÍ přestat fungovat
   - N8N workflow musí zachovat podporu pro prázdný `contentType`

---

## 📝 Další kroky

### Pro vývojáře:

1. ✅ **Frontend implementace** - DOKONČENO
2. ⚠️ **N8N workflow aktualizace** - ČEKÁ NA IMPLEMENTACI
   - Viz: `N8N_WORKFLOW_TEXT_ONLY_UPDATE.md`
   - Přidej detekci `contentType`
   - Implementuj TXT čtení
   - Testuj oba režimy

3. ⚠️ **Testování** - ČEKÁ NA N8N AKTUALIZACI
   - Test PDF režim (backwards compatibility)
   - Test Text-only režim
   - Test error states

### Pro dokumentaci:

- ⚠️ Pokud je funkce validována → přidat do `CORE.md`
- ⚠️ Spustit "core it" validaci před přidáním

---

## 🔄 Rollback plán

Pokud je potřeba vrátit změny:

```bash
# Smazat novou funkci sendTextOnlyToVectorDatabase
# Smazat funkci confirmTextOnlyVectorDatabaseAction
# Odstranit zelené tlačítko "Odeslat pouze text"
# Vrátit modré tlačítko na původní text "Odeslat do VDB"

git checkout index.tsx
```

---

**Implementováno:** 2025-01-12  
**Autor:** Cursor AI Assistant  
**Status:** ✅ Frontend dokončen, ⚠️ čeká na N8N workflow aktualizaci  
**Varianta:** A - Minimální dopad s existujícím webhookem
