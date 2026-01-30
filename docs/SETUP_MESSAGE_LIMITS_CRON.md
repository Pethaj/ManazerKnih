# 🕐 Nastavení Cron Jobu pro denní reset limitů

## Účel

Cron job automaticky resetuje čítače zpráv každý den v 00:05 CET (půlnoc + 5 minut).

## Možnosti nastavení

### ✅ Možnost 1: Supabase pg_cron (DOPORUČENO)

Nejjednodušší způsob - vše běží přímo v Supabase.

#### Krok 1: Připojení k SQL Editoru

1. Otevři [Supabase Dashboard](https://supabase.com/dashboard)
2. Vyber projekt **Books** (modopafybeslbcqjxsve)
3. V levém menu klikni na **SQL Editor**

#### Krok 2: Vytvoření cron jobu

Spusť následující SQL:

```sql
-- Vytvoření cron jobu pro denní reset limitů
-- Běží každý den v 00:05 CET

SELECT cron.schedule(
  'reset-message-limits-daily',           -- Název jobu
  '5 23 * * *',                           -- 23:05 UTC = 00:05 CET (v zimním čase)
  $$
  SELECT net.http_post(
    url := 'https://modopafybeslbcqjxsve.supabase.co/functions/v1/reset-message-limits-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    )
  ) as request_id;
  $$
);
```

**Poznámka k času:**
- `5 23 * * *` = 23:05 UTC
- V zimním čase (CEST): 23:05 UTC = 00:05 CET
- V letním čase (CEST): Musíš změnit na `5 22 * * *` (22:05 UTC = 00:05 CEST)

#### Krok 3: Kontrola že job běží

```sql
-- Zobraz všechny cron joby
SELECT * FROM cron.job WHERE jobname = 'reset-message-limits-daily';

-- Zobraz historii běhů (posledních 10)
SELECT * 
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'reset-message-limits-daily')
ORDER BY start_time DESC
LIMIT 10;
```

#### Krok 4: Manuální test

Před tím než čekáš do půlnoci, otestuj funkci ručně:

```bash
# V terminálu (nebo použij Postman/Insomnia)
curl -X POST \
  https://modopafybeslbcqjxsve.supabase.co/functions/v1/reset-message-limits-cron \
  -H "Authorization: Bearer TVUJ_SERVICE_ROLE_KEY"
```

**Kde najít Service Role Key:**
1. Supabase Dashboard → Project Settings → API
2. Sekce "Project API keys"
3. Zkopíruj `service_role` key (⚠️ NIKDY ho necommituj do gitu!)

#### Krok 5: Kontrola výsledku

Po zavolání funkce zkontroluj:

```sql
-- Zobraz všechny limity
SELECT 
  CASE 
    WHEN chatbot_id IS NULL THEN '🌍 GLOBÁLNÍ'
    ELSE '🤖 ' || chatbot_id
  END as chatbot,
  daily_limit,
  current_count,
  reset_at,
  updated_at
FROM message_limits
ORDER BY chatbot_id NULLS FIRST;
```

Všechny `current_count` by měly být 0 a `reset_at` by měl být nastaven na další půlnoc.

---

### 🔧 Možnost 2: GitHub Actions

Pokud nechceš používat pg_cron, můžeš použít GitHub Actions.

#### Vytvoř soubor `.github/workflows/reset-limits.yml`:

```yaml
name: Reset Message Limits Daily

on:
  schedule:
    # Běží každý den v 23:05 UTC (00:05 CET v zimním čase)
    - cron: '5 23 * * *'
  
  # Umožňuje manuální spuštění z GitHub UI
  workflow_dispatch:

jobs:
  reset-limits:
    runs-on: ubuntu-latest
    
    steps:
      - name: Call Supabase Edge Function
        run: |
          response=$(curl -s -w "\n%{http_code}" -X POST \
            https://modopafybeslbcqjxsve.supabase.co/functions/v1/reset-message-limits-cron \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}")
          
          http_code=$(echo "$response" | tail -n1)
          body=$(echo "$response" | head -n-1)
          
          echo "HTTP Status: $http_code"
          echo "Response: $body"
          
          if [ "$http_code" -ne 200 ]; then
            echo "Error: Reset failed with status $http_code"
            exit 1
          fi
          
          echo "✅ Message limits reset successful"

      - name: Notify on failure
        if: failure()
        run: |
          echo "❌ Message limits reset FAILED!"
          # Zde můžeš přidat notifikaci (email, Slack, Discord)
```

#### Nastavení GitHub Secrets:

1. Jdi na GitHub repo → Settings → Secrets and variables → Actions
2. Klikni **New repository secret**
3. Name: `SUPABASE_SERVICE_ROLE_KEY`
4. Value: [tvůj service role key ze Supabase]
5. Klikni **Add secret**

---

### ⚡ Možnost 3: Vercel Cron (pokud používáš Vercel)

#### 1. Vytvoř `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/reset-message-limits",
      "schedule": "5 23 * * *"
    }
  ]
}
```

#### 2. Vytvoř API endpoint `app/api/cron/reset-message-limits/route.ts`:

```typescript
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  try {
    // Ověř authorization token (ochrana)
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Zavolej Supabase Edge Function
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/reset-message-limits-cron`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    )

    const data = await response.json()

    if (!response.ok) {
      console.error('Reset failed:', data)
      return NextResponse.json(data, { status: 500 })
    }

    console.log('✅ Message limits reset successful:', data)
    return NextResponse.json(data)

  } catch (error) {
    console.error('❌ Cron error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

#### 3. Nastav environment variables ve Vercel:

```
CRON_SECRET=nějaký-silný-random-string
SUPABASE_SERVICE_ROLE_KEY=tvůj-service-role-key
```

---

## 🧪 Testování

### Test 1: Manuální zavolání Edge Function

```bash
curl -X POST \
  https://modopafybeslbcqjxsve.supabase.co/functions/v1/reset-message-limits-cron \
  -H "Authorization: Bearer TVUJ_SERVICE_ROLE_KEY"
```

Očekávaný výstup:
```json
{
  "success": true,
  "message": "Message limits reset completed",
  "timestamp": "2026-01-30T23:05:00.000Z",
  "total_limits": 2,
  "limits": [
    {
      "chatbot_id": "GLOBAL",
      "current_count": 0,
      "daily_limit": null,
      "reset_at": "2026-01-31T23:00:00.000Z"
    },
    {
      "chatbot_id": "chatbot-1",
      "current_count": 0,
      "daily_limit": 5000,
      "reset_at": "2026-01-31T23:00:00.000Z"
    }
  ]
}
```

### Test 2: Kontrola databáze

```sql
-- Před resetem
SELECT chatbot_id, current_count, daily_limit FROM message_limits;

-- Zavolej reset funkci (viz Test 1)

-- Po resetu - všechny current_count by měly být 0
SELECT chatbot_id, current_count, daily_limit FROM message_limits;
```

---

## 🔍 Monitoring

### Dashboard query pro kontrolu limitů

```sql
-- Aktuální stav všech limitů
SELECT 
  CASE 
    WHEN ml.chatbot_id IS NULL THEN '🌍 GLOBÁLNÍ'
    ELSE '🤖 ' || cs.chatbot_name
  END as chatbot,
  ml.daily_limit,
  ml.current_count,
  CASE 
    WHEN ml.daily_limit IS NULL THEN '∞'
    ELSE ROUND((ml.current_count::float / ml.daily_limit) * 100, 1) || '%'
  END as využití,
  ml.reset_at,
  ml.updated_at
FROM message_limits ml
LEFT JOIN chatbot_settings cs ON cs.chatbot_id = ml.chatbot_id
ORDER BY ml.chatbot_id NULLS FIRST;
```

### Logy Edge Function

V Supabase Dashboard:
1. Edge Functions → `reset-message-limits-cron`
2. Klikni na **Logs** tab
3. Uvidíš všechny běhy a případné chyby

---

## ❓ Troubleshooting

### ❌ Cron job neběží

**Kontrola:**
```sql
SELECT * FROM cron.job WHERE jobname = 'reset-message-limits-daily';
```

Pokud neexistuje, spusť znovu vytvoření jobu (viz Možnost 1, Krok 2).

### ❌ Edge Function vrací 401 Unauthorized

**Řešení:** Zkontroluj že používáš správný Service Role Key (ne anon key!).

### ❌ Čítače se neresetují

**Kontrola:**
```sql
-- Zkontroluj čas posledního resetu
SELECT chatbot_id, reset_at, updated_at FROM message_limits;
```

**Možné příčiny:**
1. Cron job neběžel → Zkontroluj `cron.job_run_details`
2. Funkce selhala → Zkontroluj logy Edge Function
3. Timezone problém → Ověř že `reset_at` je správně nastaven

### 🔧 Manuální reset (emergency)

Pokud potřebuješ ručně resetovat:

```sql
-- Aktualizuj všechny limity
UPDATE message_limits
SET 
  current_count = 0,
  reset_at = (date_trunc('day', timezone('Europe/Prague', NOW())) + INTERVAL '1 day'),
  updated_at = NOW();
```

---

## 📅 Letní čas (DST)

⚠️ **DŮLEŽITÉ:** Když se přejde na letní čas (konec března), změň cron schedule:

**Zimní čas (říjen - březen):**
```sql
'5 23 * * *'  -- 23:05 UTC = 00:05 CET
```

**Letní čas (březen - říjen):**
```sql
'5 22 * * *'  -- 22:05 UTC = 00:05 CEST
```

Nebo použij Edge Function který automaticky detekuje timezone (již implementováno - používá `Europe/Prague`).

---

## ✅ Checklist po nastavení

- [ ] Cron job vytvořen v Supabase
- [ ] Service Role Key správně nastaven
- [ ] Manuální test proběhl úspěšně
- [ ] Kontrola databáze potvrdila reset
- [ ] Logy Edge Function neobsahují chyby
- [ ] Monitoring dashboard funguje
- [ ] Poznámka v kalendáři pro změnu DST (březen/říjen)

---

**Datum vytvoření:** 2026-01-30  
**Projekt:** Books (modopafybeslbcqjxsve)  
**Edge Function:** `reset-message-limits-cron`
