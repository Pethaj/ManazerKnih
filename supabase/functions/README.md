# 🔐 Supabase Edge Functions - API Proxy

Tento adresář obsahuje Supabase Edge Functions, které slouží jako **bezpečná proxy** pro externí API služby.

## 📁 Struktura

```
functions/
├── openai-proxy/          # Proxy pro OpenAI API
│   └── index.ts
├── cloudconvert-proxy/    # Proxy pro CloudConvert API
│   └── index.ts
├── ilovepdf-proxy/        # Proxy pro iLovePDF API
│   └── index.ts
├── extract-metadata-ai/   # AI extrakce metadat (existující)
│   └── index.ts
├── sync-products/         # Sync produktů (existující)
│   └── index.ts
└── README.md             # Tento soubor
```

---

## 🎯 Účel Edge Functions

### Bezpečnost
- **Ukládání API klíčů**: Citlivé klíče jsou pouze v Supabase Secrets
- **Žádné klíče na frontendu**: Frontend nikdy nevidí skutečné API klíče
- **Kontrolovaný přístup**: Pouze autorizované requesty přes Supabase

### Funkcionalita
- **Transparentní proxy**: Přeposílání requestů na externí API
- **Standardní chování**: Veškerá logika zůstává v aplikaci
- **Snadná údržba**: Změna klíčů bez změny kódu

---

## 🔄 Edge Functions jako Proxy

### `openai-proxy`

**Účel**: Proxy pro OpenAI API (GPT-4o mini, embeddings, vision)

**Endpointy**:
- `/chat/completions` - GPT chat completions
- `/embeddings` - Text embeddings

**Používáno v**:
- `src/services/gptService.ts` - Chat GPT-4o mini
- `src/services/embeddingService.ts` - Embeddings
- `src/services/openRouterVisionService.ts` - Vision API

**Secret**: `OPENAI_API_KEY`

**Příklad volání**:
```typescript
const response = await fetch('https://modopafybeslbcqjxsve.supabase.co/functions/v1/openai-proxy', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer SUPABASE_ANON_KEY',
    'apikey': 'SUPABASE_ANON_KEY'
  },
  body: JSON.stringify({
    endpoint: '/chat/completions',
    method: 'POST',
    body: {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Hello!' }],
      max_tokens: 50
    }
  })
});
```

---

### `cloudconvert-proxy`

**Účel**: Proxy pro CloudConvert API (konverze EPUB/MOBI)

**Používáno v**:
- `src/services/cloudConvertService.ts` - Konverze e-knih do PDF

**Secret**: `CLOUDCONVERT_API_KEY`

**Příklad volání**:
```typescript
const response = await fetch('https://modopafybeslbcqjxsve.supabase.co/functions/v1/cloudconvert-proxy', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer SUPABASE_ANON_KEY',
    'apikey': 'SUPABASE_ANON_KEY'
  },
  body: JSON.stringify({
    endpoint: '/jobs',
    method: 'POST',
    body: {
      tasks: { /* job tasks */ }
    }
  })
});
```

---

### `ilovepdf-proxy`

**Účel**: Proxy pro iLovePDF API (OCR, komprese PDF)

**Používáno v**:
- `src/services/ilovepdfService.ts` - OCR a komprese

**Secrets**: 
- `ILOVEPDF_SECRET_KEY`
- `ILOVEPDF_PUBLIC_KEY`

**Příklad volání**:
```typescript
const response = await fetch('https://modopafybeslbcqjxsve.supabase.co/functions/v1/ilovepdf-proxy', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer SUPABASE_ANON_KEY',
    'apikey': 'SUPABASE_ANON_KEY'
  },
  body: JSON.stringify({
    endpoint: '/auth',
    method: 'POST',
    body: {},
    usePublicKey: true
  })
});
```

---

## 🚀 Nasazení

### Předpoklady
```bash
# Instalace Supabase CLI
npm install -g supabase

# Přihlášení
supabase login

# Propojení s projektem
supabase link --project-ref modopafybeslbcqjxsve
```

### Nastavení Secrets
```bash
supabase secrets set OPENAI_API_KEY="sk-..."
supabase secrets set CLOUDCONVERT_API_KEY="..."
supabase secrets set ILOVEPDF_SECRET_KEY="..."
supabase secrets set ILOVEPDF_PUBLIC_KEY="..."
```

### Deploy
```bash
# Všechny funkce
supabase functions deploy

# Jednotlivě
supabase functions deploy openai-proxy
supabase functions deploy cloudconvert-proxy
supabase functions deploy ilovepdf-proxy
```

### Nebo použijte automatický script
```bash
cd ../..  # Zpět do root aplikace
chmod +x deploy-edge-functions.sh
./deploy-edge-functions.sh
```

---

## 📊 Monitoring

### Sledování logů
```bash
# Všechny funkce
supabase functions logs

# Konkrétní funkce
supabase functions logs openai-proxy

# S filtrem
supabase functions logs openai-proxy --filter "error"
```

### Kontrola stavu
```bash
# Seznam funkcí a jejich stav
supabase functions list

# Kontrola secrets
supabase secrets list
```

---

## 🔧 Debugging

### Edge funkce vrací 401
**Problém**: Chybí nebo je neplatný API klíč

**Řešení**:
```bash
# Zkontrolovat secrets
supabase secrets list

# Nastavit chybějící secret
supabase secrets set OPENAI_API_KEY="sk-..."
```

### Edge funkce vrací 500
**Problém**: Chyba v kódu nebo API request

**Řešení**:
```bash
# Zkontrolovat logy
supabase functions logs openai-proxy

# Znovu deployovat
supabase functions deploy openai-proxy
```

### Timeout errors
**Problém**: Dlouhé zpracování (OCR, konverze)

**Řešení**: 
- Edge Functions mají timeout 30s pro free tier, 180s pro Pro
- Pro dlouhé operace zvažte upgrade na Pro tier
- Implementujte progress tracking v aplikaci

---

## 📝 Vývoj nových funkcí

### Vytvoření nové funkce
```bash
supabase functions new my-proxy
```

### Template pro proxy funkci
```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const API_KEY = Deno.env.get("MY_API_KEY");
const API_BASE = "https://api.example.com";

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!API_KEY) {
      throw new Error("API_KEY není nastaven");
    }

    const { endpoint, method = "GET", body } = await req.json();

    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: method,
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

---

## 📚 Další zdroje

- [Supabase Edge Functions dokumentace](https://supabase.com/docs/guides/functions)
- [Deno dokumentace](https://deno.land/manual)
- [SECURITY_SETUP.md](../../SECURITY_SETUP.md) - Kompletní bezpečnostní průvodce
- [DEPLOYMENT_CHECKLIST.md](../../DEPLOYMENT_CHECKLIST.md) - Deployment checklist

---

**Poslední aktualizace**: 2025-01-19  
**Verze**: 1.0.0

