# 🔒 Průvodce nastavením bezpečnosti aplikace

## Přehled zabezpečení

Aplikace byla upravena pro maximální bezpečnost:
- ✅ **Žádné API klíče v kódu** - všechny citlivé klíče jsou uloženy v Supabase Secrets
- ✅ **Edge funkce jako proxy** - bezpečné API volání přes Supabase Edge Functions
- ✅ **Veřejný Supabase anon klíč** - jediný klíč v kódu (bezpečný design)
- ✅ **Veškerá logika v aplikaci** - edge funkce pouze přeposílají požadavky

---

## 🚀 Nastavení Supabase Edge Functions

### 1. Nastavení Supabase Secrets

Pro každou edge funkci je potřeba nastavit API klíče v Supabase Secrets.

#### Přihlášení do Supabase CLI:
```bash
supabase login
```

#### Propojení s projektem:
```bash
supabase link --project-ref modopafybeslbcqjxsve
```

#### Nastavení secrets:

```bash
# OpenAI API klíč (pro GPT-4o mini, embeddings, vision)
supabase secrets set OPENAI_API_KEY="sk-..."

# CloudConvert API klíč (pro konverzi EPUB/MOBI)
supabase secrets set CLOUDCONVERT_API_KEY="eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9..."

# iLovePDF API klíče (pro OCR a kompresi)
supabase secrets set ILOVEPDF_SECRET_KEY="secret_key_..."
supabase secrets set ILOVEPDF_PUBLIC_KEY="project_public_..."
```

---

### 2. Deploy Edge Functions

```bash
# Deploy všech edge funkcí najednou
supabase functions deploy openai-proxy
supabase functions deploy cloudconvert-proxy
supabase functions deploy ilovepdf-proxy

# Nebo deploy všech najednou
supabase functions deploy
```

---

### 3. Ověření nasazení

```bash
# Zobrazit seznam všech secrets
supabase secrets list

# Zobrazit seznam nasazených edge funkcí
supabase functions list
```

---

## 📋 Struktura Edge Functions

### **openai-proxy** (`/functions/v1/openai-proxy`)
- **Účel**: Proxy pro OpenAI API (chat completions, embeddings, vision)
- **Používají**: `gptService.ts`, `embeddingService.ts`, `openRouterVisionService.ts`
- **Secret**: `OPENAI_API_KEY`

### **cloudconvert-proxy** (`/functions/v1/cloudconvert-proxy`)
- **Účel**: Proxy pro CloudConvert API (konverze EPUB/MOBI)
- **Používá**: `cloudConvertService.ts`
- **Secret**: `CLOUDCONVERT_API_KEY`

### **ilovepdf-proxy** (`/functions/v1/ilovepdf-proxy`)
- **Účel**: Proxy pro iLovePDF API (OCR, komprese PDF)
- **Používá**: `ilovepdfService.ts`
- **Secrets**: `ILOVEPDF_SECRET_KEY`, `ILOVEPDF_PUBLIC_KEY`

---

## 🔍 Bezpečnostní scan

### Semgrep kontrola

Projekt byl prověřen pomocí Semgrep security scanneru:

```bash
# Výsledky:
✅ Žádné hardcoded API klíče (kromě veřejného Supabase anon)
✅ Žádné nebezpečné secrets v kódu
⚠️  3x minor warning: unsafe format string v console.log (nízké riziko)
```

### Supabase Security Advisors

```bash
# Doporučení z Supabase:
⚠️  Některé database funkce nemají nastavený search_path
⚠️  3 tabulky nemají povolenou RLS (Row Level Security)
⚠️  Rozšíření vector a unaccent jsou v public schema
```

**Akce k řešení:**
1. Povolit RLS na tabulkách: `documents`, `product_documents`, `product_embeddings`
2. Přesunout extenze do separátního schema
3. Nastavit `search_path` pro database funkce

---

## 🧪 Testování po nasazení

