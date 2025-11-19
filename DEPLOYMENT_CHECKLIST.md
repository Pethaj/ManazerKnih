# ✅ Deployment Checklist - Zabezpečená aplikace

## Před nasazením

### 1. Získání API klíčů
- [ ] **OpenAI API klíč** (`sk-...`)
  - Získat z: https://platform.openai.com/api-keys
  - Potřeba pro: GPT-4o mini, embeddings, vision
  
- [ ] **CloudConvert API klíč** (JWT token)
  - Získat z: https://cloudconvert.com/dashboard/api/v2/keys
  - Potřeba pro: Konverze EPUB/MOBI do PDF
  
- [ ] **iLovePDF Secret Key** (`secret_key_...`)
  - Získat z: https://developer.ilovepdf.com/
  - Potřeba pro: OCR a komprese PDF
  
- [ ] **iLovePDF Public Key** (`project_public_...`)
  - Získat z: https://developer.ilovepdf.com/
  - Potřeba pro: Autentizace iLovePDF API

---

## Nastavení Supabase

### 2. Instalace Supabase CLI
```bash
# Zkontrolovat instalaci
supabase --version

# Pokud není nainstalován:
npm install -g supabase
```
- [ ] Supabase CLI nainstalován

### 3. Přihlášení a propojení projektu
```bash
# Přihlášení
supabase login

# Propojení s projektem
supabase link --project-ref modopafybeslbcqjxsve
```
- [ ] Přihlášen do Supabase
- [ ] Projekt propojen

### 4. Nastavení Secrets
```bash
# OpenAI
supabase secrets set OPENAI_API_KEY="sk-..."

# CloudConvert
supabase secrets set CLOUDCONVERT_API_KEY="eyJ0eXAi..."

# iLovePDF
supabase secrets set ILOVEPDF_SECRET_KEY="secret_key_..."
supabase secrets set ILOVEPDF_PUBLIC_KEY="project_public_..."
```
- [ ] `OPENAI_API_KEY` nastaven
- [ ] `CLOUDCONVERT_API_KEY` nastaven
- [ ] `ILOVEPDF_SECRET_KEY` nastaven
- [ ] `ILOVEPDF_PUBLIC_KEY` nastaven

### 5. Ověření secrets
```bash
supabase secrets list
```
- [ ] Všechny 4 secrets jsou v seznamu

---

## Nasazení Edge Functions

### 6. Deploy funkcí
```bash
# Automaticky
chmod +x deploy-edge-functions.sh
./deploy-edge-functions.sh

# Nebo manuálně
supabase functions deploy openai-proxy
supabase functions deploy cloudconvert-proxy
supabase functions deploy ilovepdf-proxy
```
- [ ] `openai-proxy` nasazena
- [ ] `cloudconvert-proxy` nasazena
- [ ] `ilovepdf-proxy` nasazena

### 7. Ověření nasazení
```bash
supabase functions list
```
- [ ] Všechny 3 funkce jsou ve stavu "deployed"

---

## Testování

### 8. Test OpenAI proxy
V konzoli prohlížeče:
```javascript
const test = await fetch('https://modopafybeslbcqjxsve.supabase.co/functions/v1/openai-proxy', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ANON_KEY',
    'apikey': 'ANON_KEY'
  },
  body: JSON.stringify({
    endpoint: '/chat/completions',
    method: 'POST',
    body: {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Hello!' }],
      max_tokens: 50
    }
  })
});
console.log(await test.json());
```
- [ ] OpenAI proxy funguje (vrátí odpověď od GPT)

### 9. Test aplikace - Funkcionality

#### Chat & AI
- [ ] Chat s GPT-4o mini funguje
- [ ] Produktové doporučení funguje

#### PDF zpracování
- [ ] Upload PDF funguje
- [ ] OCR zpracování funguje (iLovePDF)
- [ ] Komprese PDF funguje (iLovePDF)

#### Embeddings & Search
- [ ] Generování embeddingů funguje
- [ ] Vyhledávání produktů funguje
- [ ] Hybrid search funguje

