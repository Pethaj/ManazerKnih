# Nová správa uživatelů - Kompletní dokumentace

## Přehled změn

Systém správy uživatelů byl kompletně přepracován podle následujících požadavků:

### Nový flow vytváření a správy uživatelů:

1. ✅ **Admin přidá uživatele** - vyplní jméno, příjmení, email a roli
2. ✅ **Systém vygeneruje heslo** - z příjmení (4 písmena) + 4 náhodné číslice (např. `neck4829`)
3. ✅ **Uživatel dostane confirmation email** - pro potvrzení emailové adresy
4. ✅ **Uživatel se přihlásí** - s emailem a vygenerovaným heslem
5. ✅ **Zapomenuté heslo** - posílá se magic link (místo reset password linku)
6. ✅ **Změna hesla v administraci** - uživatel si může změnit heslo v nastavení profilu

## Změněné a nové soubory

### 1. Nové soubory

#### `/src/lib/supabaseAdmin.ts` (NOVÝ)
- Admin klient s `service_role_key` pro administrační operace
- Používá se POUZE pro serverové/administrační operace
- **DŮLEŽITÉ**: Service role key by měl být v environment variables v produkci

```typescript
// Vytváří admin klienta s plným přístupem k databázi
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
    }
});
```

#### `/src/services/adminAuthService.ts` (NOVÝ)
Kompletně nový service pro administrační operace:

**Hlavní funkce:**
- `generatePasswordFromSurname()` - Generuje heslo z příjmení + 4 číslice
- `adminCreateUser()` - Vytváří uživatele pomocí admin API
- `adminDeleteUser()` - Maže uživatele včetně auth.users
- `adminUpdateUserRole()` - Mění roli uživatele
- `adminListUsers()` - Seznam všech uživatelů
- `sendMagicLinkForPasswordReset()` - Posílá magic link

**Příklad generování hesla:**
```typescript
generatePasswordFromSurname("Neckář") // vrátí: "neck4829"
generatePasswordFromSurname("Novák")  // vrátí: "nova3847"
```

#### `/src/components/ProfileSettings/ChangePassword.tsx` (NOVÝ)
Komponenta pro změnu hesla v administraci:
- Ověření současného hesla
- Zadání nového hesla
- Potvrzení nového hesla
- Validace (minimální délka 6 znaků)

#### `/EMAIL_TEMPLATES_SETUP.md` (NOVÝ)
Kompletní instrukce pro nastavení email templates v Supabase Dashboard:
- Confirmation Email template
- Magic Link template
- URL Configuration
- SMTP nastavení

### 2. Upravené soubory

#### `/src/services/authService.ts`
**Změny:**
- Přidána funkce `sendMagicLink()` - posílá magic link místo reset password
- Funkce `resetPassword()` nyní interně volá `sendMagicLink()` (zpětná kompatibilita)

```typescript
// NOVÉ - Magic link pro přihlášení
export async function sendMagicLink(email: string)

// DEPRECATED - Nyní používá magic link
export async function resetPassword(email: string)
```

#### `/src/components/Auth/LoginForm.tsx`
**Změny:**
- Tlačítko "Zapomněli jste heslo?" nyní posílá magic link
- Změněna zpráva po odeslání na "Magic link byl odeslán..."
- Přejmenované stavy: `resetEmailSent` → `magicLinkSent`

#### `/src/components/UserManagement/AddUserModal.tsx`
**Změny:**
- Používá nový `adminCreateUser()` z `adminAuthService`
- Generování hesla pouze z příjmení (místo jméno + příjmení)
- Aktualizovaný náhled hesla při psaní
- Aktualizovaná informační hláška

#### `/src/components/UserManagement/UserManagement.tsx`
**Změny:**
- Používá nové funkce z `adminAuthService`:
  - `adminListUsers()`
  - `adminDeleteUser()`
  - `adminUpdateUserRole()`

## Technická implementace

### Service Role Key vs Anon Key

