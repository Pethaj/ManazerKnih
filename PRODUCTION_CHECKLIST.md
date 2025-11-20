# 🚀 Production Checklist - Reset Hesla

## 📋 Před nasazením do produkce

Zkontrolujte všechny body před nasazením reset hesla do produkčního prostředí.

---

## 1️⃣ Supabase Konfigurace

### Email Template
- [ ] Email template aktualizována s PKCE flow
- [ ] Template obsahuje `{{ .TokenHash }}` místo `{{ .ConfirmationURL }}`
- [ ] Subject je user-friendly
- [ ] Design je responsive
- [ ] Czech jazyk je správně (diakritika)
- [ ] Testováno v různých email klientech (Gmail, Outlook, Apple Mail)

### URL Configuration
- [ ] Site URL nastavena na produkční doménu
- [ ] Redirect URLs obsahují produkční URL
- [ ] Všechny varianty domény jsou v whitelist (www, non-www)
- [ ] HTTPS je povinné
- [ ] Trailing slash handling je konzistentní

### Auth Settings
- [ ] Password Recovery Expiry: 3600s (1 hodina) nebo méně
- [ ] Email Provider je zapnutý
- [ ] Rate limiting je vhodné (4 emaily/hodina)
- [ ] SMTP je nakonfigurováno (vlastní nebo Supabase)

---

## 2️⃣ Aplikace

### Frontend
- [ ] `main.tsx` má správný import AppRouter
- [ ] `ResetPasswordPage.tsx` je kompletní
- [ ] `AppRouter.tsx` je správně nakonfigurován
- [ ] Všechny dependencies jsou v `package.json`
- [ ] `npm install` projde bez chyb
- [ ] `npm run build` projde bez chyb
- [ ] Production build je optimalizovaný

### Supabase Client
- [ ] `supabase.ts` má `flowType: 'pkce'`
- [ ] `detectSessionInUrl: true` je nastaveno
- [ ] `persistSession: true` je nastaveno
- [ ] Production URL a KEY jsou správné

### Auth Service
- [ ] `resetPassword()` používá správné `redirectTo`
- [ ] Error handling je robustní
- [ ] Logging je vhodné pro production

---

## 3️⃣ Bezpečnost

### HTTPS
- [ ] SSL certifikát je platný
- [ ] HTTPS redirect je aktivní
- [ ] Mixed content warnings nejsou přítomny
- [ ] HSTS header je nastavený

### CORS
- [ ] CORS je správně nakonfigurován
- [ ] Pouze produkční domény jsou povoleny
- [ ] Credentials jsou správně handlovány

### Tokens
- [ ] Token expiry je rozumná (1 hodina)
- [ ] Staré tokeny jsou automaticky mazány
- [ ] Rate limiting je aktivní
- [ ] Brute force protection je na místě

---

## 4️⃣ Testing

### Manual Testing
- [ ] Reset flow funguje end-to-end
- [ ] Email přichází do 1 minuty
- [ ] Odkaz v emailu funguje
- [ ] Stránka `/reset-password` se načte
- [ ] Formulář je funkční
- [ ] Validace funguje
- [ ] Error states jsou správné
- [ ] Success state s redirectem funguje
- [ ] Nové heslo funguje při přihlášení

### Browser Testing
- [ ] Chrome (desktop)
- [ ] Firefox (desktop)
- [ ] Safari (desktop)
- [ ] Edge (desktop)
- [ ] Safari (iOS)
- [ ] Chrome (Android)

### Email Client Testing
- [ ] Gmail
- [ ] Outlook
- [ ] Apple Mail
- [ ] Webmail (různé)

### Edge Cases
- [ ] Vypršelý token zobrazí chybu
- [ ] Neplatný token zobrazí chybu
- [ ] Krátké heslo je zamítnuto
- [ ] Neshodující hesla jsou zamítnuta
- [ ] Multiple requests jsou rate-limited
- [ ] Email scanner nerozbije odkaz

---

## 5️⃣ Monitoring & Logging

### Supabase Dashboard
- [ ] Auth logs jsou přístupné
- [ ] Metrics jsou sledovány
- [ ] Alerting je nastaveno pro errors

### Application Logging
- [ ] Úspěšné resety jsou logovány
- [ ] Failed attempts jsou logovány
- [ ] Rate limiting events jsou logovány
- [ ] Error stack traces jsou zachyceny

### Analytics
- [ ] Reset password requests jsou sledovány
- [ ] Success rate je měřen
- [ ] Time to complete je měřen
- [ ] User feedback je sbírán

---

## 6️⃣ Documentation

### Internal Docs
- [ ] Architecture je zdokumentovaná
- [ ] Flow diagram existuje
- [ ] Troubleshooting guide je aktuální
- [ ] On-call playbook existuje

### User Docs
- [ ] Help center má reset hesla článek
- [ ] FAQ je aktualizované
- [ ] Support team je vyškolen

