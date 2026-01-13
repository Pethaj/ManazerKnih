# N8N Workflow - Aktualizace pro Text-Only režim

## Přehled změny

Do existujícího N8N workflow (`10f5ed9e-e0b1-465d-8bc8-b2ba9a37bc58`) byla přidána podpora pro **text-only** nahrávání do vektorové databáze.

Frontend nyní může poslat buď:
1. **PDF soubor** (původní chování)
2. **TXT soubor** (nový text-only režim)

## Detekce režimu v N8N

Workflow musí detekovat, zda přišel PDF nebo TXT soubor podle parametru `contentType`:

### FormData parametry

#### Společné parametry (oba režimy):
- `bookId` - ID knihy v databázi
- `fileName` - Název souboru
- `id`, `title`, `author`, `publicationYear`, `publisher`, `summary`, `language`, `releaseVersion`
- `keywords[]`, `categories[]`, `labels[]`, `publicationTypes[]`

#### Specifické parametry:

**PDF režim:**
- `file` - PDF binární soubor
- `fileType` - `"pdf"`
- `contentType` - není nastaveno (backwards compatible) NEBO `"pdf"`

**Text-only režim:**
- `file` - TXT binární soubor (plain text)
- `fileType` - `"txt"`
- `contentType` - `"text"` 🔑 **KLÍČOVÝ PARAMETR**

## Implementace v N8N Workflow

### 1. Detekce režimu

Na začátku workflow přidejte **Code Node** pro detekci:

```javascript
// Detekce contentType z FormData
const contentType = $input.all()[0].json.contentType || 'pdf'; // Default PDF pro backwards compatibility

return [
  {
    json: {
      contentType: contentType,
      isPdfMode: contentType === 'pdf' || !contentType,
      isTextMode: contentType === 'text'
    }
  }
];
```

### 2. Conditional branching

Použijte **Switch Node** nebo **IF Node**:

```javascript
// IF Node podmínka
{{ $json.contentType === 'text' }}
```

### 3. Text-only workflow větev

**PRO TEXT-ONLY (`contentType === 'text'`):**

```
1. Přijmi TXT soubor z FormData
   └─> Klíč: "file"
   └─> Content-Type: text/plain

2. Přečti textový obsah souboru
   └─> Použij Binary Data → Text conversion

3. Vytvoř embeddings z textu
   └─> OpenAI Embeddings API
   └─> Model: text-embedding-ada-002 (nebo text-embedding-3-small)
   └─> Input: celý text z TXT souboru

4. Nahraj do Qdrant Local
   └─> Collection: <your-collection-name>
   └─> Payload: metadata z FormData
   └─> Vector: embeddings z kroku 3

5. Nahraj do Qdrant Cloud
   └─> Collection: <your-collection-name>
   └─> Payload: metadata z FormData
   └─> Vector: embeddings z kroku 3

6. Nahraj do Supabase Vector
   └─> Table: documents
   └─> Payload: metadata + embedding
   
7. Vrať JSON odpověď
   └─> Formát: [
         { "qdrant_ok": true/false, "qdrant_error": "" },
         { "qdrant_ok": true/false, "qdrant_error": "" },
         { "supabase_ok": true/false, "supabase_error": "" }
       ]
```

### 4. PDF workflow větev (původní)

**PRO PDF (`contentType === 'pdf'` nebo prázdné):**

```
1. Přijmi PDF soubor z FormData
2. Extrahuj text z PDF (pdf-parse nebo jiný nástroj)
3. Vytvoř embeddings z extrahovaného textu
4. Nahraj do Qdrant Local
5. Nahraj do Qdrant Cloud
6. Nahraj do Supabase Vector
7. Vrať JSON odpověď
```

## Příklad N8N Code Node pro čtení TXT souboru

```javascript
// Read TXT file from binary data
const binaryData = items[0].binary.file;

if (!binaryData) {
  throw new Error('No file data found');
}

// Convert binary data to text
const textContent = Buffer.from(binaryData.data, 'base64').toString('utf-8');

return [
  {
    json: {
      extractedText: textContent,
      textLength: textContent.length,
      metadata: {
        bookId: items[0].json.bookId,
        title: items[0].json.title,
        author: items[0].json.author,
        // ... další metadata
      }
    }
  }
];
```

## Důležité poznámky

