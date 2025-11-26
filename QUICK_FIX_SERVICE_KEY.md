# ⚡ QUICK FIX: Service Role Key Setup (2 minuty)

## 🎯 Co je problém

Aplikace používá **anon key** (veřejný klíč), který nemá oprávnění upravovat `chatbot_settings` kvůli RLS politikám.

Vytvořil jsem nový **admin klient** který používá **service_role_key** a obchází RLS.

## ✅ Řešení (3 kroky)

### 1️⃣ Získej Service Role Key

**Otevři:** https://supabase.com/dashboard  
**Vyber projekt:** modopafybeslbcqjxsve  
**Přejdi na:** Settings → API  
**Zkopíruj:** **service_role** key (začíná `eyJhbGci...`)

### 2️⃣ Vytvoř `.env` soubor

V root složce projektu vytvoř soubor `.env` (pokud neexistuje):

```bash
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...TVŮJ_SKUTEČNÝ_SERVICE_ROLE_KEY
```

**Alternativa:** Vlož klíč přímo do `supabaseAdmin.ts` (řádek 17):
```typescript
const supabaseServiceRoleKey = 'eyJhbGci...TVŮJ_KLÍČ';
```

### 3️⃣ Restart dev serveru

```bash
# Zastav server (Ctrl+C)
npm run dev
```

## ✅ Hotovo!

Zkus znovu uložit nastavení chatbota. Mělo by fungovat! 🎉

**V console uvidíš:**
```
✅ Chatbot existuje, provádím UPDATE s admin klientem...
✅ UPDATE proběhl úspěšně s admin klientem, vráceno řádků: 1
✅ Nastavení úspěšně uloženo
```

---

**Detailní návod:** [SETUP_SERVICE_ROLE_KEY.md](./SETUP_SERVICE_ROLE_KEY.md)

