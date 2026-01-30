# ✅ Systém denních limitů zpráv - IMPLEMENTOVÁNO

## 🎯 Co bylo vytvořeno

Kompletní systém pro sledování a omezování denních limitů zpráv v chatbotech.

---

## 📦 Vytvořené soubory a komponenty

### 1. 🗄️ Databáze

**Tabulka:** `message_limits`

```sql
CREATE TABLE message_limits (
  id UUID PRIMARY KEY,
  chatbot_id TEXT,              -- NULL = globální limit
  daily_limit INTEGER,          -- NULL = bez limitu
  current_count INTEGER,        -- Aktuální počet zpráv dnes
  reset_at TIMESTAMPTZ,         -- Čas příštího resetu (půlnoc CET)
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(chatbot_id)
)
```

**Funkce:**
- `increment_message_count(limit_id)` - Atomické zvýšení čítače
- `reset_all_message_limits()` - Resetování všech čítačů

**Status:** ✅ Vytvořeno a nasazeno do Supabase

---

### 2. ⚡ Edge Functions

#### `check-message-limit`

**URL:** `https://modopafybeslbcqjxsve.supabase.co/functions/v1/check-message-limit`

**Účel:** Kontrola limitů před odesláním zprávy a inkrementace po úspěchu

**Request:**
```json
{
  "chatbot_id": "chatbot-id",
  "action": "check" | "increment"
}
```

**Response (povoleno):**
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
  "reset_at": "2026-01-31T00:00:00Z"
}
```

**Status:** ✅ Deploynutá do Supabase

---

#### `reset-message-limits-cron`

**URL:** `https://modopafybeslbcqjxsve.supabase.co/functions/v1/reset-message-limits-cron`

**Účel:** Denní reset všech čítačů zpráv o půlnoci CET

**Authorization:** Vyžaduje Service Role Key

**Response:**
```json
{
  "success": true,
  "message": "Message limits reset completed",
  "total_limits": 2,
  "limits": [...]
}
```

**Status:** ✅ Deploynutá do Supabase

---

### 3. 📚 TypeScript knihovna

**Soubor:** `/src/lib/message-limits.ts`

**Exportované funkce:**

```typescript
// Kontrola limitu před odesláním
checkMessageLimit(chatbotId: string): Promise<LimitCheckResult>

// Inkrementace po úspěchu
incrementMessageCount(chatbotId: string): Promise<void>

// Načtení limitů
getChatbotLimit(supabase, chatbotId): Promise<MessageLimit | null>
getGlobalLimit(supabase): Promise<MessageLimit | null>

// Nastavení limitů
setChatbotLimit(supabase, chatbotId, limit): Promise<boolean>
setGlobalLimit(supabase, limit): Promise<boolean>

// Pomocné funkce
formatResetTime(resetAt: string): string
calculateLimitPercentage(current, limit): number
getLimitStatusColor(percentage): string
```

**Status:** ✅ Vytvořeno

---

### 4. 📖 Dokumentace

**Vytvořené soubory:**

1. **`MESSAGE_LIMITS_SYSTEM.md`** - Kompletní technická dokumentace
   - Architektura systému
   - API reference
   - Použití v kódu
   - UI komponenty
   - FAQ

2. **`SETUP_MESSAGE_LIMITS_CRON.md`** - Návod na nastavení cron jobu
   - pg_cron v Supabase (doporučeno)
   - GitHub Actions alternativa
   - Vercel Cron alternativa
   - Testování a troubleshooting

3. **`EXAMPLE-chat-api-integration.ts`** - Příklady integrace
   - API endpoint pro chat
   - React komponenty
   - Admin panel nastavení

**Status:** ✅ Vytvořeno

---

## 🚀 Co je potřeba udělat dál (Implementace)

### ✅ Hotovo (již implementováno)

- [x] Databázová tabulka a funkce
- [x] Edge Functions deploynuté
- [x] TypeScript helper knihovna
- [x] Kompletní dokumentace

### 📝 TODO (pro plnou funkčnost)

