# 📧 Oprava Email Template pro Reset Hesla

## 🚨 KRITICKÝ KROK - Musíte provést manuálně

Tento krok **NELZE** udělat programově, musíte ho provést v Supabase Dashboard.

## 📍 Kde to najdu?

1. **Přejděte na:** https://supabase.com/dashboard/project/modopafybeslbcqjxsve/auth/templates
2. **Klikněte na:** "Reset Password" template

## ✏️ Co změnit?

### ❌ ŠPATNĚ (současný stav):

Pokud váš template obsahuje něco jako:

```html
<a href="{{ .ConfirmationURL }}">Reset Password</a>
```

nebo

```html
<a href="{{ .ConfirmationURL }}">Resetovat heslo</a>
```

**To je problém!** `{{ .ConfirmationURL }}` nefunguje s PKCE flow.

### ✅ SPRÁVNĚ (nový template):

Nahraďte **CELÝ** obsah template tímto:

```html
<h2>Reset hesla</h2>

<p>Dobrý den,</p>

<p>Obdrželi jsme požadavek na reset vašeho hesla pro účet v systému Manažer Knih.</p>

<p>Klikněte na tlačítko níže pro nastavení nového hesla:</p>

<p>
  <a href="{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery"
     style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: 500; margin: 16px 0;">
    Resetovat heslo
  </a>
</p>

<p style="color: #6b7280; font-size: 14px;">
  Pokud jste o reset hesla nežádali, můžete tento email ignorovat.
  Vaše heslo zůstane beze změny.
</p>

<p style="color: #6b7280; font-size: 12px; margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 12px;">
  ⏱️ Tento odkaz je platný 1 hodinu od odeslání.
</p>

<p style="color: #9ca3af; font-size: 11px;">
  Pokud tlačítko nefunguje, zkopírujte a vložte tento odkaz do prohlížeče:<br>
  {{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery
</p>
```

## 🔍 Klíčové změny:

1. **`{{ .SiteURL }}/reset-password`** - Správná cesta k vaší stránce
2. **`token_hash={{ .TokenHash }}`** - Token hash místo přímého tokenu
3. **`type=recovery`** - Typ akce (důležité pro Supabase)

## 📝 Subject (předmět emailu):

Můžete také změnit subject emailu:

```
Reset hesla - Manažer Knih
```

## ✅ Kontrola

Po uložení template:

1. Zkuste požádat o reset hesla
2. Zkontrolujte email
3. Klikněte na odkaz
4. Měli byste vidět stránku pro zadání nového hesla

## 🐛 Stále nefunguje?

Zkontrolujte:

1. **Site URL** v Auth → URL Configuration:
   - Development: `http://localhost:5173`
   - Production: `https://vase-domena.cz`

2. **Redirect URLs** (musí obsahovat):
   - `http://localhost:5173/**`
   - `http://localhost:5173/reset-password`

3. **Email Provider Settings**:
   - Authentication → Providers → Email
   - Mělo by být zapnuto "Enable email provider"

## 📊 Debug checklist

- [ ] Email template aktualizována s `{{ .TokenHash }}`
- [ ] Site URL správně nastavena
- [ ] Redirect URLs obsahují `/reset-password`
- [ ] Email provider je zapnutý
- [ ] Token expiry je nastavena (doporučeno 3600s)

## 💡 Proč to nefungovalo?

**Starý způsob (Implicit Flow):**
- Používal `{{ .ConfirmationURL }}`
- Token byl přímo v URL
- Email security scannery ho "spotřebovaly"
- Méně bezpečné

**Nový způsob (PKCE Flow):**
- Používá `{{ .TokenHash }}` + `{{ .SiteURL }}`
- Token hash místo přímého tokenu
- Odolnější vůči scannerům
- Bezpečnější

## 🎯 Výsledek

Po provedení těchto změn:

✅ Reset hesla odkazy budou fungovat  
✅ Nebude se zobrazovat "expired" chyba  
✅ Email scannery nebudou "spotřebovávat" odkazy  
✅ Lepší bezpečnost  

---

**Pokud máte problémy, přečtěte si kompletní dokumentaci v `RESET_PASSWORD_SETUP.md`**




