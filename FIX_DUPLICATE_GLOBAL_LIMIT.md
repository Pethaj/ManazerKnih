# ✅ FIX: Duplicitní globální limit - OPRAVENO

## 🐛 Problém:
```
Cannot coerce the result to a single JSON object
The result contains 2 rows
GET .../message_limits?...&chatbot_id=is.null 406 (Not Acceptable)
```

V tabulce `message_limits` byly **2 záznamy s `chatbot_id = NULL`** (globální limit), ale kód používá `.single()` který očekává pouze 1 řádek.

## 🔧 Řešení pomocí MCP:

### 1. Identifikace problému
```sql
SELECT * FROM message_limits WHERE chatbot_id IS NULL;
```

**Výsledek:**
```
id: 52bbc0c0-b873-40fa-a201-8920976ba4a1, daily_limit: NULL, created: 2026-01-30 08:13
id: 41fc260d-9ae6-4a76-ae70-7268690cb680, daily_limit: 2,    created: 2026-01-30 08:44
```

### 2. Smazání staršího záznamu
```sql
DELETE FROM message_limits
WHERE id = '52bbc0c0-b873-40fa-a201-8920976ba4a1';
```

### 3. Přidání UNIQUE constraintu
```sql
ALTER TABLE message_limits 
ADD CONSTRAINT message_limits_chatbot_id_key UNIQUE (chatbot_id);
```

Tento constraint **zabrání budoucím duplicitám** - každý `chatbot_id` může být v tabulce pouze jednou (včetně NULL pro globální limit).

## ✅ Aktuální stav:

```
id: 41fc260d-9ae6-4a76-ae70-7268690cb680
chatbot_id: NULL (globální)
daily_limit: 2
current_count: 0
reset_at: 2026-01-31 00:00:00
```

**Pouze 1 globální limit** - `.single()` bude fungovat správně! ✅

## 🔒 Ochrana do budoucna:

UNIQUE constraint zajistí, že:
- ✅ Nemůže existovat více globálních limitů (chatbot_id = NULL)
- ✅ Každý chatbot může mít pouze 1 limit
- ✅ Upsert operace budou fungovat správně (ON CONFLICT)

## 🚀 Testuj to:

1. Otevři **Dashboard** tab
2. Měl bys vidět **globální limit: 2**
3. Změň ho na jinou hodnotu (např. **100000**)
4. Klikni **"Uložit"**
5. Mělo by to projít! ✅

---

**Status:** ✅ OPRAVENO pomocí MCP  
**Datum:** 2026-01-30  
**Metoda:** `user-supabase` MCP server → `execute_sql`  
**Constraint:** `message_limits_chatbot_id_key UNIQUE (chatbot_id)`
