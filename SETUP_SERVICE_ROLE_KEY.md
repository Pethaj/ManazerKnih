# 🔐 Setup Service Role Key

## 🎯 Proč potřebuješ Service Role Key?

Pro admin operace (UPDATE, INSERT, DELETE na `chatbot_settings`) potřebuješ **service_role_key**, který obchází RLS (Row Level Security) politiky.

Běžný **anon key** nemá oprávnění upravovat chatbot nastavení kvůli RLS.

## 📝 Kde najdeš Service Role Key

### Krok 1: Otevři Supabase Dashboard
1. Přejdi na: https://supabase.com/dashboard
2. Vyber projekt: **modopafybeslbcqjxsve**

### Krok 2: Najdi API klíče
1. Klikni na **Settings** (⚙️) v levém menu
2. Vyber **API**
3. Najdi sekci **Project API keys**

### Krok 3: Zkopíruj Service Role Key
Najdeš zde 2 klíče:

| Klíč | Použití | Oprávnění |
|------|---------|-----------|
| **anon** (public) | Frontend, veřejné operace | Omezená (respektuje RLS) |
| **service_role** (secret) | Backend, admin operace | **Plná (obchází RLS)** ⭐ |

**Zkopíruj klíč `service_role`** - začíná `eyJhbGci...`

### Krok 4: Přidej do .env souboru

Vytvoř soubor `.env` v root složce projektu:

```bash
# .env
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...tvůj_skutečný_klíč
```

Nebo aktualizuj existující `.env` soubor a přidej tento řádek.

### Krok 5: Restart dev serveru

```bash
# Zastav server (Ctrl+C)
# Spusť znovu
npm run dev
```

## ✅ Verifikace

Po restartu by v console mělo být:

```
✅ Chatbot existuje, provádím UPDATE s admin klientem...
✅ UPDATE proběhl úspěšně s admin klientem, vráceno řádků: 1
✅ Nastavení úspěšně uloženo
```

## 🔍 Troubleshooting

### Problém 1: Klíč se nenačítá

**Příčina:** Vite nenačetl nové environment proměnné

**Řešení:**
```bash
# Zastav server (Ctrl+C)
rm -rf node_modules/.vite  # Vyčisti cache
npm run dev  # Spusť znovu
```

### Problém 2: Stále RLS chyba

**Kontrola 1:** Zkontroluj, že klíč je správně v `.env`:
```bash
cat .env | grep SERVICE_ROLE_KEY
```

**Kontrola 2:** Zkontroluj v kódu:
```typescript
// V supabaseAdmin.ts by mělo být:
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
```

**Kontrola 3:** Ověř v browser console:
```javascript
console.log('Service role key:', import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) + '...');
// Mělo by ukázat začátek klíče
```

### Problém 3: Klíč je undefined

**Možná příčina:** Špatný název proměnné

**Řešení:** Zkus všechny varianty v `supabaseAdmin.ts`:
```typescript
const supabaseServiceRoleKey = 
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY  // Vite
  || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY   // Node
  || 'TVŮJ_KLÍČ_PŘÍMO_ZDE_PRO_TEST';  // Fallback (pro test)
```

## ⚠️ Bezpečnost

### ❌ NIKDY nedělej:
- Necommituj `.env` do gitu
- Nesdílej service_role_key veřejně
- Nepoužívej service_role_key na frontendu v produkci

### ✅ Doporučení:
- `.env` by měl být v `.gitignore`
- Použij service_role_key pouze pro admin operace
- V produkci použij backend API endpoint místo přímého volání

## 📁 Soubory

```
app/
├── .env                      ← Přidej sem service_role_key
├── .env.example              ← Šablona (bez skutečných hodnot)
├── src/
│   └── lib/
│       ├── supabase.ts       ← Běžný klient (anon key)
│       └── supabaseAdmin.ts  ← Admin klient (service_role key) ⭐
```

## 🎯 Shrnutí

1. ✅ Otevři Supabase Dashboard → Settings → API
2. ✅ Zkopíruj **service_role** key
3. ✅ Přidej do `.env`: `VITE_SUPABASE_SERVICE_ROLE_KEY=tvůj_klíč`
4. ✅ Restart dev serveru
5. ✅ Zkus uložit nastavení chatbota

---

**Vytvořeno:** 2025-11-26  
**Pro projekt:** Manažer Knih  
**Supabase projekt:** modopafybeslbcqjxsve