**Anon Key (standardní klient):**
- Pro běžné operace (přihlášení, logout, čtení dat)
- Respektuje RLS politiky
- Bezpečné pro použití na klientu

**Service Role Key (admin klient):**
- Pro administrační operace (vytváření/mazání uživatelů)
- Obchází všechny RLS politiky
- **NIKDY** nesdílet s klientem!
- Měl by být v environment variables

### Bezpečnostní opatření

1. **Email Confirmation povinný**
   - Uživatel musí potvrdit email před přihlášením
   - Nastaveno: `email_confirm: true` při vytváření uživatele

2. **Magic Link bezpečnost**
   - Jednosměrný odkaz (použitelný pouze jednou)
   - Platnost: 1 hodina
   - Option: `shouldCreateUser: false` (nelze vytvořit nový účet)

3. **Admin kontrola**
   - Každá admin funkce kontroluje `checkIsAdmin()`
   - Pouze uživatelé s rolí `spravce` mohou provádět admin operace

## Databázová struktura

### Tabulka: `user_profiles`

```sql
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'spravce')),
    first_name TEXT,
    surname TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Role:**
- `spravce` - Plný přístup, může spravovat uživatele
- `admin` - Může přidávat/upravovat knihy

## Workflow diagramy

### Vytvoření nového uživatele

```
Admin → Vyplní formulář (jméno, příjmení, email, role)
  ↓
System → Vygeneruje heslo (příjmení4znaky + 4číslice)
  ↓
supabaseAdmin.auth.admin.createUser()
  → email_confirm: true (auto-potvrzení pro možnost přihlášení)
  → user_metadata: {first_name, surname, full_name}
  ↓
Vytvoření záznamu v user_profiles
  ↓
Supabase → Pošle confirmation email uživateli
  ↓
Uživatel → Klikne na link v emailu
  ↓
Email potvrzen → Uživatel se může přihlásit
```

### Zapomenuté heslo (Magic Link)

```
Uživatel → Klikne na "Zapomněli jste heslo?"
  ↓
Zadá email
  ↓
sendMagicLink() → supabase.auth.signInWithOtp()
  ↓
Supabase → Pošle magic link email
  ↓
Uživatel → Klikne na magic link
  ↓
Automatické přihlášení → Přesměrování do aplikace
  ↓
(Volitelně) → Změna hesla v nastavení profilu
```

### Změna hesla v administraci

```
Uživatel → Otevře nastavení profilu
  ↓
Klikne na "Změnit heslo"
  ↓
Zadá:
  - Současné heslo
  - Nové heslo (min. 6 znaků)
  - Potvrzení nového hesla
  ↓
Ověření současného hesla → signInWithPassword()
  ↓
Změna hesla → supabase.auth.updateUser({ password })
  ↓
✅ Heslo úspěšně změněno
```

## Instalace a konfigurace

### 1. Environment Variables

Vytvořte `.env` soubor (nebo přidejte do stávajícího):

```env
# Supabase Public (Anon) Key - pro klientské operace
VITE_SUPABASE_URL=https://modopafybeslbcqjxsve.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase Service Role Key - pouze pro admin operace
# NIKDY NEPOUŽÍVAT NA KLIENTU!
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. Supabase Dashboard - Email Templates

Postupujte podle `/EMAIL_TEMPLATES_SETUP.md`:

1. Nastavte **Confirmation Email** template
2. Nastavte **Magic Link** template
3. Zkontrolujte Auth Settings
4. Nastavte Redirect URLs

### 3. Supabase Dashboard - Auth Settings

**Authentication > Settings:**
- ✅ Enable Email Confirmations: ON
- ✅ Enable Email Provider: ON
- ✅ Secure email change: ON
- Email OTP Expiration: 3600 (1 hodina)

**Authentication > URL Configuration:**
- Site URL: `http://localhost:5173` (dev) nebo `https://vase-domena.com` (prod)
- Redirect URLs:
  - `http://localhost:5173/auth/callback`
  - `https://vase-domena.com/auth/callback`

