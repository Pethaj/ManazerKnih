# ✅ HOTOVO: AUTOMATICKÉ POČÍTÁNÍ ZPRÁV

## 🎯 JEDNODUCHÉ ŘEŠENÍ - DATABASE TRIGGER

Vytvořil jsem **automatický trigger** v databázi, který počítá zprávy **BEZ JAKÉKOLIV INTEGRACE**!

## 🔧 Co jsem udělal:

### 1️⃣ Database Trigger
```sql
CREATE TRIGGER trigger_auto_count_messages
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION auto_count_messages();
```

**Jak to funguje:**
- ✅ Při každém INSERT do `chat_messages` se automaticky spustí funkce
- ✅ Funkce přičte +1 k `current_count` v `message_limits`
- ✅ Počítá globální i individuální limity SOUČASNĚ
- ✅ Pokud limit neexistuje, automaticky ho vytvoří

### 2️⃣ Přepočítání starých zpráv
```sql
-- Přepočítal jsem tvé 3 staré zprávy z vany_chat
UPDATE message_limits SET current_count = (počet zpráv dnes)
```

## ✅ VÝSLEDEK:

```
chatbot_id  | daily_limit | current_count
------------+-------------+--------------
NULL        | 2           | 3            ← Globální: 3 zprávy
vany_chat   | NULL        | 3            ← vany_chat: 3 zprávy
```

**Tvé 3 zprávy jsou teď ZAPOČÍTÁNY!** ✅

## 🧪 TEST:

Zkus poslat další zprávu přes widget:
1. Otevři widget
2. Pošli zprávu
3. Zkontroluj Dashboard → mělo by být `current_count = 4`

## 🚫 Jak blokovat zprávy při dosažení limitu?

**MOMENTÁLNĚ:**
- ✅ Zprávy se POČÍTAJÍ automaticky
- ❌ NEBLOKUJÍ se při dosažení limitu

**Pokud chceš BLOKOVAT zprávy:**

### Varianta A: Check před voláním AI (doporučeno)
V n8n workflow přidej na začátek:

```javascript
// N8N Function node
const chatbotId = $json.chatbot_id;

// Zavolej Supabase
const { data } = await $http.request({
  url: 'https://modopafybeslbcqjxsve.supabase.co/rest/v1/message_limits',
  headers: {
    'apikey': 'YOUR_ANON_KEY'
  },
  qs: {
    select: 'daily_limit,current_count',
    chatbot_id: `eq.${chatbotId}`
  }
});

// Zkontroluj limit
if (data[0].daily_limit && data[0].current_count >= data[0].daily_limit) {
  return {
    blocked: true,
    message: "Omlouváme se, ale denní počet zpráv je již vyčerpán. Nový limit bude dnes od 0:00."
  };
}

// Pokračuj normálně
return { blocked: false };
```

### Varianta B: Database Constraint (advanced)
Přidám CHECK constraint přímo do databáze, který zakáže INSERT pokud je limit dosažen.

**Chceš to?** Řekni mi a udělám to!

## 📊 Monitoring:

**Dashboard** ti teď ukazuje správné počty:
- Globální limit: 3/2 (PŘEKROČEN! 🔴)
- vany_chat: 3/∞ (bez limitu)

## 🔄 Daily Reset:

Nezapomeň nastavit **cron job** pro reset o půlnoci:
```bash
# V Supabase Dashboard → SQL Editor
# Spusť denně o půlnoci CET
SELECT reset_all_message_limits();
```

Nebo použij Supabase Edge Function `reset-message-limits-cron` s pg_cron.

---

## 🎉 SHRNUTÍ:

✅ **HOTOVO:** Zprávy se počítají automaticky  
✅ **HOTOVO:** Tvé 3 zprávy jsou započítány  
✅ **HOTOVO:** Globální i individuální limity  
⏳ **VOLITELNÉ:** Blokování při dosažení limitu (vyžaduje check v n8n)  
⏳ **VOLITELNÉ:** Daily reset (vyžaduje cron job)  

**Žádné složité integrace! Prostě trigger v databázi!** 🚀
