# ⚡ Quick Start - Zabezpečená aplikace

> **5 minut do bezpečného nasazení**

---

## 🎯 Co bylo změněno?

✅ **Všechny API klíče odstraněny z kódu**  
✅ **3 nové Edge Functions jako bezpečná proxy**  
✅ **Veškerá logika zůstává v aplikaci**

---

## 🚀 Nasazení (5 kroků)

### 1️⃣ Získat API klíče

```bash
# Potřebné klíče:
- OpenAI API Key (sk-...)       → https://platform.openai.com/api-keys
- CloudConvert API Key           → https://cloudconvert.com/dashboard/api
- iLovePDF Secret Key            → https://developer.ilovepdf.com/
- iLovePDF Public Key            → https://developer.ilovepdf.com/
```

### 2️⃣ Nainstalovat Supabase CLI

```bash
npm install -g supabase
supabase login
```

### 3️⃣ Nastavit Secrets

```bash
supabase link --project-ref modopafybeslbcqjxsve

supabase secrets set OPENAI_API_KEY="sk-..."
supabase secrets set CLOUDCONVERT_API_KEY="..."
supabase secrets set ILOVEPDF_SECRET_KEY="..."
supabase secrets set ILOVEPDF_PUBLIC_KEY="..."
```

### 4️⃣ Deployovat Edge Functions

```bash
# Automaticky
chmod +x deploy-edge-functions.sh
./deploy-edge-functions.sh

# Nebo manuálně
supabase functions deploy openai-proxy
supabase functions deploy cloudconvert-proxy
supabase functions deploy ilovepdf-proxy
```

### 5️⃣ Otestovat aplikaci

```bash
# Sledovat logy
supabase functions logs

# Otevřít aplikaci a vyzkoušet:
- ✅ Chat
- ✅ Upload PDF + OCR
- ✅ Komprese PDF
- ✅ EPUB konverze
- ✅ Embeddings
```

---

## 📋 Checklist

- [ ] API klíče získány
- [ ] Supabase CLI nainstalován
- [ ] Secrets nastaveny (4 klíče)
- [ ] Edge Functions nasazeny (3 funkce)
- [ ] Aplikace otestována
- [ ] Logy kontrolovány

---

## ✅ Ověření

```bash
# Zkontrolovat secrets
supabase secrets list

# Zkontrolovat funkce
supabase functions list

# Sledovat logy
supabase functions logs
```

---

## 🆘 Pomoc

### Něco nefunguje?

1. **Zkontrolovat logy**: `supabase functions logs <function-name>`
2. **Zkontrolovat secrets**: `supabase secrets list`
3. **Znovu nasadit**: `supabase functions deploy <function-name>`

### Detailní dokumentace

- 📖 **SECURITY_SETUP.md** - Kompletní průvodce
- ✅ **DEPLOYMENT_CHECKLIST.md** - Krok-po-kroku checklist
- 📝 **CHANGELOG_SECURITY.md** - Všechny změny

---

## 🔐 Bezpečnost

### ✅ CO JE V KÓDU:
- Supabase URL (veřejné)
- Supabase anon klíč (veřejný, chráněný RLS)

### ❌ CO NENÍ V KÓDU:
- ~~OpenAI API klíč~~
- ~~CloudConvert API klíč~~
- ~~iLovePDF klíče~~

**Všechny citlivé klíče jsou pouze v Supabase Secrets!**

---

## 💡 Tipy

- **Rotace klíčů**: `supabase secrets set KEY="new_value"`
- **Monitoring**: Nastavit alerts v Supabase dashboard
- **Costs**: Sledovat usage v OpenAI/CloudConvert/iLovePDF dashboard

---

## 🎉 To je vše!

Aplikace je **bezpečně nasazena** a připravena k použití.

**Otázky?** Viz detailní dokumentace v `SECURITY_SETUP.md`

