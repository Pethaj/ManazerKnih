# Supabase Fetch - Best Practices

## ⚠️ DŮLEŽITÉ: Jak správně fetchovat data ze Supabase

**Datum vytvoření:** 7. října 2025  
**Problém:** Supabase JavaScript client občas způsobuje timeout při načítání dat (dotazy "visí" a nikdy se nedokončí)  
**Řešení:** Používat přímé REST API volání pomocí `fetch()` namísto Supabase clienta

---

## ✅ SPRÁVNÝ ZPŮSOB - Použití fetch API

### Načítání dat (SELECT)

```typescript
// ✅ SPRÁVNĚ - přímé REST API volání
async getBooks(): Promise<Book[]> {
    const response = await fetch(`${supabaseUrl}/rest/v1/books?select=*&order=created_at.desc`, {
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
        }
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.map(mapSupabaseToBook);
}
```

### Další příklady GET dotazů

```typescript
// Načtení štítků
async getLabels(): Promise<string[]> {
    const response = await fetch(`${supabaseUrl}/rest/v1/labels?select=name&order=name.asc`, {
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
        }
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.map((item: any) => item.name);
}

// Načtení kategorií
async getCategories(): Promise<string[]> {
    const response = await fetch(`${supabaseUrl}/rest/v1/categories?select=name&order=name.asc`, {
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
        }
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.map((item: any) => item.name);
}

// Načtení jazyků
async getLanguages(): Promise<string[]> {
    const response = await fetch(`${supabaseUrl}/rest/v1/languages?select=name&order=name.asc`, {
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
        }
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.map((item: any) => item.name);
}

// Načtení typů publikací
async getPublicationTypes(): Promise<string[]> {
    const response = await fetch(`${supabaseUrl}/rest/v1/publication_types?select=name&order=name.asc`, {
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
        }
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.map((item: any) => item.name);
}
```

---

## ❌ ŠPATNÝ ZPŮSOB - Supabase client (NEPOUŽÍVAT pro GET dotazy)

```typescript
// ❌ ŠPATNĚ - občas způsobuje timeout
const { data, error } = await supabaseClient
    .from('books')
    .select('*')
    .order('created_at', { ascending: false });
```

**Proč to nefunguje:**
- Supabase JavaScript client občas způsobuje, že Promise "visí" a nikdy se nedokončí
- Dotaz trvá nekonečně dlouho (timeout)
- V konzoli se zobrazí: `⏱️ Timeout: Supabase dotaz trval déle než 30 sekund`

---

## 📋 Supabase REST API Syntax

### Základní URL struktura
```
${supabaseUrl}/rest/v1/{table_name}?{query_params}
```

### Query parametry

| Parametr | Popis | Příklad |
|----------|-------|---------|
| `select=*` | Vybrat všechny sloupce | `select=*` |
| `select=column1,column2` | Vybrat konkrétní sloupce | `select=id,title,author` |
| `order=column.asc` | Seřadit vzestupně | `order=created_at.asc` |
| `order=column.desc` | Seřadit sestupně | `order=created_at.desc` |
| `eq.value` | Rovná se | `id=eq.123` |
| `limit=n` | Omezit počet výsledků | `limit=10` |

### Příklady URL

```typescript
// Všechny knihy, seřazené sestupně podle data vytvoření
`${supabaseUrl}/rest/v1/books?select=*&order=created_at.desc`

// První 10 knih
`${supabaseUrl}/rest/v1/books?select=*&limit=10`

// Kniha s konkrétním ID
`${supabaseUrl}/rest/v1/books?select=*&id=eq.${bookId}`

// Pouze názvy štítků, seřazené vzestupně
`${supabaseUrl}/rest/v1/labels?select=name&order=name.asc`
```

---

## 🔧 Povinné hlavičky (Headers)

Pro všechny REST API dotazy musí být přítomny tyto hlavičky:

```typescript
headers: {
    'apikey': supabaseKey,              // Povinné - API klíč
    'Authorization': `Bearer ${supabaseKey}`,  // Povinné - autorizace
    'Content-Type': 'application/json'  // Volitelné pro GET, povinné pro POST/PUT/DELETE
}
```

---

## 🎯 Kdy použít Supabase client vs. fetch

### Použít **fetch API** (přímé REST volání):
- ✅ **Všechny GET dotazy** (načítání dat)
- ✅ Kdy potřebujete spolehlivost
- ✅ Kdy chcete mít kontrolu nad timeouty

### Použít **Supabase client**:
- ⚠️ POST/PUT/DELETE operace (pokud jsou funkční)
- ⚠️ Storage operace (upload/download souborů)
- ⚠️ Realtime subscriptions

**Poznámka:** Pokud Supabase client způsobuje problémy i u POST/PUT/DELETE, přejděte na fetch API i pro tyto operace.

---

## 🐛 Debugging

### Testování připojení

Vytvořte testovací HTML soubor pro rychlé ověření:

```html
<!DOCTYPE html>
<html>
<body>
    <h1>Test Supabase Fetch</h1>
    <button onclick="test()">Testovat</button>
    <div id="results"></div>
    
    <script type="module">
        import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.4';
        
        const supabaseUrl = 'https://modopafybeslbcqjxsve.supabase.co';
        const supabaseKey = 'YOUR_KEY_HERE';
        
        window.test = async function() {
            console.log('Testing...');
            
            const response = await fetch(`${supabaseUrl}/rest/v1/books?select=*&order=created_at.desc`, {
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`
                }
            });
            
            const data = await response.json();
            console.log(`Loaded ${data.length} books`);
            document.getElementById('results').textContent = `Loaded ${data.length} books`;
        };
    </script>
</body>
</html>
```

### Logování pro debugging

```typescript
async getBooks(): Promise<Book[]> {
    const callId = Math.random().toString(36).substring(7);
    console.log(`📚 [${callId}] Načítám knihy...`);
    
    const startTime = Date.now();
    const response = await fetch(/* ... */);
    const endTime = Date.now();
    
    console.log(`[${callId}] ✅ Odpověď za ${endTime - startTime}ms, status: ${response.status}`);
    
    const data = await response.json();
    console.log(`[${callId}] ✅ Načteno ${data.length} knih`);
    
    return data.map(mapSupabaseToBook);
}
```

---

## 📝 Historie změn

### 7. října 2025
- **Problém:** Aplikace nenačítala knihy, Supabase client způsoboval timeout
- **Řešení:** Nahrazeny všechny GET metody za fetch API volání
- **Výsledek:** Aplikace funguje spolehlivě, knihy se načítají okamžitě
- **Změněné metody:**
  - `api.getBooks()`
  - `api.getLabels()`
  - `api.getCategories()`
  - `api.getLanguages()`
  - `api.getPublicationTypes()`

---

## ⚠️ DŮLEŽITÉ POZNÁMKY

1. **VŽDY používat fetch API pro načítání dat ze Supabase**
2. **NIKDY neměnit zpět na Supabase client bez důkladného testování**
3. Pokud včera něco fungovalo a dnes ne, nejdřív zkontrolovat, jestli se nepoužívá Supabase client
4. Supabase URL a klíč jsou v `index.tsx` na řádcích ~429-430
5. Všechny headers musí obsahovat `apikey` a `Authorization`

---

## 🔗 Užitečné odkazy

- [Supabase REST API dokumentace](https://supabase.com/docs/guides/api)
- [PostgREST dokumentace](https://postgrest.org/en/stable/api.html)



