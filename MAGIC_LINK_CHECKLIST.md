# ✅ Magic Link - Checklist opravy

## 🎯 Problém
Magic link hlásí "nedostupnou stránku" → vede na Supabase backend místo na aplikaci

## 🔧 Oprava (2 kroky)

### ✅ Krok 1: Kód (HOTOVO)
```typescript
// src/services/authService.ts - již opraveno
emailRedirectTo: window.location.origin // ← Přidáno
```

### ⚠️ Krok 2: Supabase Dashboard (NUTNÉ UDĚLAT)

**LINK:** https://supabase.com/dashboard/project/modopafybeslbcqjxsve/auth/url-configuration

**PŘIDAT do "Redirect URLs":**
```
http://localhost:3000
http://localhost:5173
```

**Pro produkci přidat:**
```
https://vase-domena.cz
```

**Kliknout: Save**

## 🧪 Test

1. Spustit: `npm run dev`
2. Otevřít: http://localhost:3000
3. Zadat email
4. Kliknout: "Zapomněli jste heslo?"
5. Zkontrolovat email
6. Kliknout na magic link
7. ✅ Měli byste být přihlášeni

## 📊 Status

| Komponenta | Status | Popis |
|------------|--------|-------|
| authService.ts | ✅ Opraveno | Přidán `emailRedirectTo` |
| supabase.ts | ✅ OK | `detectSessionInUrl: true` |
| Supabase Dashboard | ⚠️ **AKCE NUTNÁ** | Přidat redirect URLs |
| Email templates | ✅ OK | Fungují default templates |

## 🚀 Po opravě

Magic link bude fungovat takto:

```
1. Uživatel → zadá email
2. Aplikace → pošle request s redirect_to=http://localhost:3000
3. Supabase → pošle email s magic link
4. Uživatel → klikne na link
5. Supabase → ověří token → přesměruje na http://localhost:3000
6. Aplikace → automaticky přihlásí uživatele
7. ✅ Hotovo!
```

## 📚 Dokumentace

- **RYCHLA_OPRAVA_MAGIC_LINK.md** - Stručný průvodce
- **MAGIC_LINK_FIX.md** - Detailní dokumentace
- **MAGIC_LINK_DIAGRAM.md** - Vizuální diagram flow
- **check_magic_link_config.sql** - SQL diagnostika

## ⚠️ Důležité poznámky

1. ❌ **NEPOUŽÍVEJTE** magic link z Supabase dashboardu
   - Dashboard posílá linky ve starém formátu
   - Použijte magic link z aplikace

2. ✅ **OVĚŘTE** že URL je v dashboardu
   - Bez toho to nebude fungovat
   - Supabase kontroluje whitelist

3. 🕐 **Token platnost:** 1 hodina
   - Po expiraci je potřeba nový link

4. 🔄 **PKCE flow** je aktivní
   - Používá `token_hash` místo `token`
   - Bezpečnější než implicit flow

## 🆘 Pokud to nefunguje

1. Otevřít DevTools (F12)
2. Spustit v konzoli:
   ```javascript
   supabase.auth.getSession().then(console.log)
   ```
3. Pokud vidíte `session: null` → token nebyl zpracován
4. Zkontrolovat URL po přesměrování:
   - Měla by obsahovat: `#access_token=...`
   - Pokud ne → redirect URL není v dashboardu

## 📞 Support

Pokud problém přetrvává:
1. Zkontrolujte SQL: `check_magic_link_config.sql`
2. Přečtěte: `MAGIC_LINK_FIX.md`
3. Spusťte debug skripty z `MAGIC_LINK_DIAGRAM.md`

---

**TL;DR:** Kód je opraven ✅ Stačí přidat URL do Supabase dashboardu ⚠️