#### 1. Integrace do chat API

**Soubor:** Tvůj existující chat API endpoint (např. `/api/chat/send`)

**Co přidat:**

```typescript
import { checkMessageLimit, incrementMessageCount } from '@/lib/message-limits'

// PŘED ODESLÁNÍM ZPRÁVY
const limitCheck = await checkMessageLimit(chatbot_id)
if (!limitCheck.allowed) {
  return Response.json({
    error: limitCheck.reason,
    message: limitCheck.message,
    reset_at: limitCheck.reset_at
  }, { status: 429 })
}

// ... odeslání zprávy do AI ...

// PO ÚSPĚCHU
await incrementMessageCount(chatbot_id)
```

**Odhadovaný čas:** 15-30 minut

---

#### 2. UI v administraci - Nastavení limitů

**Kde:** Admin panel pro správu chatbotů

**Co vytvořit:** Komponenta pro nastavení denního limitu

```tsx
<div className="space-y-4">
  <h3>Denní limit zpráv</h3>
  
  <input
    type="number"
    placeholder="Např. 5000 (prázdné = bez limitu)"
    value={limit ?? ''}
    onChange={e => setLimit(e.target.value ? parseInt(e.target.value) : null)}
  />
  
  <div className="bg-gray-50 p-4 rounded">
    <p>Aktuální využití: {current} / {limit ?? '∞'}</p>
    {/* Progress bar */}
  </div>
  
  <button onClick={saveLimit}>Uložit</button>
</div>
```

**Odhadovaný čas:** 30-60 minut

---

#### 3. UI v chatu - Hláška při dosažení limitu

**Kde:** Chat widget komponenta

**Co přidat:**

```tsx
if (isLimitExceeded) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center p-8 bg-white rounded-2xl shadow-lg">
        <div className="text-5xl mb-4">⏰</div>
        <h3 className="text-xl font-semibold mb-2">
          Denní limit zpráv dosažen
        </h3>
        <p className="text-gray-600 mb-4">
          Omlouváme se, ale denní limit zpráv pro tento chat byl dosažen.
          Chat bude opět dostupný od půlnoci.
        </p>
        <p className="text-sm text-gray-500">
          Reset {formatResetTime(resetAt)}
        </p>
      </div>
    </div>
  )
}
```

**Odhadovaný čas:** 20-30 minut

---

#### 4. Nastavení Cron Jobu

**Možnost A: Supabase pg_cron (doporučeno)**

1. Otevři Supabase Dashboard → SQL Editor
2. Spusť SQL z dokumentace (`SETUP_MESSAGE_LIMITS_CRON.md`)
3. Otestuj manuálním zavoláním

**Odhadovaný čas:** 10 minut

**Možnost B: GitHub Actions**

1. Vytvoř `.github/workflows/reset-limits.yml`
2. Nastav secret s Service Role Key
3. Otestuj manuálním spuštěním

**Odhadovaný čas:** 15 minut

---

#### 5. Globální nastavení (volitelné)

**Kde:** Admin panel → Nastavení systému

**Co vytvořit:** Stránka pro nastavení globálního limitu

```tsx
<div>
  <h2>Globální denní limit zpráv</h2>
  <p>Limit platí napříč všemi chatboty</p>
  
  <input
    type="number"
    placeholder="Např. 100000"
    value={globalLimit ?? ''}
  />
  
  <button onClick={() => setGlobalLimit(supabase, globalLimit)}>
    Uložit globální limit
  </button>
</div>
```

**Odhadovaný čas:** 30 minut

---

#### 6. Dashboard a monitoring (volitelné)

**Kde:** Admin panel

**Co vytvořit:** Stránka s přehledem využití limitů

```tsx
<div className="grid gap-4">
  <Card title="Globální limit">
    <Progress value={globalUsage} />
    <p>{globalCurrent} / {globalLimit ?? '∞'}</p>
  </Card>
  
  {chatbots.map(bot => (
    <Card key={bot.id} title={bot.name}>
      <Progress value={bot.usage} />
      <p>{bot.current} / {bot.limit ?? '∞'}</p>
    </Card>
  ))}
</div>
```

