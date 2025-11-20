# Nastavení Email Templates v Supabase

Tento dokument obsahuje instrukce pro nastavení email templates v Supabase Dashboard pro nový autentifikační systém.

## Přehled změn

### Nový flow:
1. **Admin vytvoří uživatele** → Heslo se generuje z příjmení (4 písmena + 4 číslice)
2. **Uživatel dostane confirmation email** → Pro potvrzení emailové adresy
3. **Uživatel se přihlásí** → S emailem a vygenerovaným heslem
4. **Zapomenuté heslo** → Posílá se magic link místo reset password link
5. **Změna hesla** → V administraci si uživatel nastaví nové heslo

## Jak nastavit Email Templates

### 1. Přejděte do Supabase Dashboard

1. Přihlaste se na [https://app.supabase.com](https://app.supabase.com)
2. Vyberte projekt: **Books** (modopafybeslbcqjxsve)
3. V levém menu klikněte na **Authentication** → **Email Templates**

### 2. Nastavení Confirmation Email Template

**Kdy se používá:** Když admin vytvoří nového uživatele, tento email se pošle uživateli pro potvrzení emailové adresy.

**Postup:**
1. V Email Templates vyberte **Confirm signup**
2. Změňte **Subject** na: `Potvrďte svůj email - MedBase`
3. Nahraďte **Message** tímto obsahem:

```html
<h2>Vítejte v MedBase</h2>

<p>Byl vám vytvořen nový účet administrátorem.</p>

<p>Pro aktivaci účtu klikněte na tlačítko níže:</p>

<p><a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 12px 24px; background-color: #5d7fa3; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">Potvrdit email</a></p>

<p>Nebo zkopírujte a vložte tento odkaz do prohlížeče:</p>
<p>{{ .ConfirmationURL }}</p>

<p style="margin-top: 24px; color: #7a7a7a; font-size: 14px;">
    Po potvrzení emailu se můžete přihlásit s heslem, které vám poskytl administrátor.<br>
    Doporučujeme si heslo změnit v nastavení profilu po prvním přihlášení.
</p>

<p style="margin-top: 24px; color: #7a7a7a; font-size: 12px;">
    Pokud jste o tento účet nežádali, ignorujte tento email.
</p>
```

4. Klikněte na **Save**

### 3. Nastavení Magic Link Template

**Kdy se používá:** Když uživatel klikne na "Zapomněli jste heslo?" v přihlašovacím formuláři.

**Postup:**
1. V Email Templates vyberte **Magic Link**
2. Změňte **Subject** na: `Váš magic link pro přihlášení - MedBase`
3. Nahraďte **Message** tímto obsahem:

```html
<h2>Magic Link pro přihlášení</h2>

<p>Požádali jste o magic link pro přihlášení do MedBase.</p>

<p>Klikněte na tlačítko níže pro okamžité přihlášení:</p>

<p><a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 12px 24px; background-color: #5d7fa3; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">Přihlásit se</a></p>

<p>Nebo zkopírujte a vložte tento odkaz do prohlížeče:</p>
<p>{{ .ConfirmationURL }}</p>

<p style="margin-top: 24px; color: #7a7a7a; font-size: 14px;">
    Tento odkaz je platný pouze jednou a vyprší za 1 hodinu.
</p>

<p style="margin-top: 24px; color: #7a7a7a; font-size: 12px;">
    Pokud jste o tento link nežádali, ignorujte tento email. Váš účet zůstane v bezpečí.
</p>
```

4. Klikněte na **Save**

### 4. Nastavení Invite User Template (Volitelné)

**Poznámka:** Tuto template nepoužíváme v současné implementaci, ale pro úplnost:

**Postup:**
1. V Email Templates vyberte **Invite User**
2. Můžete tuto template nechat výchozí nebo ji deaktivovat

### 5. Nastavení Change Email Template (Volitelné)

**Kdy se používá:** Když uživatel změní svůj email v profilu.

**Postup:**
1. V Email Templates vyberte **Change Email Address**
2. Můžete ponechat výchozí template nebo ji přizpůsobit dle potřeby

## Kontrola nastavení Auth

### Auth Settings, které musí být správně nastaveny:

1. **V Authentication > Settings**:
   - ✅ **Enable Email Confirmations**: ZAPNUTO (uživatelé musí potvrdit email)
   - ✅ **Enable Email Provider**: ZAPNUTO
   - ✅ **Secure email change**: ZAPNUTO (pro lepší bezpečnost)
   - ✅ **Email OTP Expiration**: 3600 sekund (1 hodina) nebo méně

2. **V Authentication > URL Configuration** ⚠️ **DŮLEŽITÉ**:
   - **Site URL**: `http://localhost:5173` (pro development) nebo `https://vase-domena.com` (pro production)
   - **Redirect URLs** - MUSÍTE PŘIDAT:
     - `http://localhost:5173/auth/callback`
     - `https://vase-domena.com/auth/callback`
   
   **POZNÁMKA:** Bez správně nastavených Redirect URLs magic link NEBUDE FUNGOVAT! Uživatel se po kliknutí vrátí na přihlašovací stránku.

## Testování Email Templates

### Test 1: Vytvoření nového uživatele
1. Přihlaste se jako správce (admin)
2. Otevřete Správu uživatelů
3. Klikněte na "Přidat uživatele"
4. Vyplňte jméno, příjmení, email a roli
5. Uživatel by měl obdržet **Confirmation Email**

### Test 2: Magic Link pro přihlášení
1. Na přihlašovací stránce zadejte email
2. Klikněte na "Zapomněli jste heslo? Pošleme vám magic link"
3. Uživatel by měl obdržet **Magic Link Email**
4. Po kliknutí na odkaz v emailu se uživatel automaticky přihlásí

## Poznámky k bezpečnosti

1. **Service Role Key**: Je uložen v `supabaseAdmin.ts` - v produkci by měl být v environment variables
2. **Email Confirmations**: Jsou povinné - uživatel se nemůže přihlásit bez potvrzeného emailu
3. **Magic Link**: Je jednosměrný a vyprší po 1 hodině
4. **Hesla**: Minimální délka je 6 znaků (Supabase výchozí nastavení)

## Custom SMTP (Doporučeno pro produkci)

Pro produkční prostředí doporučujeme nastavit vlastní SMTP server:

1. V **Authentication > Settings** najděte sekci **SMTP Settings**
2. Aktivujte **Enable Custom SMTP**
3. Vyplňte:
   - **Sender email**: `noreply@vase-domena.com`
   - **Sender name**: `MedBase`
   - **Host**: např. `smtp.sendgrid.net`
   - **Port**: `587`
   - **Username**: váš SMTP username
   - **Password**: váš SMTP heslo

## Troubleshooting

### Email se neposílá
1. Zkontrolujte, zda je "Enable Email Provider" zapnutý
2. Zkontrolujte spam složku
3. Pokud používáte custom SMTP, ověřte přihlašovací údaje

### Confirmation link nefunguje
1. Zkontrolujte **Redirect URLs** v URL Configuration
2. Ověřte, že **Site URL** je správně nastavena

### Magic link nefunguje
1. Ujistěte se, že template obsahuje `{{ .ConfirmationURL }}`
2. Zkontrolujte, že link ještě nevypršel (platnost 1 hodina)
3. Magic link lze použít pouze jednou

## Kontakt

Pro problémy s nastavením kontaktujte administrátora na: petr.hajduk@bewit.team