### Backwards Compatibility
- **Workflow MUSÍ zůstat backwards compatible** s existujícími voláními
- Pokud `contentType` parametr chybí → považovat za PDF (původní chování)
- Stávající integrace nesmí přestat fungovat

### Chybové stavy

**Text-only specifické chyby:**
1. TXT soubor je prázdný → vrátit error
2. TXT soubor není validní UTF-8 → zkusit jiné kódování nebo vrátit error
3. Text je příliš dlouhý (>8000 tokenů) → chunking nebo vrátit error

### Response formát

**MUSÍ být stejný pro oba režimy:**

```json
[
  {
    "qdrant_ok": true,
    "qdrant_error": "",
    "qdrant_id": "uuid",
    "mode": "text" // nebo "pdf"
  },
  {
    "qdrant_ok": true,
    "qdrant_error": "",
    "qdrant_id": "uuid",
    "mode": "text"
  },
  {
    "supabase_ok": true,
    "supabase_error": "",
    "supabase_id": "uuid",
    "mode": "text"
  }
]
```

## Testing

### Test 1: Text-only upload

**cURL příklad:**
```bash
curl -X POST https://n8n.srv980546.hstgr.cloud/webhook/10f5ed9e-e0b1-465d-8bc8-b2ba9a37bc58 \
  -F "file=@test.txt" \
  -F "bookId=test-123" \
  -F "fileName=test.txt" \
  -F "fileType=txt" \
  -F "contentType=text" \
  -F "title=Test Book" \
  -F "author=Test Author"
```

**Očekávaná odpověď:**
```json
[
  {"qdrant_ok": true, "qdrant_error": "", "mode": "text"},
  {"qdrant_ok": true, "qdrant_error": "", "mode": "text"},
  {"supabase_ok": true, "supabase_error": "", "mode": "text"}
]
```

### Test 2: PDF upload (backwards compatible)

**cURL příklad:**
```bash
curl -X POST https://n8n.srv980546.hstgr.cloud/webhook/10f5ed9e-e0b1-465d-8bc8-b2ba9a37bc58 \
  -F "file=@test.pdf" \
  -F "bookId=test-456" \
  -F "fileName=test.pdf" \
  -F "fileType=pdf" \
  -F "title=Test Book" \
  -F "author=Test Author"
```

**Očekávaná odpověď:**
```json
[
  {"qdrant_ok": true, "qdrant_error": "", "mode": "pdf"},
  {"qdrant_ok": true, "qdrant_error": "", "mode": "pdf"},
  {"supabase_ok": true, "supabase_error": "", "mode": "pdf"}
]
```

## Výhody Text-only režimu

1. **Rychlejší:** Není potřeba parsovat PDF
2. **Menší velikost:** TXT soubor je řádově menší než PDF
3. **Jednodušší:** Text je už extrahovaný, žádná OCR nutná
4. **Levnější:** Méně API calls (bez PDF parsingu)

## Diagram workflow

```
┌─────────────────────────────────────────────┐
│ 1. Webhook Trigger                          │
│    Přijme FormData s file + metadata        │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│ 2. Code Node: Detekce contentType           │
│    contentType = pdf | text                 │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│ 3. IF Node: contentType === 'text' ?        │
└────────┬──────────────────────────┬─────────┘
         │ TRUE                     │ FALSE
         │ (TEXT-ONLY)              │ (PDF)
         ▼                          ▼
┌─────────────────────┐    ┌─────────────────────┐
│ 4a. Read TXT file   │    │ 4b. Parse PDF       │
│     from binary     │    │     Extract text    │
└──────────┬──────────┘    └──────────┬──────────┘
           │                          │
           └──────────┬───────────────┘
                      ▼
┌─────────────────────────────────────────────┐
│ 5. OpenAI Embeddings                        │
│    Vytvoř vektory z textu                   │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│ 6. Parallel Upload                          │
│    ├─ Qdrant Local                          │
│    ├─ Qdrant Cloud                          │
│    └─ Supabase Vector                       │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│ 7. Response Formatter                       │
│    Vrátí JSON s výsledky                    │
└─────────────────────────────────────────────┘
```

---

**Status:** 🚀 Připraveno k implementaci  
**Priorita:** Vysoká  
**Backwards Compatible:** ✅ Ano