## Testování

### Test 1: Vytvoření uživatele
```bash
1. Přihlaste se jako správce
2. Otevřete Správu uživatelů
3. Klikněte "Přidat uživatele"
4. Vyplňte:
   - Jméno: Pavel
   - Příjmení: Neckář
   - Email: test@example.com
   - Role: admin
5. Zkontrolujte vygenerované heslo (např. neck4829)
6. Zkopírujte heslo
7. Zkontrolujte email test@example.com
8. Klikněte na confirmation link
9. Přihlaste se s heslem
```

### Test 2: Magic Link
```bash
1. Odhlaste se
2. Na login stránce zadejte email
3. Klikněte "Zapomněli jste heslo? Pošleme vám magic link"
4. Zkontrolujte email
5. Klikněte na magic link
6. Měli byste být automaticky přihlášeni
```

### Test 3: Změna hesla
```bash
1. Přihlaste se
2. Otevřete nastavení profilu
3. Klikněte "Změnit heslo"
4. Zadejte současné heslo
5. Zadejte nové heslo (min. 6 znaků)
6. Potvrďte nové heslo
7. Klikněte "Změnit heslo"
8. Odhlaste se a přihlaste s novým heslem
```

## Časté problémy a řešení

### Problém: Email se neposílá
**Řešení:**
1. Zkontrolujte spam složku
2. Ověřte, že "Enable Email Provider" je zapnutý
3. Pro produkci nastavte custom SMTP

### Problém: Uživatel nemůže se přihlásit po vytvoření
**Řešení:**
1. Ověřte, že uživatel potvrdil email
2. Zkontrolujte, že `email_confirm: true` v `adminCreateUser()`
3. Zkontrolujte heslo (pozor na copy-paste chyby)

### Problém: Magic link nefunguje
**Řešení:**
1. Zkontrolujte Redirect URLs v Supabase Dashboard
2. Ověřte, že link ještě nevypršel (platnost 1h)
3. Ujistěte se, že template obsahuje `{{ .ConfirmationURL }}`

### Problém: Admin nemůže vytvářet uživatele
**Řešení:**
1. Zkontrolujte, že uživatel má roli `spravce`
2. Ověřte service_role_key v `supabaseAdmin.ts`
3. Zkontrolujte console pro chyby

## API Reference

### adminCreateUser()
```typescript
await adminCreateUser(
    email: string,      // Email uživatele
    firstName: string,  // Jméno
    surname: string,    // Příjmení
    role: UserRole      // 'admin' | 'spravce'
)
// Vrací: { success, error, password, userId }
```

### sendMagicLink()
```typescript
await sendMagicLink(
    email: string       // Email pro magic link
)
// Vrací: { error }
```

### checkIsAdmin()
```typescript
await checkIsAdmin()
// Vrací: boolean - true pokud uživatel je správce
```

## Migrace ze starého systému

Pokud máte existující uživatele:

1. **Existující uživatelé můžou se nadále přihlašovat** se svými stávajícími hesly
2. **Změna hesla** - mohou použít magic link nebo změnit heslo v nastavení
3. **Nově vytvořeni uživatelé** budou používat nový systém s generovanými hesly

## Produkční checklist

- [ ] Přesunout service_role_key do environment variables
- [ ] Nastavit custom SMTP server
- [ ] Nastavit správnou Site URL a Redirect URLs
- [ ] Otestovat všechny email templates
- [ ] Ověřit RLS politiky na tabulce user_profiles
- [ ] Nastavit rate limiting pro auth endpoints
- [ ] Povolit CAPTCHA na login/signup (volitelné)

## Kontakt a podpora

Pro otázky a problémy kontaktujte:
- Email: petr.hajduk@bewit.team
- Projekt: Books (modopafybeslbcqjxsve)

---

**Vytvořeno:** 20. listopadu 2025  
**Verze:** 1.0  
**Status:** ✅ Kompletní implementace



