# 📊 Systém denních limitů zpráv

Dokumentace k systému pro sledování a omezování počtu zpráv v chatbotech.

## 📋 Přehled

Systém umožňuje:
- ✅ Nastavení globálního limitu (napříč všemi chatboty)
- ✅ Nastavení individuálního limitu pro každý chatbot
- ✅ Automatický denní reset čítačů o půlnoci (CET)
- ✅ Zobrazení pěkné hlášky při dosažení limitu
- ✅ Možnost "bez limitu" (NULL hodnota)
- ✅ Počítání 1 konverzační dvojice (user + AI) = 1 zpráva

## 🏗️ Architektura

### Databáze

#### Tabulka: `message_limits`

```sql
CREATE TABLE message_limits (
  id UUID PRIMARY KEY,
  chatbot_id UUID, -- NULL = globální limit
  daily_limit INTEGER, -- NULL = bez limitu
  current_count INTEGER DEFAULT 0,
  reset_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Globální limit:**
- `chatbot_id = NULL`
- Platí pro všechny chatboty dohromady
- Nadřazený individuálním limitům

**Individuální limit:**
- `chatbot_id = UUID konkrétního chatbota`
- Platí pouze pro daný chatbot
- Musí respektovat globální limit

### Edge Functions

#### 1. `check-message-limit`

**URL:** `/functions/v1/check-message-limit`

**Účel:** Kontrola a inkrementace limitů

**Request:**
```json
{
  "chatbot_id": "uuid",
  "action": "check" | "increment"
}
```

**Response (allowed):**
```json
{
  "allowed": true,
  "global": {
    "current": 1234,
    "limit": 10000,
    "reset_at": "2026-01-31T00:00:00Z"
  },
  "chatbot": {
    "current": 567,
    "limit": 5000,
    "reset_at": "2026-01-31T00:00:00Z"
  }
}
```

**Response (limit exceeded):**
```json
{
  "allowed": false,
  "reason": "chatbot_limit_exceeded",
  "message": "Omlouváme se, ale denní limit zpráv pro tento chat byl dosažen...",
  "reset_at": "2026-01-31T00:00:00Z",
  "current": 5000,
  "limit": 5000
}
```

#### 2. `reset-message-limits-cron`

**URL:** `/functions/v1/reset-message-limits-cron`

**Účel:** Denní reset čítačů (spouští se cronem)

**Spouštění:** Každý den v 00:05 CET

**Authorization:** Vyžaduje Service Role Key

## 🔄 Flow zpracování zprávy

```
1. User odešle zprávu
   ↓
2. API zavolá checkMessageLimit(chatbot_id)
   ↓
3. Edge Function zkontroluje:
   - Globální limit
   - Individuální limit chatbota
   - Potřeba resetu čítačů
   ↓
4a. Limit OK → pokračuj
4b. Limit exceeded → vrať 429 s hláškou
   ↓
5. Zpráva se odešle AI modelu
   ↓
6. Uložení do databáze
   ↓
7. Inkrementace čítačů:
   - incrementMessageCount(chatbot_id)
   - Zvýší global counter
   - Zvýší chatbot counter
   ↓
8. Vrať odpověď uživateli
```

## 💻 Použití v kódu

### Před odesláním zprávy

```typescript
import { checkMessageLimit } from '@/lib/message-limits'

// V API endpointu
const limitCheck = await checkMessageLimit(chatbot_id)

if (!limitCheck.allowed) {
  return Response.json({
    error: limitCheck.reason,
    message: limitCheck.message,
    reset_at: limitCheck.reset_at
  }, { status: 429 })
}

// Pokračuj s odesláním zprávy...
```

### Po úspěšném odeslání

```typescript
import { incrementMessageCount } from '@/lib/message-limits'

// Po úspěšném odeslání a uložení
await incrementMessageCount(chatbot_id)
```

### V admin UI

```typescript
import { setChatbotLimit, getChatbotLimit } from '@/lib/message-limits'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

// Načtení limitu
const limit = await getChatbotLimit(supabase, chatbot_id)

// Nastavení limitu
await setChatbotLimit(supabase, chatbot_id, 5000) // 5000 zpráv/den
await setChatbotLimit(supabase, chatbot_id, null) // Bez limitu
```

### V React komponentě (Chat Widget)

```typescript
import { checkMessageLimit } from '@/lib/message-limits'

function ChatWidget({ chatbotId }) {
  const [isLimitExceeded, setIsLimitExceeded] = useState(false)
  
  async function handleSendMessage() {
    const check = await checkMessageLimit(chatbotId)
    
    if (!check.allowed) {
      setIsLimitExceeded(true)
      showLimitMessage(check.message)
      return
    }
    
    // Odeslat zprávu...
  }
}
```

## 🎨 UI komponenty

### Limit dosažen - Hláška v chatu

```tsx
<div className="flex items-center justify-center h-full bg-gray-50">
  <div className="max-w-md p-8 bg-white rounded-2xl shadow-lg text-center">
    <div className="mb-4 text-5xl">⏰</div>
    <h3 className="text-xl font-semibold text-gray-900 mb-2">
      Denní limit zpráv dosažen
    </h3>
    <p className="text-gray-600 mb-4">
      Omlouváme se, ale denní limit zpráv pro tento chat byl dosažen.
      Chat bude opět dostupný od půlnoci.
    </p>
    <p className="text-sm text-gray-500">
      Reset za 3h 24m
    </p>
  </div>
