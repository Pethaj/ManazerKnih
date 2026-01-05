# 🚀 Vercel Deployment Guide - Wany Chat Widget

## Problém: `embed.html` zobrazuje 404

### Řešení 1: Manuální konfigurace v Vercel Dashboard

1. **Přihlaš se do Vercel Dashboard**: https://vercel.com/dashboard
2. **Najdi projekt `gr8learn.eu`**
3. **Jdi do Settings → General**
4. **Framework Preset**: Nastav na **"Vite"**
5. **Build & Output Settings**:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

6. **Jdi do Settings → Rewrites**:
   - Přidej:
     ```
     Source: /embed.html
     Destination: /embed.html
     ```

7. **Redeploy**:
   - Jdi do "Deployments"
   - Vyber poslední deployment
   - Klikni "⋯" → "Redeploy"

---

### Řešení 2: Zkontroluj Vercel Build Logs

1. Jdi do **Deployments** v Vercel Dashboard
2. Klikni na poslední deployment
3. Otevři **Build Logs**
4. Hledej chyby:
   - ❌ `embed.html` not found
   - ⚠️ Missing dependencies
   - 🔴 Build failed

---

### Řešení 3: Local Test (ověření že build funguje)

```bash
# Lokální build
npm run build

# Ověř že embed.html existuje
ls -la dist/embed.html

# Preview lokálně
npm run preview

# Otevři:
http://localhost:4173/embed.html
```

---

### Řešení 4: Force Clean Deployment

V Vercel Dashboard:
1. Jdi do **Settings** → **General**
2. Scrolluj dolů na **Dangerous Actions**
3. Klikni **"Clear Build Cache"**
4. Redeploy projekt

---

## Současný stav

- ✅ GitHub push dokončen
- ✅ `embed.html` je v `dist/` lokálně
- ✅ `vite.config.ts` má správný multi-entry build
- ✅ `vercel.json` má správné headery a routing
- ❌ Vercel stále vrací 404 pro `/embed.html`

---

## Co zkontrolovat v Vercel Dashboard

### 1. **Framework Detection**
Mělo by být nastaveno: **Vite**

### 2. **Build Output**
Zkontroluj že build log obsahuje:
```
✓ built in XXXms
dist/embed.html                3.73 kB
dist/index.html                9.17 kB
dist/assets/...
```

### 3. **Deployed Files**
V Deployment detailu, klikni na **"Source"** a ověř že `embed.html` je v root `dist/`.

---

## Kontakty na podporu

Pokud nic z výše uvedeného nepomůže:
- **Vercel Support**: https://vercel.com/support
- **Vercel Discord**: https://vercel.com/discord
- **GitHub Issue**: https://github.com/vercel/vercel/issues

---

## Rychlý Test

Po každé změně v Vercel konfiguraci:

```bash
# Přejdi na:
https://gr8learn.eu/embed.html

# Pokud funguje, mělo by se zobrazit modální okno Wany Chat
# Pokud 404, zkontroluj Vercel Build Logs
```

---

## Alternativní Řešení: Subdoména

Pokud Vercel stále dělá problémy s `/embed.html`, zvažte:

1. **Vytvořit samostatný Vercel projekt** jen pro widget:
   - Nový projekt: `wany-chat-embed`
   - Obsahuje jen `embed.html` + `embed-entry.tsx`
   - URL: `https://embed.gr8learn.eu/`

2. **Výhody**:
   - Čistá izolace
   - Nezávislé deployments
   - Žádné konflikty s hlavním projektem

---

**✅ Ideální výsledek**: `https://gr8learn.eu/embed.html` zobrazí Wany Chat widget bez jakýchkoliv 404 chyb.