### 1. Test OpenAI proxy

```typescript
// V konzoli prohlížeče:
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
console.log(await response.json());
```

### 2. Test aplikace

1. **Upload PDF** - ověří iLovePDF proxy (OCR, komprese)
2. **Konverze EPUB** - ověří CloudConvert proxy
3. **Chat** - ověří OpenAI proxy (GPT-4o mini)
4. **Embedding** - ověří OpenAI proxy (embeddings)
5. **Metadata extrakce** - ověří OpenAI proxy (vision)

---

## 🛡️ Best Practices

### ✅ CO DĚLAT:
- Pravidelně rotovat API klíče
- Monitorovat logs edge funkcí (`supabase functions logs <name>`)
- Kontrolovat Supabase billing dashboard
- Používat environment variables pro Supabase URL

### ❌ CO NEDĚLAT:
- **NIKDY** nepřidávat API klíče přímo do kódu
- **NIKDY** necommitovat `.env` soubory s secrets
- **NIKDY** nesdílet API klíče ve veřejných repozitářích

---

## 📊 Monitoring

### Sledování logs edge funkcí

```bash
# Real-time logs pro všechny funkce
supabase functions logs

# Logs konkrétní funkce
supabase functions logs openai-proxy

# Logs s filtrem
supabase functions logs openai-proxy --filter "error"
```

### Sledování usage

1. **Supabase Dashboard**: [https://supabase.com/dashboard/project/modopafybeslbcqjxsve](https://supabase.com/dashboard/project/modopafybeslbcqjxsve)
2. **OpenAI Usage**: [https://platform.openai.com/usage](https://platform.openai.com/usage)
3. **CloudConvert Dashboard**: [https://cloudconvert.com/dashboard](https://cloudconvert.com/dashboard)
4. **iLovePDF Dashboard**: [https://developer.ilovepdf.com/](https://developer.ilovepdf.com/)

---

## 🔧 Troubleshooting

### Problem: Edge funkce vrací 401 Unauthorized

**Řešení:**
```bash
# Zkontrolovat secrets
supabase secrets list

# Znovu nastavit chybějící secret
supabase secrets set OPENAI_API_KEY="sk-..."
```

### Problem: Edge funkce vrací 500 Internal Server Error

**Řešení:**
```bash
# Zkontrolovat logs
supabase functions logs <function-name>

# Znovu deployovat funkci
supabase functions deploy <function-name>
```

### Problem: API rate limiting

**Řešení:**
- Zkontrolovat OpenAI/CloudConvert/iLovePDF usage limity
- Implementovat rate limiting v edge funkcích
- Přidat retry mechanismus s exponential backoff

---

## 📝 Změny oproti původní implementaci

### Odstraněné hardcoded klíče:
- ❌ `OPENAI_API_KEY` - byl v `gptService.ts`, `embeddingService.ts`, `openRouterVisionService.ts`
- ❌ `CLOUDCONVERT_API_KEY` - byl v `cloudConvertService.ts`
- ❌ `ILOVEPDF_SECRET_KEY` - byl v `ilovepdfService.ts`
- ❌ `ILOVEPDF_PUBLIC_KEY` - byl v `ilovepdfService.ts`

### Přidáno:
- ✅ 3 nové edge funkce jako bezpečné proxy
- ✅ Upravené služby volají edge funkce místo přímých API volání
- ✅ Všechny secrets jsou v Supabase Secrets
- ✅ Dokumentace a bezpečnostní průvodce

---

## 🎯 Další doporučení

1. **Povolit RLS na všech veřejných tabulkách**
2. **Implementovat rate limiting v edge funkcích**
3. **Přidat monitoring a alerting pro neobvyklé usage**
4. **Nastavit budget limity pro API služby**
5. **Pravidelně kontrolovat bezpečnostní logy**

---

**Poslední aktualizace:** 2025-01-19  
**Verze:** 1.0.0  
**Autor:** Security Refactoring