#### Konverze formátů
- [ ] EPUB konverze do PDF funguje (CloudConvert)
- [ ] MOBI konverze do PDF funguje (CloudConvert)

#### Metadata extrakce
- [ ] Vision API extrakce z obrázků funguje
- [ ] Metadata z PDF jsou správně extrahována

### 10. Kontrola logů
```bash
# Real-time sledování všech funkcí
supabase functions logs

# Specifická funkce
supabase functions logs openai-proxy
```
- [ ] Žádné error logy
- [ ] API volání procházejí správně

---

## Bezpečnostní kontroly

### 11. Ověření odstranění klíčů z kódu
```bash
# Semgrep scan
# (nebo ruční kontrola souborů)
grep -r "sk-" src/
grep -r "secret_key_" src/
grep -r "project_public_" src/
```
- [ ] Žádné `sk-` OpenAI klíče v kódu
- [ ] Žádné `secret_key_` iLovePDF klíče v kódu
- [ ] Žádné CloudConvert JWT tokeny v kódu
- [ ] Pouze Supabase anon klíč (bezpečný)

### 12. Git historie
```bash
# Zkontrolovat, zda nejsou klíče v historii
git log --all --full-history --source --all -- "*ilovepdf*"
git log --all --full-history --source --all -- "*cloudconvert*"
```
- [ ] Žádné API klíče v Git historii
- [ ] Pokud jsou, vyčistit pomocí BFG Repo Cleaner

### 13. Supabase Security Advisors
- [ ] Zkontrolovat [Supabase Dashboard](https://supabase.com/dashboard/project/modopafybeslbcqjxsve/reports/security)
- [ ] Řešit kritické bezpečnostní problémy (RLS, atd.)

---

## Monitoring & Údržba

### 14. Nastavení monitoringu
- [ ] Supabase billing alerts nastaveny
- [ ] OpenAI usage alerts nastaveny
- [ ] CloudConvert usage sledován
- [ ] iLovePDF credits sledovány

### 15. Dokumentace
- [ ] Tým je seznámen s `SECURITY_SETUP.md`
- [ ] Tým ví, jak sledovat logy
- [ ] Kontakty pro troubleshooting nastaveny

---

## Po nasazení

### 16. První den po nasazení
- [ ] Zkontrolovat logy každé 2-4 hodiny
- [ ] Ověřit, že nejsou rate limit errors
- [ ] Zkontrolovat Supabase dashboard pro usage
- [ ] Ověřit, že uživatelé nehlásí problémy

### 17. První týden
- [ ] Denní kontrola logů
- [ ] Kontrola API usage a nákladů
- [ ] Optimalizace, pokud je potřeba

### 18. Měsíční údržba
- [ ] Review API nákladů
- [ ] Rotace API klíčů (doporučeno každé 3 měsíce)
- [ ] Kontrola bezpečnostních advisorů
- [ ] Update dependencies

---

## Problémy a řešení

### Edge funkce nefunguje?
```bash
# 1. Zkontrolovat logs
supabase functions logs <function-name>

# 2. Zkontrolovat secrets
supabase secrets list

# 3. Znovu nasadit
supabase functions deploy <function-name>
```

### API rate limiting?
- Zkontrolovat OpenAI/CloudConvert/iLovePDF dashboard
- Zvýšit tier nebo implementovat rate limiting v aplikaci

### Chybí funkcionalita?
- Zkontrolovat SECURITY_CHANGES_SUMMARY.md
- Ověřit, že všechny edge funkce jsou nasazeny
- Zkontrolovat logy pro error zprávy

---

## ✅ Finální potvrzení

- [ ] Všechny body výše jsou splněny
- [ ] Aplikace běží bez chyb
- [ ] Všechny funkcionality byly otestovány
- [ ] Bezpečnostní kontroly prošly
- [ ] Monitoring je nastavený
- [ ] Dokumentace je aktuální
- [ ] Tým je informován

---

**Datum nasazení**: _________________  
**Nasadil**: _________________  
**Verze**: 1.0.0 (Secured)  

🎉 **Gratulujeme! Aplikace je bezpečně nasazena!**

