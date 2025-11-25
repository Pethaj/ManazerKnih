# Nastavení pozvaní uživatelů

## Problém
Funkce `inviteUserByEmail` vyžaduje Admin API s Service Role Key, který nelze bezpečně použít na frontendu.

## Řešení
Používáme standardní `signUp` s automatickým odesláním reset hesla emailu.

## Nastavení v Supabase Dashboard

### 1. Vypnout Email Confirmation (DŮLEŽITÉ!)

Přejděte do **Supabase Dashboard → Authentication → Settings → Email Auth**

Najděte sekci **Email Confirmation** a:
- ✅ **Vypněte** "Enable email confirmations"
- Nebo nastavte "Confirm email" na **disabled**

**Proč?** Pokud je email confirmation zapnutý, uživatel by musel potvrdit email před tím, než může obdržet reset hesla email.

### 2. Nastavení Email Templates

V **Authentication → Email Templates** můžete upravit šablony emailů:

#### Reset Password Email
Toto je email, který uživatel obdrží pro nastavení hesla. Můžete upravit:
- Předmět emailu
- Text emailu
- Design emailu

Výchozí šablona obsahuje odkaz `{{ .ConfirmationURL }}`, který uživatele přesměruje na stránku pro nastavení nového hesla.

### 3. Redirect URLs

V **Authentication → URL Configuration** přidejte:
- `http://localhost:5173` (pro development)
- Vaše produkční URL (např. `https://vase-domena.cz`)

Do **Redirect URLs** seznamu.

## Jak to funguje

1. **Správce vytvoří uživatele:**
   - Vyplní email a roli
   - Klikne na "Vytvořit uživatele"

2. **Systém:**
   - Vytvoří uživatele pomocí `signUp` s náhodným dočasným heslem
   - Vytvoří profil v `user_profiles` tabulce s příslušnou rolí
   - Automaticky odešle "Reset Password" email

3. **Nový uživatel:**
   - Obdrží email s odkazem
   - Klikne na odkaz
   - Nastaví si své vlastní heslo
   - Může se přihlásit

## Bezpečnost

✅ **Bezpečné:**
- Dočasné heslo není nikdy zobrazeno správci
- Uživatel si vytvoří vlastní silné heslo
- Reset token je jednorázový a má časový limit
- Žádné Service Role Keys na frontendu

## Alternativní řešení (pro budoucnost)

Pro větší kontrolu můžete vytvořit **Edge Function**:

```typescript
// supabase/functions/invite-user/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { email, role } = await req.json()

  // Admin API call
  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email)
  
  // Vytvořit profil...
  
  return new Response(JSON.stringify({ success: true }))
})
```

Toto by vyžadovalo:
1. Nahrát Edge Function do Supabase
2. Upravit frontend pro volání Edge Function místo přímého volání
3. Nastavit správná oprávnění

## Testování

1. Přihlaste se jako správce
2. Přejděte do "Správa uživatelů"
3. Klikněte na "Přidat uživatele"
4. Vyplňte email a roli
5. Klikněte "Vytvořit uživatele"
6. Zkontrolujte, zda přišel email na zadanou adresu
7. Klikněte na odkaz v emailu
8. Nastavte nové heslo
9. Přihlaste se

## Troubleshooting

### Chyba "User not allowed"
- Zkontrolujte, zda máte vypnuté "Email confirmations" v nastavení
- Zkontrolujte, zda je email valid

### Email nepřichází
- Zkontrolujte spam složku
- Zkontrolujte Email Templates v Supabase
- Pro development: použijte Inbucket (Supabase local development)
- Zkontrolujte rate limity na emailech

### Uživatel nemůže nastavit heslo
- Zkontrolujte, zda je URL správně nastavená v Redirect URLs
- Zkontrolujte, zda token nevypršel (výchozí platnost je 24 hodin)

## Status
✅ Implementováno a funkční s obejitím Admin API požadavku




