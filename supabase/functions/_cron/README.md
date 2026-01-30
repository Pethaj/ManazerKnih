# Supabase Cron Jobs

## Nastavení denního resetu limitů

### 1️⃣ Vytvoření pg_cron jobu

Připoj se k Supabase dashboard SQL Editoru a spusť:

```sql
-- Vytvoření cron jobu pro denní reset limitů
-- Běží každý den v 00:05 CET (23:05 UTC v zimě, 22:05 UTC v létě)

SELECT cron.schedule(
  'reset-message-limits-daily',
  '5 23 * * *', -- 23:05 UTC = 00:05 CET (v zimním čase)
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/reset-message-limits-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    )
  ) as request_id;
  $$
);
```

### 2️⃣ Alternativa: Externí cron (Vercel Cron, GitHub Actions)

Pokud nechceš používat pg_cron, můžeš použít externí službu:

#### Vercel Cron (vercel.json)

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

Vytvoř API endpoint:

```typescript
// app/api/cron/reset-message-limits/route.ts
export async function GET(req: Request) {
  // Ověř authorization token
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
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

  return Response.json(await response.json())
}
```

#### GitHub Actions (.github/workflows/reset-limits.yml)

```yaml
name: Reset Message Limits Daily

on:
  schedule:
    - cron: '5 23 * * *' # 23:05 UTC každý den

jobs:
  reset-limits:
    runs-on: ubuntu-latest
    steps:
      - name: Call Supabase Edge Function
        run: |
          curl -X POST \
            ${{ secrets.SUPABASE_URL }}/functions/v1/reset-message-limits-cron \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}"
```

### 3️⃣ Kontrola běhu cron jobu

```sql
-- Zobraz všechny naplánované joby
SELECT * FROM cron.job;

-- Zobraz historii běhu
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'reset-message-limits-daily')
ORDER BY start_time DESC
LIMIT 10;

-- Smazání cron jobu (pokud potřebuješ)
SELECT cron.unschedule('reset-message-limits-daily');
```

### 4️⃣ Ruční spuštění (pro testování)

```bash
# Zavolej Edge Function přímo
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/reset-message-limits-cron \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

### 5️⃣ Monitoring

Doporučuji nastavit monitoring pro sledování úspěšnosti resetu:

- Loguj každý reset do tabulky `system_logs`
- Nastav alerting pokud reset selže
- Kontroluj denně v admin dashboardu
