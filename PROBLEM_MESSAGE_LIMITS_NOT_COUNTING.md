# ⚠️ PROBLÉM: Message Limity se NEPOČÍTAJÍ

## 🐛 Zjištěný problém:

### Pomocí MCP jsem zjistil:

1. ✅ **3 zprávy byly odeslány** do `vany_chat`:
   ```
   id: 875efe36-98ad-44b7-8175-4fb4f73a0de2 | 08:48:52 | "a co bolest zubu"
   id: b0802451-a886-40c6-8c26-dca53f3bb024 | 08:48:12 | "a co na bolest menstruace"
   id: 975e8169-ab1c-4751-8656-3a810cf277f7 | 08:47:04 | "jake jsou wany na bolest hlavy"
   ```

2. ❌ **Limity se NEPOČÍTAJÍ**:
   ```
   chatbot_id: NULL (globální)
   daily_limit: 2
   current_count: 0  ← PROBLÉM! Mělo by být 3!
   ```

3. ❌ **Žádný limit pro `vany_chat` neexistuje** v tabulce `message_limits`

## 🔍 Analýza příčiny:

### Systém limitů NENÍ INTEGROVÁN!

**Co funguje:**
- ✅ Tabulka `message_limits` existuje
- ✅ RLS politiky jsou správně nastavené
- ✅ Edge Function `check-message-limit` existuje
- ✅ Frontend komponenty (Dashboard) fungují

**Co NEFUNGUJE:**
- ❌ **Nikdo nevolá `check-message-limit` Edge Function**
- ❌ **Zprávy se ukládají, ale nepočítají**
- ❌ **Increment se nedělá**

## 📝 Co je potřeba udělat:

### 1. Najít místo kde se zprávy posílají

Zprávy jdou přes **webhook** (n8n) do tvého systému. Potřebuješ najít:
- **n8n workflow** který přijímá zprávy z widgetu
- **NEBO Backend endpoint** který zpracovává chat zprávy

### 2. Přidat checking limitů PŘED voláním AI

**Před** tím, než se zpráva pošle do AI, musíš zavolat:

```typescript
// PŘED voláním AI - zkontroluj limit
const checkResult = await fetch(
  `${supabaseUrl}/functions/v1/check-message-limit`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`
    },
    body: JSON.stringify({
      chatbot_id: 'vany_chat',  // nebo odkudkoli bereš chatbot_id
      action: 'check'
    })
  }
);

const limitData = await checkResult.json();

// Pokud je limit vyčerpán, ZASTAV a vrať chybovou hlášku
if (!limitData.allowed) {
  return {
    message: "Omlouváme se, ale denní počet zpráv je již vyčerpán. Nový limit bude dnes od 0:00."
  };
}
```

### 3. Přidat increment AFTER úspěšné AI odpovědi

**Po** tom, co AI odpoví, musíš zavolat:

```typescript
// AFTER úspěšné AI odpovědi - increment limit
await fetch(
  `${supabaseUrl}/functions/v1/check-message-limit`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`
    },
    body: JSON.stringify({
      chatbot_id: 'vany_chat',
      action: 'increment'
    })
  }
);
```

## 🔧 Kde to implementovat?

### Varianta A: V n8n workflow

Pokud používáš **n8n** pro zpracování zpráv:

1. **Před** HTTP Request do AI:
   - Přidat HTTP Request node → `check-message-limit` (action: check)
   - Přidat IF node → pokud `allowed = false`, vrátit error message
   
2. **Po** úspěšné AI odpovědi:
   - Přidat HTTP Request node → `check-message-limit` (action: increment)

### Varianta B: V Edge Function

Pokud máš vlastní **Edge Function** pro chat:

```typescript
// supabase/functions/chat/index.ts (nebo podobně)
Deno.serve(async (req: Request) => {
  const { message, chatbot_id, session_id } = await req.json();
  
  // 1️⃣ CHECK LIMIT
  const checkResponse = await fetch(
    `${SUPABASE_URL}/functions/v1/check-message-limit`,
    {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ chatbot_id, action: 'check' })
    }
  );
  
  const limitCheck = await checkResponse.json();
  
  if (!limitCheck.allowed) {
    return new Response(
      JSON.stringify({
        error: "Omlouváme se, ale denní počet zpráv je již vyčerpán. Nový limit bude dnes od 0:00."
      }),
      { status: 429 }
    );
  }
  
  // 2️⃣ VOLEJ AI
  const aiResponse = await callAI(message, chatbot_id);
  
  // 3️⃣ INCREMENT LIMIT
  await fetch(
    `${SUPABASE_URL}/functions/v1/check-message-limit`,
    {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ chatbot_id, action: 'increment' })
    }
  );
  
  return new Response(JSON.stringify(aiResponse));
});
```

## 📋 Kontrolní seznam:

- [ ] Najít kde se zprávy posílají (n8n workflow / Edge Function)
- [ ] Přidat `check` PŘED voláním AI
- [ ] Přidat `increment` AFTER úspěšné AI odpovědi
- [ ] Otestovat že se `current_count` zvyšuje
- [ ] Otestovat že se při dosažení limitu vrací error message

## 🧪 Jak otestovat:

1. Nastav globální limit na **5** v Dashboard
2. Pošli **3 zprávy** přes widget
3. Zkontroluj v databázi:
   ```sql
   SELECT chatbot_id, current_count FROM message_limits;
   ```
   **Očekávaný výsledek:** `current_count = 3`

4. Pošli další **3 zprávy**
5. Po 5. zprávě by měla přijít chybová hláška

---

**Status:** ⚠️ VYŽADUJE INTEGRACI  
**Příčina:** Limit systém není zapojen do chat flow  
**Řešení:** Přidat check + increment do webhook/edge function
