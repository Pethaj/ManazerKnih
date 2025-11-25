# Oprava Magic Link - Nedostupná stránka

## Problém

Magic link poslaný z Supabase dashboardu používá URL:
```
https://modopafybeslbcqjxsve.supabase.co/auth/v1/verify?token=...&type=magiclink&redirect_to=http://localhost:3000
```

Tato URL vede na Supabase backend, ne na vaši aplikaci → hlásí "nedostupnou stránku".

## Příčina

1. ❌ **Chybějící redirect URL v konfiguraci** - `http://localhost:3000` není v povolených URL
2. ❌ **Nesprávné použití redirect_to** - parametr je v URL, ale není správně zpracován
3. ⚠️ **PKCE flow vyžaduje token_hash** - místo `token` by mělo být `token_hash`

## Řešení

### Krok 1: Nastavení Redirect URLs v Supabase Dashboard

1. Přejděte na: https://supabase.com/dashboard/project/modopafybeslbcqjxsve/auth/url-configuration
2. V sekci **"Redirect URLs"** přidejte:
   ```
   http://localhost:3000
   http://localhost:3000/
   http://localhost:5173
   http://localhost:5173/
   ```
3. Pro production pak přidejte i vaši produkční URL:
   ```
   https://vase-domena.cz
   https://vase-domena.cz/
   ```
4. Klikněte **Save**

### Krok 2: Aktualizace authService.ts

Upravte funkci `sendMagicLink` tak, aby správně nastavila redirect URL:

```typescript
export async function sendMagicLink(email: string): Promise<{ error: string | null }> {
    try {
        const { error } = await supabase.auth.signInWithOtp({
            email: email.toLowerCase(),
            options: {
                shouldCreateUser: false, // Nepovolíme vytvoření nového uživatele
                emailRedirectTo: window.location.origin // Přidáno: explicitní redirect na aplikaci
            }
        });

        if (error) {
            console.error('Chyba při odesílání magic link:', error);
            return { error: error.message };
        }

        console.log('✅ Magic link odeslán na:', email);
        return { error: null };
    } catch (err) {
        console.error('Neočekávaná chyba při odesílání magic link:', err);
        return { error: 'Neočekávaná chyba při odesílání emailu' };
    }
}
```

### Krok 3: Ověření Supabase konfigurace

Zkontrolujte nastavení v `/src/lib/supabase.ts`:

```typescript
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // ✅ Důležité pro zpracování magic linku
    flowType: 'pkce' // ✅ PKCE flow
  }
});
```

## Testování

### Test 1: Magic Link z aplikace

1. Otevřete aplikaci: http://localhost:3000
2. Na přihlašovací stránce zadejte email
3. Klikněte na "Zapomněli jste heslo? Pošleme vám magic link"
4. Zkontrolujte email
5. Klikněte na odkaz v emailu
6. Měli byste být automaticky přihlášeni

### Test 2: Magic Link z Supabase Dashboard

**POZNÁMKA:** Magic link z Supabase dashboardu nemusí fungovat správně, protože:
- Dashboard posílá link ve starém formátu (s `token` místo `token_hash`)
- Dashboard může použít jiný email template

**Doporučení:** Používejte magic link odeslaný přes aplikaci, ne z dashboardu.

## Alternativní řešení - Změna na implicitní flow

Pokud PKCE flow dělá problémy, můžete dočasně přepnout na implicitní flow:

```typescript
// src/lib/supabase.ts
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'implicit' // Změna z 'pkce' na 'implicit'
  }
});
```

**Výhody:**
- ✅ Jednodušší implementace
- ✅ Kompatibilní se starými linky

**Nevýhody:**
- ⚠️ Méně bezpečné než PKCE

## Jak to funguje

### PKCE Flow (aktuální nastavení)

1. Uživatel zadá email → odešle se OTP request
2. Supabase pošle email s linkem:
   ```
   https://modopafybeslbcqjxsve.supabase.co/auth/v1/verify?
     token_hash=xxx
     &type=magiclink
     &redirect_to=http://localhost:3000
   ```
3. Supabase ověří token a přesměruje na `redirect_to`
4. URL po přesměrování:
   ```
   http://localhost:3000#access_token=xxx&refresh_token=yyy...
   ```
5. `detectSessionInUrl: true` automaticky zpracuje hash a přihlásí uživatele

### Implicit Flow

Podobný princip, ale používá `token` místo `token_hash`.

## Debugging

Pokud to stále nefunguje, zkontrolujte v konzoli:

```javascript
// Otevřete DevTools Console
supabase.auth.getSession().then(console.log)
```

Pokud vidíte `session: null`, token nebyl správně zpracován.

## Produkční nasazení

Před nasazením do produkce:

1. ✅ Přidejte produkční URL do Redirect URLs v Supabase
2. ✅ Aktualizujte email templates v Supabase (viz `EMAIL_TEMPLATES_SETUP.md`)
3. ✅ Otestujte magic link v produkci
4. ✅ Ověřte, že `emailRedirectTo` používá správnou produkční URL

## Související dokumenty

- `EMAIL_TEMPLATES_SETUP.md` - Nastavení email templates
- `NOVA_SPRAVA_UZIVATELU.md` - Kompletní dokumentace správy uživatelů
- `AUTH_IMPLEMENTATION_SUMMARY.md` - Shrnutí autentizačního systému



