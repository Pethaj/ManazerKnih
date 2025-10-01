# Nastavení automatické denní synchronizace produktů BEWIT

## 1. Pomocí Supabase Edge Functions (Doporučeno)

### Krok 1: Vytvoření Edge Function

Vytvořte novou Edge Function v Supabase:

```bash
supabase functions new sync-bewit-products
```

### Krok 2: Implementace Edge Function

V souboru `supabase/functions/sync-bewit-products/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Supabase client s admin právy
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🔄 Začínám automatickou synchronizaci produktů BEWIT...')

    // URL produktového feedu
    const BEWIT_FEED_URL = 'https://bewit.love/feeds/zbozi.xml'
    
    // Načteme XML feed
    const response = await fetch(BEWIT_FEED_URL)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const xmlText = await response.text()
    console.log('✅ XML feed načten')

    // Parsování XML (zjednodušená verze)
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml')
    const items = xmlDoc.querySelectorAll('item')
    
    console.log(`📊 Nalezeno ${items.length} produktů`)

    let inserted = 0
    let updated = 0
    let failed = 0

    // Zpracování každého produktu
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      
      try {
        const title = item.querySelector('title')?.textContent || ''
        const description = item.querySelector('description')?.textContent || ''
        const link = item.querySelector('link')?.textContent || ''
        
        // Extrakce kódu produktu
        let productCode = `auto_${Date.now()}_${i}`
        let name = title
        
        const titleMatch = title.match(/^(\d+)\s*-\s*(.+)$/)
        if (titleMatch) {
          productCode = titleMatch[1]
          name = titleMatch[2].trim()
        }

        // Extrakce ceny
        let price: number | null = null
        const priceMatch = description.match(/(\d+(?:[,.]?\d+)?)\s*(?:CZK|Kč|,-)/i)
        if (priceMatch) {
          price = parseFloat(priceMatch[1].replace(',', '.'))
        }

        // Extrakce kategorie
        let category: string | null = null
        if (description.includes('Tradiční čínská medicína')) {
          category = 'Tradiční čínská medicína'
        } else if (description.includes('esenciální olej')) {
          category = 'Esenciální oleje'
        } else if (description.includes('Obelisky')) {
          category = 'Krystaly a minerály'
        }

        // Zkusíme najít existující produkt
        const { data: existing } = await supabase
          .from('products')
          .select('id')
          .eq('product_code', productCode)
          .single()

        const productData = {
          product_code: productCode,
          name: name,
          description: description,
          category: category,
          price: price,
          currency: 'CZK',
          availability: 0,
          product_url: link,
          brand: 'BEWIT',
          xml_content: item.outerHTML,
          sync_status: 'success',
          last_sync_at: new Date().toISOString()
        }

        if (existing) {
          // Aktualizace
          const { error } = await supabase
            .from('products')
            .update(productData)
            .eq('id', existing.id)

          if (error) {
            console.error('Chyba při aktualizaci:', error)
            failed++
          } else {
            updated++
          }
        } else {
          // Vložení
          const { error } = await supabase
            .from('products')
            .insert(productData)

          if (error) {
            console.error('Chyba při vkládání:', error)
            failed++
          } else {
            inserted++
          }
        }
      } catch (error) {
        console.error(`Chyba při zpracování produktu ${i}:`, error)
        failed++
      }
    }

    // Zalogování výsledku
    await supabase
      .from('sync_logs')
      .insert({
        sync_type: 'products_feed_auto',
        status: 'success',
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
        records_processed: items.length,
        records_inserted: inserted,
        records_updated: updated,
        records_failed: failed,
        feed_url: BEWIT_FEED_URL
      })

    console.log(`✅ Synchronizace dokončena: ${inserted} nových, ${updated} aktualizováno, ${failed} chyb`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synchronizace dokončena úspěšně`,
        stats: { inserted, updated, failed, total: items.length }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('❌ Chyba při synchronizaci:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
```

### Krok 3: Deploy Edge Function

```bash
supabase functions deploy sync-bewit-products
```

### Krok 4: Nastavení Cron Job

V Supabase Dashboard > Edge Functions vytvořte nový cron job:

```sql
SELECT cron.schedule(
  'sync-bewit-products-daily',
  '0 6 * * *',  -- Každý den v 6:00 ráno
  'SELECT net.http_post(
    url := ''https://your-project.supabase.co/functions/v1/sync-bewit-products'',
    headers := jsonb_build_object(
      ''Authorization'', ''Bearer '' || ''YOUR_ANON_KEY'',
      ''Content-Type'', ''application/json''
    )
  );'
);
```

## 2. Pomocí externího cron serveru

### Varianta A: GitHub Actions

Vytvořte `.github/workflows/sync-products.yml`:

```yaml
name: Sync BEWIT Products

on:
  schedule:
    - cron: '0 6 * * *'  # Každý den v 6:00 UTC
  workflow_dispatch:  # Manuální spuštění

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Sync Products
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json" \
            https://your-project.supabase.co/functions/v1/sync-bewit-products
```

### Varianta B: Vercel Cron Jobs

V `vercel.json`:

```json
{
  "functions": {
    "api/sync-products.js": {
      "maxDuration": 300
    }
  },
  "crons": [
    {
      "path": "/api/sync-products",
      "schedule": "0 6 * * *"
    }
  ]
}
```

## 3. Monitoring a logování

### Kontrola logů synchronizace

Přidejte do admin rozhraní zobrazení logů:

```sql
-- Zobrazení posledních 10 synchronizací
SELECT 
  sync_type,
  status,
  started_at,
  finished_at,
  records_processed,
  records_inserted,
  records_updated,
  records_failed,
  error_message
FROM sync_logs 
WHERE sync_type LIKE '%products%'
ORDER BY started_at DESC 
LIMIT 10;
```

### Alerting při chybách

Můžete nastavit webhook pro notifikace při neúspěšné synchronizaci:

```typescript
// V Edge Function
if (failed > 0 || error) {
  // Pošlete notifikaci (Slack, email, atd.)
  await fetch('YOUR_WEBHOOK_URL', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `❌ Chyba při synchronizaci produktů BEWIT: ${failed} chyb z ${total} produktů`
    })
  })
}
```

## 4. Testování

### Manuální test

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  https://your-project.supabase.co/functions/v1/sync-bewit-products
```

### Test v aplikaci

V ProductSyncAdmin komponentě můžete přidat tlačítko pro testování:

```typescript
const testAutoSync = async () => {
  try {
    const response = await fetch('https://your-project.supabase.co/functions/v1/sync-bewit-products', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    })
    
    const result = await response.json()
    console.log('Test automatické synchronizace:', result)
  } catch (error) {
    console.error('Chyba při testu:', error)
  }
}
```

## Doporučení

1. **Používejte Supabase Edge Functions** - nejjednodušší a nejspolehlivější řešení
2. **Nastavte monitoring** - sledujte úspěšnost synchronizací
3. **Implementujte retry logiku** - pro případ dočasných chyb
4. **Logujte detailně** - pro snadné ladění problémů
5. **Testujte pravidelně** - ověřujte funkčnost automatické synchronizace

## Bezpečnost

- Používejte service role key pouze v Edge Functions
- Nikdy nevkládejte citlivé klíče do klientského kódu
- Implementujte rate limiting pro API endpointy
- Monitorujte neobvyklé aktivity v databázi
