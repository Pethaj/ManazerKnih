# 🚀 Systém denních limitů zpráv - Quick Start

> **Status:** ✅ Backend implementován, čeká na frontend integraci

## Co to je?

Systém pro sledování a omezování počtu zpráv v chatbotech. Umožňuje nastavit:
- **Globální limit** - napříč všemi chatboty
- **Individuální limity** - pro každý chatbot zvlášť
- **Automatický reset** - každý den o půlnoci (CET)

## 📦 Co už je hotovo

✅ **Databáze**
- Tabulka `message_limits` vytvořena
- Funkce pro increment a reset připraveny

✅ **Edge Functions**
- `check-message-limit` - kontrola a inkrementace
- `reset-message-limits-cron` - denní reset

✅ **TypeScript knihovna**
- Helper funkce v `/src/lib/message-limits.ts`

✅ **Dokumentace**
- Kompletní technická dokumentace
- Návody na setup a integraci

## 🎯 Co je potřeba udělat (~2 hodiny)

### 1️⃣ Integrace do chat API (20 min)

V tvém chat API endpointu (např. `/api/chat/send`):

```typescript
import { checkMessageLimit, incrementMessageCount } from '@/lib/message-limits'

export async function POST(req: Request) {
  const { chatbot_id, message } = await req.json()
  
  // ✅ PŘED ODESLÁNÍM - zkontroluj limit
  const limitCheck = await checkMessageLimit(chatbot_id)
  if (!limitCheck.allowed) {
    return Response.json({
      error: limitCheck.reason,
      message: limitCheck.message
    }, { status: 429 })
  }
  
  // ... odeslání zprávy do AI ...
  
  // ✅ PO ÚSPĚCHU - zvyš čítač
  await incrementMessageCount(chatbot_id)
  
  return Response.json({ success: true })
}
```

### 2️⃣ UI pro nastavení limitů (45 min)

V admin panelu pro správu chatbotů:

```tsx
import { setChatbotLimit, getChatbotLimit } from '@/lib/message-limits'

function ChatbotSettings({ chatbotId }) {
  const [limit, setLimit] = useState<number | null>(null)
  
  async function saveLimit() {
    const supabase = createClient()
    await setChatbotLimit(supabase, chatbotId, limit)
  }
  
  return (
    <div>
      <input 
        type="number" 
        placeholder="Např. 5000 (prázdné = bez limitu)"
        value={limit ?? ''}
        onChange={e => setLimit(e.target.value ? parseInt(e.target.value) : null)}
      />
      <button onClick={saveLimit}>Uložit limit</button>
    </div>
  )
}
```

### 3️⃣ Hláška při dosažení limitu (25 min)

V chat widgetu:

```tsx
if (isLimitExceeded) {
  return (
    <div className="text-center p-8">
      <div className="text-5xl mb-4">⏰</div>
      <h3 className="text-xl font-semibold mb-2">
        Denní limit zpráv dosažen
      </h3>
      <p className="text-gray-600">
        Omlouváme se, ale denní limit zpráv byl dosažen.
        Chat bude opět dostupný od půlnoci.
      </p>
    </div>
  )
}
```

### 4️⃣ Nastavení cron jobu (10 min)

V Supabase Dashboard → SQL Editor:

```sql
SELECT cron.schedule(
  'reset-message-limits-daily',
  '5 23 * * *',
  $$
  SELECT net.http_post(
    url := 'https://modopafybeslbcqjxsve.supabase.co/functions/v1/reset-message-limits-cron',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    )
  );
  $$
);
```

## 🧪 Testování

### Rychlý test

```bash
# Spusť testovací skript
./test-message-limits.sh
```

### Manuální test Edge Function

```bash
# Test kontroly limitu
curl -X POST \
  https://modopafybeslbcqjxsve.supabase.co/functions/v1/check-message-limit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TVUJ_ANON_KEY" \
  -d '{"chatbot_id":"test-bot","action":"check"}'
```

### Test v databázi

```sql
-- Zobraz všechny limity
SELECT * FROM message_limits;

-- Nastav testovací limit
INSERT INTO message_limits (chatbot_id, daily_limit, current_count)
VALUES ('test-bot', 10, 0);

-- Test inkrementace
SELECT increment_message_count(
  (SELECT id FROM message_limits WHERE chatbot_id = 'test-bot')
);

-- Test resetu
SELECT reset_all_message_limits();
```

## 📚 Dokumentace

- **Kompletní dokumentace:** `docs/MESSAGE_LIMITS_SYSTEM.md`
- **Setup cron jobu:** `docs/SETUP_MESSAGE_LIMITS_CRON.md`
- **Příklady integrace:** `EXAMPLE-chat-api-integration.ts`
- **Implementační pokyny:** `docs/MESSAGE_LIMITS_IMPLEMENTACE.md`

## 🔗 Edge Functions URLs

```
Check Limit:
https://modopafybeslbcqjxsve.supabase.co/functions/v1/check-message-limit

Reset Cron:
https://modopafybeslbcqjxsve.supabase.co/functions/v1/reset-message-limits-cron
```

## 📊 Monitoring

### Dashboard query

```sql
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
  ml.reset_at
FROM message_limits ml
LEFT JOIN chatbot_settings cs ON cs.chatbot_id = ml.chatbot_id
ORDER BY ml.chatbot_id NULLS FIRST;
```

## ❓ FAQ

### Jak nastavit globální limit?

```typescript
import { setGlobalLimit } from '@/lib/message-limits'
const supabase = createClient()
await setGlobalLimit(supabase, 100000) // 100k zpráv/den
```

### Jak vypnout limit pro konkrétní chatbot?

```typescript
await setChatbotLimit(supabase, chatbotId, null) // null = bez limitu
```

### Jak se počítají zprávy?

1 konverzační dvojice (user + AI) = 1 započtená zpráva

### Kdy se resetují čítače?

Automaticky každý den v 00:05 CET pomocí cron jobu.

## 🆘 Troubleshooting

### Edge Function vrací chybu

1. Zkontroluj logy v Supabase Dashboard → Edge Functions
2. Ověř že používáš správný API key
3. Zkontroluj databázi: `SELECT * FROM message_limits;`

### Cron job neběží

```sql
-- Zkontroluj jestli existuje
SELECT * FROM cron.job WHERE jobname = 'reset-message-limits-daily';

-- Zkontroluj historii běhů
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

### Čítače se neresetují

```sql
-- Manuální reset
UPDATE message_limits
SET current_count = 0, reset_at = NOW() + INTERVAL '1 day';
```

## 🎓 Užitečné odkazy

- [Supabase Dashboard](https://supabase.com/dashboard/project/modopafybeslbcqjxsve)
- [Edge Functions](https://supabase.com/dashboard/project/modopafybeslbcqjxsve/functions)
- [Database](https://supabase.com/dashboard/project/modopafybeslbcqjxsve/editor)

---

**Vytvořeno:** 2026-01-30  
**Projekt:** Books (modopafybeslbcqjxsve)  
**Status:** Backend ✅ | Frontend ⏳

**Další krok:** Začni s integrací do chat API (krok 1️⃣ výše)
