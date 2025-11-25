# Mapování webhook dat v n8n

## Přehled
Webhook do vektorové databáze nyní posílá **strukturovaná data** přes FormData, kde každé pole metadat je samostatné a pole (arrays) jsou rozloženy do více záznamů s `[]` sufixem.

## Struktura dat přijatých v n8n

### 1. Soubor a identifikace
```
file: [Binary Data] (PDF soubor)
bookId: "bbbd57aa-33d0-482e-83a4-e954e89be5b2"
fileName: "kniha.pdf"
fileType: "pdf"
```

### 2. Metadata (skalární hodnoty)
```
id: "bbbd57aa-33d0-482e-83a4-e954e89be5b2"
title: "Volně prodejné čínské bylinné přípravky a směsi"
author: "Mgr. Daniela Pilařová"
publicationYear: "2023"
publisher: "Shanti Academy"
summary: "Dokument obsahuje informace o různých čínských bylinách..."
language: "Čeština"
releaseVersion: "1. vydání"
format: "PDF"
fileSize: "32415"
```

### 3. Pole (arrays) - strukturovaně
```
keywords[]: "čínské byliny"
keywords[]: "terapeutické vlastnosti"
keywords[]: "bylinné směsi"
keywords[]: "tradiční medicína"
keywords[]: "zdraví"
keywords[]: "přípravky"

categories[]: "Wany"

publicationTypes[]: "internal_bewit"
publicationTypes[]: "public_clients"

labels[]: (prázdné v tomto případě)
```

## Jak namapovat data v n8n

### Varianta 1: Použití Set node s agregací polí

1. **Webhook node** - přijme data
2. **Set node** - vytvoří strukturovaný objekt:

```javascript
{
  "file": "{{ $binary.file }}",
  "bookId": "{{ $json.bookId }}",
  "fileName": "{{ $json.fileName }}",
  "fileType": "{{ $json.fileType }}",
  
  // Skalární metadata
  "metadata": {
    "id": "{{ $json.id }}",
    "title": "{{ $json.title }}",
    "author": "{{ $json.author }}",
    "publicationYear": {{ $json.publicationYear }},
    "publisher": "{{ $json.publisher }}",
    "summary": "{{ $json.summary }}",
    "language": "{{ $json.language }}",
    "releaseVersion": "{{ $json.releaseVersion }}",
    "format": "{{ $json.format }}",
    "fileSize": {{ $json.fileSize }},
    
    // Pole - agregace všech keywords[] do pole
    "keywords": "{{ $json['keywords[]'] }}",
    "categories": "{{ $json['categories[]'] }}",
    "labels": "{{ $json['labels[]'] }}",
    "publicationTypes": "{{ $json['publicationTypes[]'] }}"
  }
}
```

### Varianta 2: Přímý přístup k jednotlivým prvkům

Protože n8n automaticky agreguje pole se stejným názvem a `[]` sufixem, můžete přímo přistupovat:

```javascript
// Přístup ke všem keywords jako pole
$json['keywords[]']  // Vrátí: ["čínské byliny", "terapeutické vlastnosti", ...]

// Přístup k prvnímu keywords
$json['keywords[]'][0]  // Vrátí: "čínské byliny"

// Počet keywords
$json['keywords[]'].length  // Vrátí: 6
```

### Varianta 3: Split In Batches pro zpracování po položkách

Pokud potřebujete zpracovat každou keyword zvlášť:

1. **Webhook node** - přijme data
2. **Split In Batches node** - nastavte pole na `keywords[]`
3. **Function node** - zpracujte každou keyword individuálně

## Příklad kompletního workflow v n8n

### 1. Webhook Trigger
```
URL: https://n8n.srv980546.hstgr.cloud/webhook/10f5ed9e-e0b1-465d-8bc8-b2ba9a37bc58
Method: POST
```

### 2. Set node - Strukturování dat
```javascript
{
  "document": {
    "id": "{{ $json.id }}",
    "title": "{{ $json.title }}",
    "author": "{{ $json.author }}",
    "year": {{ $json.publicationYear }},
    "publisher": "{{ $json.publisher }}",
    "summary": "{{ $json.summary }}",
    "keywords": {{ $json['keywords[]'] }},
    "categories": {{ $json['categories[]'] }},
    "labels": {{ $json['labels[]'] }},
    "types": {{ $json['publicationTypes[]'] }}
  },
  "file": {
    "name": "{{ $json.fileName }}",
    "type": "{{ $json.fileType }}",
    "size": {{ $json.fileSize }},
    "data": "{{ $binary.file }}"
  }
}
```

### 3. Supabase node - Vložení do vektorové databáze
```
Table: documents
Operation: Insert
Data: {{ $json.document }}
```

### 4. Qdrant node - Vložení do vektorové databáze
```
Collection: books
Operation: Insert
Vector: (generované z textu)
Payload: {{ $json.document }}
```

### 5. Response node - Vrácení výsledku
```json
[
  {
    "qdrant_ok": true,
    "qdrant_error": ""
  },
  {
    "supabase_ok": true,
    "supabase_error": ""
  }
]
```

## Výhody této struktury

✅ **Snadné mapování**: Každé pole je přímo přístupné  
✅ **Pole jako pole**: n8n automaticky agreguje `keywords[]` do skutečného pole  
✅ **Čitelné**: V n8n vidíte přesnou strukturu dat  
✅ **Flexibilní**: Můžete snadno přidat nebo odebrat pole  
✅ **Binární soubor**: PDF je přenášen jako binární data, ne base64  

## Řešení problémů

### Pokud pole nejsou vidět jako pole

Ujistěte se, že v Set node používáte:
```javascript
{{ $json['keywords[]'] }}  // Správně - s hranatými závorkami a uvozovkami
```

Nikoliv:
```javascript
{{ $json.keywords[] }}  // Špatně - syntaktická chyba
{{ $json.keywords }}    // Špatně - pole není k dispozici
```

### Pokud je binární soubor prázdný

Zkontrolujte, že v Webhook node máte povolenou volbu:
- **Binary Property**: `file`
- **Binary Data**: `true`

### Testování v n8n

Použijte **Execute node manually** a podívejte se na výstup Webhook node:
1. Klikněte na Webhook node
2. Podívejte se na **Output** tab
3. Měli byste vidět všechna pole včetně `keywords[]` s více záznamy