**Odhadovaný čas:** 1-2 hodiny

---

## 🧪 Testování

### Test 1: Funkčnost Edge Functions

```bash
# Test check-message-limit
curl -X POST \
  https://modopafybeslbcqjxsve.supabase.co/functions/v1/check-message-limit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ANON_KEY" \
  -d '{"chatbot_id":"test-bot","action":"check"}'

# Test reset-message-limits-cron
curl -X POST \
  https://modopafybeslbcqjxsve.supabase.co/functions/v1/reset-message-limits-cron \
  -H "Authorization: Bearer SERVICE_ROLE_KEY"
```

### Test 2: Databáze

```sql
-- Vytvoř testovací limit
INSERT INTO message_limits (chatbot_id, daily_limit, current_count)
VALUES ('test-chatbot', 10, 0);

-- Simuluj odesílání zpráv (inkrementace)
SELECT increment_message_count(
  (SELECT id FROM message_limits WHERE chatbot_id = 'test-chatbot')
);

-- Zkontroluj stav
SELECT * FROM message_limits WHERE chatbot_id = 'test-chatbot';

-- Test resetu
SELECT reset_all_message_limits();
```

### Test 3: Integration test

1. Nastav limit na 3 zprávy pro testovací chatbot
2. Odešli 3 zprávy → mělo by projít
3. Odešli 4. zprávu → měla by být zamítnuta
4. Zavolej reset funkci
5. Odešli další zprávu → měla by projít

---

## 📊 Statistiky implementace

| Komponenta | Status | Čas na vytvoření |
|------------|--------|------------------|
| Databáze | ✅ Hotovo | - |
| Edge Functions | ✅ Hotovo | - |
| TypeScript lib | ✅ Hotovo | - |
| Dokumentace | ✅ Hotovo | - |
| Chat API integrace | ⏳ TODO | ~20 min |
| Admin UI - nastavení | ⏳ TODO | ~45 min |
| Chat UI - hláška | ⏳ TODO | ~25 min |
| Cron job setup | ⏳ TODO | ~10 min |
| Dashboard | 🔶 Optional | ~90 min |

**Celkový čas na dokončení:** ~2 hodiny (bez dashboardu)

---

## 🎓 Jak začít

### Rychlý start (minimální implementace):

1. **Integrace do chat API** (20 min)
   - Přidej kontrolu `checkMessageLimit()` před odesláním
   - Přidej `incrementMessageCount()` po úspěchu

2. **Nastavení cron jobu** (10 min)
   - Spusť SQL v Supabase Dashboard
   - Otestuj manuálním voláním

3. **UI pro nastavení limitu** (45 min)
   - Přidej input do admin panelu
   - Použij `setChatbotLimit()` pro uložení

4. **Hláška v chatu** (25 min)
   - Zkontroluj `limitCheck.allowed` před zobrazením chatu
   - Zobraz pěknou hlášku pokud je limit vyčerpán

**Total:** ~1.5 hodiny pro plně funkční systém! 🚀

---

## 🔗 Užitečné odkazy

- **Supabase Dashboard:** https://supabase.com/dashboard/project/modopafybeslbcqjxsve
- **Edge Functions:** https://supabase.com/dashboard/project/modopafybeslbcqjxsve/functions
- **Database:** https://supabase.com/dashboard/project/modopafybeslbcqjxsve/editor

---

## 📞 Support

Pokud narazíš na problém:

1. Zkontroluj logy Edge Function v Supabase Dashboard
2. Zkontroluj databázi pomocí SQL dotazů z dokumentace
3. Projdi troubleshooting sekci v `SETUP_MESSAGE_LIMITS_CRON.md`

---

**Vytvořeno:** 2026-01-30  
**Projekt:** Books (modopafybeslbcqjxsve)  
**Autor:** AI Assistant (Cursor)  
**Status:** ✅ Backend hotov, čeká na frontend implementaci
