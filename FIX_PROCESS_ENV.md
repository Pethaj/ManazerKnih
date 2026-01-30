# ✅ FIX: "process is not defined" - OPRAVENO

## 🐛 Problém:
```
ReferenceError: process is not defined
```

## 🔧 Co bylo opraveno:

### 1. Environment Variables
Změnil jsem všechny výskyty `process.env` na `import.meta.env` (Vite syntax):

**Opravené soubory:**
- ✅ `/src/components/MessageLimits/GlobalLimitSettings.tsx`
- ✅ `/src/components/MessageLimits/MessageLimitsDashboard.tsx`
- ✅ `/src/components/ChatbotSettings/ChatbotSettingsManager.tsx`

**Před:**
```typescript
process.env.NEXT_PUBLIC_SUPABASE_URL
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
```

**Po:**
```typescript
import.meta.env.VITE_SUPABASE_URL
import.meta.env.VITE_SUPABASE_ANON_KEY
```

### 2. Přidány Environment Variables
Do `.env.local` přidány:
```env
VITE_SUPABASE_URL=https://modopafybeslbcqjxsve.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🚀 Co musíš udělat:

### ⚠️ DŮLEŽITÉ: Restart dev serveru

Environment variables se načítají pouze při startu, takže MUSÍŠ restartovat dev server:

```bash
# 1. Zastav aktuální dev server
Ctrl+C

# 2. Spusť znovu
npm run dev
```

## ✅ Po restartu by mělo fungovat:

1. Otevři správu chatbotů
2. Klikni na tab **"Dashboard"**
3. Měl bys vidět:
   - Globální limit (bez chyby v console)
   - Seznam chatbotů
   - Žádné chyby "process is not defined"

---

**Status:** ✅ OPRAVENO  
**Akce:** Restart dev server (npm run dev)