### Code Docs
- [ ] Components jsou dokumentované
- [ ] Functions mají JSDoc
- [ ] README je aktuální
- [ ] CHANGELOG je aktuální

---

## 7️⃣ Performance

### Loading Times
- [ ] Reset page načtení < 2s
- [ ] Form submission < 1s
- [ ] Email delivery < 30s
- [ ] Token validation < 500ms

### Optimization
- [ ] Images jsou optimalizované
- [ ] CSS je minifikovaný
- [ ] JS je minifikovaný
- [ ] Lazy loading kde je vhodné

---

## 8️⃣ User Experience

### Design
- [ ] UI je konzistentní s aplikací
- [ ] Loading states jsou jasné
- [ ] Error messages jsou helpfulné
- [ ] Success messages jsou jasné
- [ ] Mobile responsive

### Accessibility
- [ ] Keyboard navigation funguje
- [ ] Screen reader friendly
- [ ] ARIA labels jsou přítomny
- [ ] Color contrast je dostatečný
- [ ] Focus states jsou viditelné

### Copy
- [ ] Text je v češtině
- [ ] Gramatika je správná
- [ ] Tón je přátelský
- [ ] Instrukce jsou jasné

---

## 9️⃣ Backup & Recovery

### Backup Plan
- [ ] Database backups jsou automatické
- [ ] Auth tables jsou v backupu
- [ ] Restore procedure je testovaná
- [ ] RTO/RPO jsou definované

### Rollback Plan
- [ ] Rollback procedure je dokumentovaná
- [ ] Previous version je dostupná
- [ ] Rollback je testovaný
- [ ] Zero downtime deployment

---

## 🔟 Legal & Compliance

### GDPR
- [ ] User data handling je compliant
- [ ] Privacy policy je aktuální
- [ ] Data retention policy je definována
- [ ] User consent je správně handlován

### Security
- [ ] Security audit je proveden
- [ ] Penetration testing je proveden
- [ ] Vulnerability scanning je aktivní
- [ ] Incident response plan existuje

---

## ✅ Pre-Launch Checklist

Den před launch:

- [ ] Všechny výše uvedené body jsou ✅
- [ ] Staging environment je identický s production
- [ ] Load testing je proveden
- [ ] Full end-to-end test je proveden
- [ ] Team je informován
- [ ] Support team je připravený
- [ ] Monitoring je aktivní
- [ ] Rollback plan je ready

---

## 🚀 Launch Day

### Před deploymentem:
- [ ] Backup current production
- [ ] Verify Supabase configuration
- [ ] Alert team about deployment
- [ ] Set up monitoring dashboard

### Deployment:
- [ ] Deploy application
- [ ] Verify deployment successful
- [ ] Run smoke tests
- [ ] Monitor for errors

### Po deploymentu:
- [ ] Test reset password flow
- [ ] Monitor logs for issues
- [ ] Watch metrics dashboard
- [ ] Collect initial feedback

---

## 📊 Post-Launch Monitoring

První týden:

- [ ] Daily metrics review
- [ ] Error rate monitoring
- [ ] User feedback collection
- [ ] Performance monitoring
- [ ] Security incident monitoring

První měsíc:

- [ ] Weekly metrics review
- [ ] User satisfaction survey
- [ ] Performance optimization
- [ ] Documentation updates

---

## 🎯 Success Metrics

Cíle pro první měsíc:

- [ ] Success rate > 95%
- [ ] Average time to reset < 5 minut
- [ ] Email delivery rate > 98%
- [ ] User satisfaction > 4/5
- [ ] Zero security incidents

---

## 🆘 Incident Response

V případě problému:

1. **Immediate Actions:**
   - Check Supabase Dashboard → Logs
   - Check Application logs
   - Check Error tracking (Sentry/etc)

2. **Quick Fixes:**
   - Verify Email Template
   - Verify URL Configuration
   - Check Rate Limiting

3. **Escalation:**
   - Contact Supabase support
   - Review [RESET_PASSWORD_SETUP.md](./RESET_PASSWORD_SETUP.md)
   - Check [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)

---

## 📝 Sign-Off

### Development Team
- [ ] Code reviewed
- [ ] Tests passed
- [ ] Documentation complete
- **Signed:** ________________ Date: __________

### QA Team
- [ ] All test cases passed
- [ ] Regression testing complete
- [ ] Performance acceptable
- **Signed:** ________________ Date: __________

### Product Owner
- [ ] Requirements met
- [ ] UX approved
- [ ] Ready for production
- **Signed:** ________________ Date: __________

### Security Team
- [ ] Security review complete
- [ ] No critical issues
- [ ] Compliant with policies
- **Signed:** ________________ Date: __________

---

## 🎉 Congratulations!

Po dokončení všech bodů jste připraveni nasadit reset hesla do produkce!

**Keep monitoring, keep improving! 🚀**


