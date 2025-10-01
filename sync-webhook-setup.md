# HTTP Webhook řešení pro automatickou synchronizaci

## 🎯 Koncept
Místo cron job používáme HTTP requesty z n8n, které můžeme volat:
- **Manuálně** - kliknutím na tlačítko v aplikaci
- **Automaticky** - přes n8n workflow v nastaveném čase

## 🔗 CURL příkazy pro n8n

### 1. Základní curl pro spuštění synchronizace
```bash
curl -X POST \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZG9wYWZ5YmVzbGJjcWp4c3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNTM0MjEsImV4cCI6MjA3MDgyOTQyMX0.8gxL0b9flTUyoltiEIJx8Djuiyx16rySlffHkd_nm1U" \
  -H "Content-Type: application/json" \
  -d '{}' \
  https://modopafybeslbcqjxsve.supabase.co/functions/v1/sync-products
```

### 2. Curl s identifikací zdroje (pro n8n)
```bash
curl -X POST \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZG9wYWZ5YmVzbGJjcWp4c3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNTM0MjEsImV4cCI6MjA3MDgyOTQyMX0.8gxL0b9flTUyoltiEIJx8Djuiyx16rySlffHkd_nm1U" \
  -H "Content-Type: application/json" \
  -H "X-Triggered-By: n8n-auto-sync" \
  -H "X-Trigger-Time: $(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  -d '{"source": "n8n_auto", "trigger_time": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' \
  https://modopafybeslbcqjxsve.supabase.co/functions/v1/sync-products
```

### 3. Curl s error handling pro n8n
```bash
response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZG9wYWZ5YmVzbGJjcWp4c3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNTM0MjEsImV4cCI6MjA3MDgyOTQyMX0.8gxL0b9flTUyoltiEIJx8Djuiyx16rySlffHkd_nm1U" \
  -H "Content-Type: application/json" \
  -d '{"source": "n8n_scheduled"}' \
  https://modopafybeslbcqjxsve.supabase.co/functions/v1/sync-products)

body=$(echo $response | sed -E 's/HTTPSTATUS\:[0-9]{3}$//')
status=$(echo $response | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')

if [ $status -eq 200 ]; then
  echo "✅ Synchronizace úspěšná: $body"
else
  echo "❌ Chyba synchronizace (HTTP $status): $body"
  exit 1
fi
```

## 🤖 n8n Workflow konfigurace

### HTTP Request node nastavení:
```json
{
  "method": "POST",
  "url": "https://modopafybeslbcqjxsve.supabase.co/functions/v1/sync-products",
  "headers": {
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZG9wYWZ5YmVzbGJjcWp4c3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNTM0MjEsImV4cCI6MjA3MDgyOTQyMX0.8gxL0b9flTUyoltiEIJx8Djuiyx16rySlffHkd_nm1U",
    "Content-Type": "application/json",
    "X-Triggered-By": "n8n-workflow"
  },
  "body": {
    "source": "n8n_auto",
    "scheduled_time": "{{ $now }}"
  }
}
```

### Schedule Trigger nastavení:
```json
{
  "rule": {
    "interval": [
      {
        "field": "cronExpression",
        "expression": "0 6 * * *"
      }
    ]
  }
}
```

## 📱 Tlačítko v aplikaci

### JavaScript pro frontend:
```javascript
const triggerSync = async (source = 'manual') => {
  try {
    const response = await fetch('https://modopafybeslbcqjxsve.supabase.co/functions/v1/sync-products', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZG9wYWZ5YmVzbGJjcWp4c3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNTM0MjEsImV4cCI6MjA3MDgyOTQyMX0.8gxL0b9flTUyoltiEIJx8Djuiyx16rySlffHkd_nm1U',
        'Content-Type': 'application/json',
        'X-Triggered-By': source
      },
      body: JSON.stringify({
        source: source,
        trigger_time: new Date().toISOString()
      })
    });

    const result = await response.json();
    
    if (result.ok) {
      console.log('✅ Synchronizace úspěšná:', result);
      return result;
    } else {
      throw new Error(result.error || 'Synchronizace selhala');
    }
  } catch (error) {
    console.error('❌ Chyba synchronizace:', error);
    throw error;
  }
};

// Použití v tlačítku
document.getElementById('syncButton').addEventListener('click', async () => {
  const button = document.getElementById('syncButton');
  button.disabled = true;
  button.textContent = '⏳ Synchronizuji...';
  
  try {
    const result = await triggerSync('manual_button');
    button.textContent = '✅ Dokončeno';
    alert(`Synchronizace úspěšná!\nZpracováno: ${result.processed}\nNových: ${result.inserted}\nAktualizováno: ${result.updated}`);
  } catch (error) {
    button.textContent = '❌ Chyba';
    alert('Chyba při synchronizaci: ' + error.message);
  } finally {
    setTimeout(() => {
      button.disabled = false;
      button.textContent = '🔄 Spustit synchronizaci';
    }, 3000);
  }
});
```

## 🔍 Monitoring a logy

### Kontrola výsledků:
```sql
-- Zobrazit posledních 10 synchronizací
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
ORDER BY started_at DESC 
LIMIT 10;

-- Statistiky za posledních 7 dní
SELECT 
    DATE(started_at) as sync_date,
    COUNT(*) as total_attempts,
    COUNT(CASE WHEN status = 'success' THEN 1 END) as successful,
    COUNT(CASE WHEN status = 'error' THEN 1 END) as failed,
    MAX(records_updated) as max_updated
FROM sync_logs 
WHERE started_at > NOW() - INTERVAL '7 days'
AND sync_type LIKE '%product%'
GROUP BY DATE(started_at)
ORDER BY sync_date DESC;
```

## ⚡ Výhody tohoto řešení:

1. **Jednoduchost** - žádné složité cron job konfigurace
2. **Flexibilita** - můžete spustit kdykoli manuálně i automaticky
3. **Monitoring** - vidíte okamžitě výsledky
4. **Error handling** - lepší zpracování chyb
5. **Škálovatelnost** - můžete přidat více triggerů
6. **Debugging** - snadné testování a ladění

## 🚀 Okamžité spuštění:

Pro test použijte tento příkaz:
```bash
curl -X POST -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZG9wYWZ5YmVzbGJjcWp4c3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNTM0MjEsImV4cCI6MjA3MDgyOTQyMX0.8gxL0b9flTUyoltiEIJx8Djuiyx16rySlffHkd_nm1U" -H "Content-Type: application/json" https://modopafybeslbcqjxsve.supabase.co/functions/v1/sync-products
```
