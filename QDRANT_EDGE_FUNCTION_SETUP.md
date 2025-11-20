# 🚀 Průvodce nastavením Qdrant Edge Function

## 📋 Přehled

Tato edge funkce přesunuje Qdrant API klíč z frontendu do bezpečného edge function prostředí na Supabase.

---

## 🔐 KROK 1: Nastavení Secrets v Supabase

### 1.1 Otevřete Supabase Dashboard

```
https://supabase.com/dashboard/project/modopafybeslbcqjxsve
```

### 1.2 Přejděte na Edge Functions Secrets

1. V levém menu klikněte na **Edge Functions**
2. Klikněte na záložku **Secrets**
3. Klikněte **"New Secret"**

### 1.3 Přidejte QDRANT_API_KEY_cloud

```
Name: QDRANT_API_KEY_cloud
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.ls9vPmwrlvxTco80TUsQBMPg0utIzNTYgk25x9__Vbo
```

**Klikněte "Save"**

### 1.4 Přidejte QDRANT_URL (volitelné)

```
Name: QDRANT_URL
Value: https://9aaad106-c442-4dba-b072-3fb8ad4da051.us-west-2-0.aws.cloud.qdrant.io:6333
```

**Klikněte "Save"**

> **Poznámka:** QDRANT_URL je volitelný - pokud ho nenastavíte, použije se výchozí hodnota v kódu.

---

## 📝 KROK 2: Vytvoření Edge Function

### 2.1 Otevřete Edge Functions

V Supabase Dashboard:
1. Klikněte na **Edge Functions** v levém menu
2. Klikněte **"Create a new function"**

### 2.2 Vyplňte základní údaje

```
Function name: qdrant-proxy
```

### 2.3 Zkopírujte kód

Otevřete soubor `/supabase/functions/qdrant-proxy/index.ts` ve vašem projektu a zkopírujte celý obsah.

Nebo zkopírujte přímo odtud:

```typescript
// supabase/functions/qdrant-proxy/index.ts
// Edge Function pro bezpečné operace s Qdrant vektorovou databází
// Podporuje: delete, search, upsert operace

const QDRANT_API_KEY = Deno.env.get("QDRANT_API_KEY_cloud");
const QDRANT_URL = Deno.env.get("QDRANT_URL") || 
  "https://9aaad106-c442-4dba-b072-3fb8ad4da051.us-west-2-0.aws.cloud.qdrant.io:6333";
const QDRANT_COLLECTION = "documents";

Deno.serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Ověření API klíče
    if (!QDRANT_API_KEY) {
      throw new Error("QDRANT_API_KEY_cloud není nastaven v Supabase Secrets");
    }

    // Parsování requestu
    const body = await req.json();
    const { operation, bookId, filter, vector, limit, points } = body;

    if (!operation) {
      throw new Error(
        "Chybí povinné pole: operation (delete|search|upsert)",
      );
    }

    console.log(`🔍 Qdrant ${operation} operation`);

    let qdrantResponse;
    let qdrantUrl;

    // DELETE OPERATION - Smazání dokumentů podle bookId
    if (operation === "delete") {
      if (!bookId) {
        throw new Error("Pro operaci 'delete' je povinné pole 'bookId'");
      }

      console.log(`🗑️ Mažu dokumenty pro bookId: ${bookId}`);
      qdrantUrl = `${QDRANT_URL}/collections/${QDRANT_COLLECTION}/points/delete`;

      qdrantResponse = await fetch(qdrantUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Api-Key": QDRANT_API_KEY,
        },
        body: JSON.stringify({
          filter: {
            must: [
              {
                key: "file_id",
                match: {
                  value: bookId,
                },
              },
            ],
          },
        }),
      });
    } 
    // SEARCH OPERATION - Vyhledávání podobných vektorů
    else if (operation === "search") {
      if (!vector) {
        throw new Error("Pro operaci 'search' je povinné pole 'vector'");
      }

      console.log(`🔍 Vyhledávám v Qdrant kolekci (limit: ${limit || 10})`);
      qdrantUrl = `${QDRANT_URL}/collections/${QDRANT_COLLECTION}/points/search`;

      qdrantResponse = await fetch(qdrantUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Api-Key": QDRANT_API_KEY,
        },
        body: JSON.stringify({
          vector: vector,
          limit: limit || 10,
          with_payload: true,
          with_vector: false,
          filter: filter || undefined,
        }),
      });
    } 
    // UPSERT OPERATION - Vložení/aktualizace bodů
    else if (operation === "upsert") {
      if (!points || !Array.isArray(points) || points.length === 0) {
        throw new Error(
          "Pro operaci 'upsert' je povinné pole 'points' (neprázdné pole)",
        );
      }

      console.log(`📝 Vkládám ${points.length} bodů do Qdrant`);
      qdrantUrl = `${QDRANT_URL}/collections/${QDRANT_COLLECTION}/points`;

      qdrantResponse = await fetch(qdrantUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Api-Key": QDRANT_API_KEY,
        },
        body: JSON.stringify({
          points: points,
        }),
      });
    } 
    // COUNT OPERATION - Spočítání bodů v kolekci
    else if (operation === "count") {
      console.log(`🔢 Počítám body v Qdrant kolekci`);
      qdrantUrl = `${QDRANT_URL}/collections/${QDRANT_COLLECTION}/points/count`;

      qdrantResponse = await fetch(qdrantUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Api-Key": QDRANT_API_KEY,
        },
        body: JSON.stringify({
          filter: filter || undefined,
          exact: true,
        }),
      });
    } 
    // SCROLL OPERATION - Iterace přes body v kolekci
    else if (operation === "scroll") {
      console.log(`📜 Scrolluji body v Qdrant kolekci (limit: ${limit || 10})`);
      qdrantUrl = `${QDRANT_URL}/collections/${QDRANT_COLLECTION}/points/scroll`;

      qdrantResponse = await fetch(qdrantUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Api-Key": QDRANT_API_KEY,
        },
        body: JSON.stringify({
          filter: filter || undefined,
          limit: limit || 10,
          with_payload: true,
          with_vector: false,
        }),
      });
    } else {
      throw new Error(
        `Neplatná operace: ${operation}. Podporované: delete, search, upsert, count, scroll`,
      );
    }

    // Kontrola odpovědi z Qdrant
    if (!qdrantResponse.ok) {
      const errorData = await qdrantResponse.json().catch(() => null);
      console.error("❌ Qdrant API error:", {
        status: qdrantResponse.status,
        errorData,
      });

      throw new Error(
        `Qdrant API chyba: ${qdrantResponse.status} - ${
          errorData?.status?.error || qdrantResponse.statusText
        }`,
      );
    }

    const data = await qdrantResponse.json();
    console.log(`✅ Qdrant ${operation} úspěšný`);

    // Vrátíme úspěšnou odpověď
    return new Response(
      JSON.stringify({
        success: true,
        operation: operation,
        result: data,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("❌ Chyba v edge function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Neznámá chyba",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});
```