</div>
```

### Admin nastavení limitu

```tsx
<div className="space-y-4">
  <label className="block">
    <span className="text-sm font-medium">Denní limit zpráv</span>
    <input
      type="number"
      placeholder="Např. 5000 (prázdné = bez limitu)"
      value={limit ?? ''}
      onChange={e => setLimit(e.target.value ? parseInt(e.target.value) : null)}
    />
  </label>
  
  <div className="p-4 bg-gray-50 rounded-lg">
    <div className="flex justify-between mb-2">
      <span>Aktuální využití:</span>
      <span className="font-bold">{current} / {limit ?? '∞'}</span>
    </div>
    
    {/* Progress bar */}
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div 
        className="bg-green-500 h-2 rounded-full"
        style={{ width: `${(current / limit) * 100}%` }}
      />
    </div>
  </div>
  
  <button onClick={saveLimit}>Uložit limit</button>
</div>
```

## 🔧 Instalace a setup

### 1. Spusť migraci

```bash
cd supabase
supabase db push
```

Nebo manuálně v SQL Editoru:
```bash
psql -h db.xxxxx.supabase.co -U postgres -d postgres -f migrations/20260130_message_limits.sql
```

### 2. Deploy Edge Functions

```bash
# Deploy check-message-limit
supabase functions deploy check-message-limit

# Deploy reset cron
supabase functions deploy reset-message-limits-cron
```

### 3. Nastav cron job

V Supabase SQL Editoru:

```sql
SELECT cron.schedule(
  'reset-message-limits-daily',
  '5 23 * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/reset-message-limits-cron',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    )
  );
  $$
);
```

### 4. Testování

```bash
# Test check-message-limit
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/check-message-limit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"chatbot_id":"test-uuid","action":"check"}'

# Test reset (vyžaduje service role key)
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/reset-message-limits-cron \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

## 📊 Monitoring

### Dashboard query

```sql
-- Přehled všech limitů
SELECT 
  CASE 
    WHEN chatbot_id IS NULL THEN '🌍 GLOBÁLNÍ'
    ELSE '🤖 ' || c.name
  END as chatbot,
  daily_limit,
  current_count,
  CASE 
    WHEN daily_limit IS NULL THEN '∞'
    ELSE ROUND((current_count::float / daily_limit) * 100, 1) || '%'
  END as využití,
  reset_at
FROM message_limits ml
LEFT JOIN chatbots c ON c.id = ml.chatbot_id
ORDER BY chatbot_id NULLS FIRST;
```

### Alerting

```sql
-- Chatboty nad 80% limitu
SELECT 
  c.name,
  ml.current_count,
  ml.daily_limit,
  ROUND((ml.current_count::float / ml.daily_limit) * 100, 1) as percentage
FROM message_limits ml
JOIN chatbots c ON c.id = ml.chatbot_id
WHERE ml.daily_limit IS NOT NULL
  AND ml.current_count > ml.daily_limit * 0.8
ORDER BY percentage DESC;
```

## ❓ FAQ

### Q: Co když Edge Function selže?

**A:** Systém používá "fail-open" strategii - pokud kontrola limitu selže (network error, timeout), zpráva se povolí. Je lepší poslat zprávu než zablokovat uživatele.

### Q: Jak změnit globální limit?

**A:**
```typescript
import { setGlobalLimit } from '@/lib/message-limits'
await setGlobalLimit(supabase, 100000) // 100k zpráv/den
```

Nebo přímo v SQL:
```sql
UPDATE message_limits 
SET daily_limit = 100000 
WHERE chatbot_id IS NULL;
```

### Q: Jak vypnout limit pro konkrétní chatbot?

**A:**
```typescript
await setChatbotLimit(supabase, chatbot_id, null)
```

### Q: Počítají se user a AI zprávy zvlášť?

**A:** Ne, počítá se 1 konverzační dvojice (user → AI) jako 1 započtená zpráva. To odpovídá tomu, že náklady vznikají především u AI odpovědi.

### Q: Co když chatbot dosáhne limitu v půli dne?

**A:** Uživatel uvidí pěknou hlášku: "Omlouváme se, ale denní limit zpráv pro tento chat byl dosažen. Chat bude opět dostupný od půlnoci."

### Q: Jak sledovat historii limitů?

**A:** Momentálně se ukládá pouze aktuální stav. Pro historii doporučuji vytvořit audit tabulku:

```sql
CREATE TABLE message_limits_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chatbot_id UUID,
  date DATE,
  total_messages INTEGER,
  limit_at_time INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger pro ukládání denní historie před resetem
```

## 🚀 Další vylepšení

Možné budoucí rozšíření:

1. **Varování před dosažením limitu**
   - Email/notifikace při 80% a 95%
   
2. **Týdenní/měsíční limity**
   - Přidání dalších typů limitů
   
3. **Per-user limity**
   - Omezení kolikrát může jeden uživatel chatovat
   
4. **Rate limiting**
   - Omezení počtu zpráv za minutu/hodinu
   
5. **Cost tracking**
   - Sledování skutečných nákladů na tokeny
   - Propojení s OpenAI/Anthropic API usage

6. **Dashboard grafy**
   - Vizualizace využití limitů
   - Predikce dosažení limitu

---

**Autor:** Petr Hajduk  
**Datum:** 2026-01-30  
**Verze:** 1.0
