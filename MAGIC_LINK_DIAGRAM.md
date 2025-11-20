# 🔐 Magic Link Flow - Jak to funguje

## 📊 Vizuální diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MAGIC LINK AUTHENTICATION FLOW                    │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   UŽIVATEL   │
│  (Browser)   │
└──────┬───────┘
       │
       │ 1. Zadá email + klikne "Zapomněli jste heslo?"
       │
       ▼
┌──────────────────────────────────────────┐
│   LoginForm.tsx                          │
│   → handleMagicLink()                    │
└──────┬───────────────────────────────────┘
       │
       │ 2. Volá authService.sendMagicLink(email)
       │
       ▼
┌──────────────────────────────────────────┐
│   authService.ts                         │
│   → sendMagicLink()                      │
│                                          │
│   supabase.auth.signInWithOtp({         │
│     email: email,                        │
│     options: {                           │
│       emailRedirectTo: window.location.origin  ← KLÍČOVÉ!
│     }                                    │
│   })                                     │
└──────┬───────────────────────────────────┘
       │
       │ 3. HTTP POST request
       │
       ▼
┌──────────────────────────────────────────┐
│   SUPABASE AUTH API                      │
│   POST /auth/v1/otp                      │
│                                          │
│   Body:                                  │
│   {                                      │
│     "email": "user@example.com",         │
│     "create_user": false,                │
│     "gotrue_meta_security": {            │
│       "redirect_to": "http://localhost:3000"  ← Kontroluje whitelist
│     }                                    │
│   }                                      │
└──────┬───────────────────────────────────┘
       │
       │ 4. Kontrola: Je redirect_to v povolených URL?
       │    (Dashboard → Auth → URL Configuration → Redirect URLs)
       │
       ├─ ❌ Není → CHYBA: "redirect_to not allowed"
       │
       └─ ✅ Je → Pokračuje...
              │
              ▼
       ┌──────────────────────────────────────────┐
       │   SUPABASE MAILER                        │
       │   Vygeneruje token_hash                  │
       │   Pošle email s linkem:                  │
       │                                          │
       │   https://modopafybeslbcqjxsve           │
       │     .supabase.co/auth/v1/verify          │
       │     ?token_hash=abc123def456             │  ← PKCE token
       │     &type=magiclink                      │
       │     &redirect_to=http://localhost:3000   │
       └──────┬───────────────────────────────────┘
              │
              │ 5. Email dorazí uživateli
              │
              ▼
       ┌──────────────────────────────────────────┐
       │   📧 EMAIL INBOX                         │
       │                                          │
       │   Subject: Magic Link                    │
       │                                          │
       │   [Přihlásit se] ← Link                  │
       └──────┬───────────────────────────────────┘
              │
              │ 6. Uživatel klikne na link
              │
              ▼
       ┌──────────────────────────────────────────┐
       │   SUPABASE AUTH API                      │
       │   GET /auth/v1/verify                    │
       │                                          │
       │   Parametry:                             │
       │   - token_hash: abc123def456             │
       │   - type: magiclink                      │
       │   - redirect_to: http://localhost:3000   │
       └──────┬───────────────────────────────────┘
              │
              │ 7. Ověří token_hash
              │
              ├─ ❌ Neplatný/expirovaný → Error page
              │
              └─ ✅ Platný → Vytvoří session
                     │
                     ▼
              ┌──────────────────────────────────────────┐
              │   HTTP 302 REDIRECT                      │
              │                                          │
              │   Location: http://localhost:3000        │
              │     #access_token=eyJhbG...              │  ← JWT token
              │     &refresh_token=v1.Mw...              │
              │     &expires_in=3600                     │
              │     &token_type=bearer                   │
              │     &type=magiclink                      │
              └──────┬───────────────────────────────────┘
                     │
                     │ 8. Browser přesměrován na aplikaci
                     │
                     ▼
              ┌──────────────────────────────────────────┐
              │   APLIKACE (http://localhost:3000)       │
              │                                          │
              │   URL hash obsahuje:                     │
              │   #access_token=...&refresh_token=...    │
              └──────┬───────────────────────────────────┘
                     │
                     │ 9. supabase client (detectSessionInUrl: true)
                     │    automaticky zpracuje hash
                     │
                     ▼
              ┌──────────────────────────────────────────┐
              │   supabase.auth.getSession()             │
              │                                          │
              │   {                                      │
              │     session: {                           │
              │       access_token: "...",               │
              │       user: {                            │
              │         email: "user@example.com",       │
              │         id: "..."                        │
              │       }                                  │
              │     }                                    │
              │   }                                      │
              └──────┬───────────────────────────────────┘
                     │
                     │ 10. Session uložena do localStorage
                     │
                     ▼
              ┌──────────────────────────────────────────┐
              │   ✅ UŽIVATEL PŘIHLÁŠEN                  │
              │                                          │
              │   main.tsx → setUser(authUser)           │
              │   → zobrazí hlavní aplikaci              │
              └──────────────────────────────────────────┘
```

## 🔑 Klíčové komponenty

### 1. emailRedirectTo
```typescript
// authService.ts
emailRedirectTo: window.location.origin
```
**Účel:** Říká Supabase, kam má přesměrovat po ověření tokenu

**Důležité:** Tato URL MUSÍ být v whitelistu v Supabase Dashboard!

### 2. detectSessionInUrl
```typescript
// supabase.ts
createClient(url, key, {
  auth: {
    detectSessionInUrl: true  // ← Automaticky zpracuje #access_token=...
  }
})
```
**Účel:** Automaticky parsuje URL hash a vytvoří session

### 3. flowType: 'pkce'
```typescript
// supabase.ts
flowType: 'pkce'  // Proof Key for Code Exchange
```
**Účel:** Bezpečnější flow - používá `token_hash` místo `token`

## ⚠️ Běžné problémy

### Problem 1: "redirect_to not allowed"
```
❌ Error: redirect_to URL not allowed
```

**Řešení:**
1. Přejděte na: Dashboard → Auth → URL Configuration
2. Přidejte URL do "Redirect URLs":
   ```
   http://localhost:3000
   http://localhost:5173
   https://vase-domena.cz
   ```
3. Save

### Problem 2: "Page not found" na Supabase URL
```
URL: https://modopafybeslbcqjxsve.supabase.co/auth/v1/verify?...
Výsledek: 404 Not Found
```

**Příčina:** Chybí `emailRedirectTo` v kódu

**Řešení:** Přidejte `emailRedirectTo` do `signInWithOtp` (již opraveno)

### Problem 3: Session se nevytvoří
```javascript
supabase.auth.getSession() // → { session: null }
```

**Příčina 1:** `detectSessionInUrl: false` nebo chybí
**Řešení:** Nastavte `detectSessionInUrl: true` v supabase.ts

**Příčina 2:** URL hash neobsahuje `access_token`
**Řešení:** Zkontrolujte URL po přesměrování - měla by vypadat:
```
http://localhost:3000/#access_token=...&refresh_token=...
```

### Problem 4: Link expiroval
```
❌ Token has expired or is invalid
```

**Příčina:** Magic link je platný pouze 1 hodinu

**Řešení:** Požádejte o nový magic link

## 🔬 Debugging

### Debug 1: Zkontrolovat session
```javascript
// DevTools Console
const { data } = await supabase.auth.getSession()
console.log('Session:', data.session)
```

### Debug 2: Zkontrolovat URL hash
```javascript
// DevTools Console
console.log('Hash:', window.location.hash)
// Očekáváno: #access_token=...&refresh_token=...
```

### Debug 3: Zkontrolovat localStorage
```javascript
// DevTools Console
const key = `sb-modopafybeslbcqjxsve-auth-token`
const session = localStorage.getItem(key)
console.log('Stored session:', JSON.parse(session))
```

### Debug 4: Monitor auth state changes
```javascript
// Přidejte do main.tsx
supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth event:', event)
    console.log('Session:', session)
})
```

## 📝 Časová osa tokenů

```
Magic Link Token:
├─ Platnost: 1 hodina
├─ Typ: token_hash (PKCE) nebo token (implicit)
└─ Použití: Jednorázové

Access Token (JWT):
├─ Platnost: 1 hodina (3600s)
├─ Typ: Bearer token
├─ Uložení: localStorage
└─ Auto-refresh: Ano (pokud refresh_token platný)

Refresh Token:
├─ Platnost: 30 dní (default)
├─ Uložení: localStorage
└─ Použití: Obnovení access_token
```

## 🎯 Shrnutí

1. ✅ Kód opraven - přidán `emailRedirectTo`
2. ⚠️ **AKCE POTŘEBA:** Přidat URL do Supabase Dashboard
3. ✅ `detectSessionInUrl: true` již nastaveno
4. ✅ PKCE flow aktivní

**Další krok:** Přejděte do Supabase Dashboard a přidejte redirect URLs!