### 2.4 Vložte kód do editoru

V Supabase Dashboard vložte zkopírovaný kód do editoru.

### 2.5 Nasaďte funkci

Klikněte **"Deploy function"**

Počkejte, až se funkce nasadí (může to trvat 10-30 sekund).

---

## 🧪 KROK 3: Testování Edge Function

### 3.1 Test v Supabase Dashboard

1. V seznamu Edge Functions klikněte na **qdrant-proxy**
2. Klikněte na záložku **"Invoke"**
3. Do pole **"Request body"** vložte:

```json
{
  "operation": "count"
}
```

4. Klikněte **"Run"**
5. Měli byste vidět odpověď typu:

```json
{
  "success": true,
  "operation": "count",
  "result": {
    "result": {
      "count": 123
    }
  }
}
```

### 3.2 Test DELETE operace

```json
{
  "operation": "delete",
  "bookId": "test-book-id-123"
}
```

### 3.3 Test SEARCH operace

```json
{
  "operation": "search",
  "vector": [0.1, 0.2, 0.3, ...],
  "limit": 5
}
```

---

## 🔄 KROK 4: Úprava kódu aplikace

Teď musíte upravit `index.tsx`, aby používal edge funkci místo přímého volání Qdrant.

### 4.1 Najděte Qdrant DELETE volání

Hledejte v `index.tsx` tento kód (kolem řádku 1524-1560):

```typescript
const qdrantApiKey = 'eyJhbGci...';

const deleteResponse = await fetch(`${qdrantUrl}/collections/documents/points/delete`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Api-Key': qdrantApiKey
    },
    body: JSON.stringify({
        filter: {
            must: [
                {
                    key: "file_id",
                    match: {
                        value: bookId,
                    },
                },
            ],
        },
    }),
});
```

### 4.2 Nahraďte edge funkcí

```typescript
// NOVÉ - volání přes edge funkci
const deleteResponse = await fetch(
    'https://modopafybeslbcqjxsve.supabase.co/functions/v1/qdrant-proxy',
    {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
            operation: 'delete',
            bookId: bookId,
        }),
    }
);
```

### 4.3 Upravte zpracování odpovědi

Protože edge funkce vrací trochu jiný formát, musíte upravit zpracování:

**PŮVODNÍ:**
```typescript
const deleteData = await deleteResponse.json();
console.log('✅ Qdrant delete response:', deleteData);
```

**NOVÉ:**
```typescript
const deleteData = await deleteResponse.json();
if (!deleteData.success) {
    throw new Error(deleteData.error || 'Qdrant delete failed');
}
console.log('✅ Qdrant delete response:', deleteData.result);
```

### 4.4 Odstraňte hardcoded API klíč

Najděte a **SMAŽTE** tento řádek (kolem řádku 1524):

```typescript
const qdrantApiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.ls9vPmwrlvxTco80TUsQBMPg0utIzNTYgk25x9__Vbo';
```

A také odstraňte pole `qdrantUrls` - už ho nebudete potřebovat:

