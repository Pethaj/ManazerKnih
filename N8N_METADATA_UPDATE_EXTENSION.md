# Rozšíření n8n workflow pro aktualizaci Qdrant metadata

## Problém
CORS policy blokuje přímé volání Qdrant API z prohlížeče. Potřebujeme proxy řešení přes backend.

## Řešení
Rozšíříme existující n8n webhook o funkcionalitu aktualizace metadata.

## Webhook pro aktualizaci metadata
- **URL**: `https://n8n.srv980546.hstgr.cloud/webhook-test/822e584e-0836-4d1d-aef1-5c4dce6573c0`
- **Účel**: Aktualizace metadata v Qdrant databázi

## Nová funkcionalita
Webhook bude rozpoznávat dva typy operací podle parametru `action`:

### 1. Existující operace (nahrání knihy)
```json
{
  "file": "binární_data",
  "bookId": "uuid",
  "fileName": "kniha.pdf",
  "fileType": "pdf",
  "metadata": { ... }
}
```

### 2. Nová operace (aktualizace metadata)
```json
{
  "action": "update_metadata",
  "bookId": "uuid_knihy",
  "metadata": {
    "categories": ["kategorie1", "kategorie2"]
  }
}
```

## Implementace v n8n

### Krok 1: Rozšíření webhook triggeru
Přidejte podmínku na začátek workflow:

```javascript
// IF node - Kontrola typu operace
if (items[0].json.action === 'update_metadata') {
  // Větev pro aktualizaci metadata
  return [items]; // Pošle na větev aktualizace
} else {
  // Větev pro nahrání nové knihy (existující logika)
  return [null, items]; // Pošle na druhou větev
}
```

### Krok 2: Nová větev pro aktualizaci metadata
Vytvořte novou větev s následujícími kroky:

#### A) Qdrant Update Node
```javascript
// HTTP Request node pro Qdrant
const bookId = items[0].json.bookId;
const categories = items[0].json.metadata.categories;

return {
  method: 'PUT',
  url: 'https://9aaad106-c442-4dba-b072-3fb8ad4da051.us-west-2-0.aws.cloud.qdrant.io/collections/MedBase/points/payload',
  headers: {
    'Content-Type': 'application/json',
    'Api-Key': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.ls9vPmwrlvxTco80TUsQBMPg0utIzNTYgk25x9__Vbo'
  },
  body: {
    payload: {
      categories: categories
    },
    filter: {
      must: [
        {
          key: "file_id",
          match: {
            value: bookId
          }
        }
      ]
    }
  }
};
```

#### B) Response Formatter Node
```javascript
// Formátování odpovědi pro frontend
const qdrantResponse = items[0].json;

return [
  {
    json: [
      {
        qdrant_ok: qdrantResponse.status === 'ok',
        qdrant_error: qdrantResponse.status === 'ok' ? '' : 'Chyba při aktualizaci'
      }
    ]
  }
];
```

### Krok 3: Testování
Po implementaci otestujte pomocí:

```bash
curl -X POST https://n8n.srv980546.hstgr.cloud/webhook-test/822e584e-0836-4d1d-aef1-5c4dce6573c0 \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update_metadata",
    "bookId": "test-book-id",
    "metadata": {
      "categories": ["test-kategorie"]
    }
  }'
```

## Očekávaná odpověď
```json
[
  {
    "qdrant_ok": true,
    "qdrant_error": ""
  }
]
```

## Frontend implementace
Frontend kód je již připraven a odesílá požadavky s parametrem `action: "update_metadata"`.

## Výhody tohoto řešení
1. **Žádné CORS problémy** - vše běží přes backend
2. **Konzistentní API** - používá stejný webhook endpoint
3. **Snadná údržba** - vše v jednom n8n workflow
4. **Bezpečnost** - API klíče zůstávají na backend serveru

## Poznámky
- Ujistěte se, že n8n workflow má správné oprávnění pro Qdrant API
- Otestujte oba typy operací (nahrání + aktualizace)
- Zkontrolujte error handling pro oba případy
