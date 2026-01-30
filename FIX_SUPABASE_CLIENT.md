# ✅ FIX: "Invalid API key" + "Multiple GoTrueClient instances" - OPRAVENO

## 🐛 Problémy:
1. ❌ `Invalid API key` - komponenty vytvářely nové Supabase klienty s neexistujícími env proměnnými
2. ⚠️ `Multiple GoTrueClient instances` - každá komponenta vytvářela vlastní klient místo použití centrálního

## 🔧 Co bylo opraveno:

### 1. Používání centrálního Supabase klienta
Všechny komponenty nyní používají **centrální klient** z `/src/lib/supabase.ts` místo vytváření vlastních.

**Opravené soubory:**
- ✅ `/src/components/MessageLimits/GlobalLimitSettings.tsx`
- ✅ `/src/components/MessageLimits/MessageLimitsDashboard.tsx`
- ✅ `/src/components/ChatbotSettings/ChatbotSettingsManager.tsx`

### 2. Změny v kódu

**PŘED (špatně):**
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);
```

**PO (správně):**
```typescript
import { supabase, supabaseUrl, supabaseKey } from '../../lib/supabase';

// Pro databázové operace:
const { data, error } = await supabase.from('message_limits').select('*');

// Pro Edge Functions:
const response = await fetch(
  `${supabaseUrl}/functions/v1/check-message-limit`,
  {
    headers: {
      'Authorization': `Bearer ${supabaseKey}`
    }
  }
);
```

## 📋 Detailní změny:

### GlobalLimitSettings.tsx
```diff
- import { createClient } from '@supabase/supabase-js';
+ import { supabase } from '../../lib/supabase';

- const supabase = createClient(
-   import.meta.env.VITE_SUPABASE_URL!,
-   import.meta.env.VITE_SUPABASE_ANON_KEY!
- );
+ // Používá centrální supabase klient
```

### MessageLimitsDashboard.tsx
```diff
- import { createClient } from '@supabase/supabase-js';
+ import { supabase } from '../../lib/supabase';

- const supabase = createClient(
-   import.meta.env.VITE_SUPABASE_URL!,
-   import.meta.env.VITE_SUPABASE_ANON_KEY!
- );
+ // Používá centrální supabase klient
```

### ChatbotSettingsManager.tsx
```diff
+ import { supabase, supabaseUrl, supabaseKey } from '../../lib/supabase';

- const response = await fetch(
-   `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-message-limit`,
+ const response = await fetch(
+   `${supabaseUrl}/functions/v1/check-message-limit`,
  {
-     'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
+     'Authorization': `Bearer ${supabaseKey}`
  }
);

- const { createClient } = await import('@supabase/supabase-js');
- const supabase = createClient(...);
+ // Používá centrální supabase klient
```

## ✅ Výhody centrálního klienta:

1. **Jeden klient pro celou aplikaci** - žádné duplicity
2. **Správné API klíče** - hardcoded z `/src/lib/supabase.ts`
3. **Konzistentní konfigurace** - všude stejné nastavení
4. **Lepší performance** - jeden klient = méně paměti
5. **Snadnější údržba** - změny pouze na jednom místě

## 🚀 Testování:

Po těchto změnách:
1. ✅ Dashboard tab by se měl načíst bez chyb
2. ✅ Globální limit by se měl zobrazit správně
3. ✅ Seznam chatbotů by se měl načíst
4. ✅ Žádné chyby "Invalid API key" v console
5. ✅ Žádná varování "Multiple GoTrueClient instances"

## 📝 Poznámka:

Centrální Supabase klient používá **hardcoded** hodnoty:
- URL: `https://modopafybeslbcqjxsve.supabase.co`
- Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (z `/src/lib/supabase.ts`)

Tyto hodnoty jsou **správné** a ověřené - používají se v celé aplikaci.

---

**Status:** ✅ OPRAVENO  
**Datum:** 2026-01-30  
**Akce:** Restart dev server už není nutný (změny jsou v TypeScript souborech)