```typescript
// SMAŽTE TOTO:
const qdrantUrls = [
    'https://9aaad106-c442-4dba-b072-3fb8ad4da051.us-west-2-0.aws.cloud.qdrant.io:6333',
    'https://9aaad106-c442-4dba-b072-3fb8ad4da051.us-west-2-0.aws.cloud.qdrant.io',
    'https://9aaad106-c442-4dba-b072-3fb8ad4da051.us-west-2-0.aws.cloud.qdrant.io/api'
];
```

---

## 📚 Použití Edge Function - Příklady

### DELETE - Smazání dokumentů

```typescript
const response = await fetch(
    'https://modopafybeslbcqjxsve.supabase.co/functions/v1/qdrant-proxy',
    {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
            operation: 'delete',
            bookId: 'abc-123',
        }),
    }
);
```

### SEARCH - Vyhledávání podobných vektorů

```typescript
const response = await fetch(
    'https://modopafybeslbcqjxsve.supabase.co/functions/v1/qdrant-proxy',
    {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
            operation: 'search',
            vector: [0.1, 0.2, 0.3, /* ... 1536 hodnot ... */],
            limit: 10,
            filter: {  // volitelné
                must: [
                    {
                        key: "category",
                        match: { value: "medical" }
                    }
                ]
            }
        }),
    }
);
```

### UPSERT - Vložení bodů do Qdrant

```typescript
const response = await fetch(
    'https://modopafybeslbcqjxsve.supabase.co/functions/v1/qdrant-proxy',
    {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
            operation: 'upsert',
            points: [
                {
                    id: 'point-id-1',
                    vector: [0.1, 0.2, /* ... */],
                    payload: {
                        file_id: 'book-123',
                        text: 'Obsah dokumentu...',
                        page: 1
                    }
                }
            ]
        }),
    }
);
```

### COUNT - Spočítání bodů

```typescript
const response = await fetch(
    'https://modopafybeslbcqjxsve.supabase.co/functions/v1/qdrant-proxy',
    {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
            operation: 'count',
            filter: {  // volitelné
                must: [
                    {
                        key: "file_id",
                        match: { value: "book-123" }
                    }
                ]
            }
        }),
    }
);
```

### SCROLL - Iterace přes body

```typescript
const response = await fetch(
    'https://modopafybeslbcqjxsve.supabase.co/functions/v1/qdrant-proxy',
    {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
            operation: 'scroll',
            limit: 100,
            filter: {  // volitelné
                must: [
                    {
                        key: "file_id",
                        match: { value: "book-123" }
                    }
                ]
            }
        }),
    }
);
```

---

## ✅ Checklist

### Příprava
- [x] Zkopírovat Qdrant API klíč z kódu
- [x] Připravit edge funkci

### V Supabase Dashboard
- [ ] Přidat secret `QDRANT_API_KEY_cloud`
- [ ] Přidat secret `QDRANT_URL` (volitelné)
- [ ] Vytvořit edge funkci `qdrant-proxy`
- [ ] Nasadit edge funkci
- [ ] Otestovat edge funkci (count operace)

### V kódu aplikace
- [ ] Odstranit hardcoded `qdrantApiKey` z `index.tsx`
- [ ] Odstranit pole `qdrantUrls`
- [ ] Upravit DELETE volání na edge funkci
- [ ] Upravit zpracování odpovědi
- [ ] Otestovat mazání knihy v aplikaci

---

## 🔍 Troubleshooting

### Chyba: "QDRANT_API_KEY_cloud není nastaven"

**Řešení:**
1. Zkontrolujte, že jste přidali secret v Supabase
2. Ujistěte se, že název je přesně `QDRANT_API_KEY_cloud` (case-sensitive)
3. Po přidání secretu může být potřeba znovu nasadit edge funkci

### Chyba: "Qdrant API chyba: 401"

**Řešení:**
- API klíč je neplatný nebo expiroval
- Zkontrolujte hodnotu secretu `QDRANT_API_KEY_cloud`

### Chyba: "Qdrant API chyba: 404"

**Řešení:**
- URL kolekce nebo clusteru je nesprávná
- Zkontrolujte hodnotu secretu `QDRANT_URL`
- Ověřte, že kolekce `documents` existuje v Qdrant

### Edge funkce nefunguje

**Řešení:**
1. Otevřete Edge Function logs v Supabase Dashboard
2. Klikněte na funkci `qdrant-proxy`
3. Přejděte na záložku **"Logs"**
4. Zkontrolujte error messages

---

## 📊 Výhody řešení

✅ **Bezpečnost:** API klíč není viditelný v kódu frontendu  
✅ **Jednoduchá správa:** Změna klíče jen v jednom místě (Supabase Secrets)  
✅ **Monitoring:** Všechna volání logována v Supabase  
✅ **Rate limiting:** Možnost přidat rate limiting v budoucnu  
✅ **CORS:** Automaticky řešené cross-origin requesty  

---

## 🎉 Hotovo!

Po dokončení všech kroků máte bezpečnou Qdrant integraci přes edge funkci.

Všechny API klíče jsou nyní uloženy bezpečně na serveru a ne v kódu.

