# ✅ UI pro denní limity zpráv - HOTOVO

## 🎉 Co bylo vytvořeno

Kompletní UI komponenty pro správu denních limitů zpráv v admin panelu.

---

## 📦 Vytvořené komponenty

### 1. **Rozšíření ChatbotSettingsManager** ✅

**Soubor:** `/src/components/ChatbotSettings/ChatbotSettingsManager.tsx`

**Přidáno:**
- ✅ Sekce pro nastavení denního limitu u každého chatbota
- ✅ Zobrazení aktuálního využití limitu (progress bar)
- ✅ Input pro nastavení limitu
- ✅ Tlačítko pro uložení limitu
- ✅ Info komponenta v přehledu chatbotů (`MessageLimitInfo`)

**Kde to najdeš:**
Otevři stránku se správou chatbotů → Klikni na "Upravit" u chatbota → Scrolluj dolů na sekci "⏰ Denní limit zpráv"

---

### 2. **GlobalLimitSettings** ✅

**Soubor:** `/src/components/MessageLimits/GlobalLimitSettings.tsx`

**Funkce:**
- Nastavení globálního denního limitu (platí pro všechny chatboty)
- Zobrazení aktuálního využití s progress barem
- Statistiky (zbývá, využito, celkový limit)
- Barevné varování když je limit nad 80%
- Info box s vysvětlením jak to funguje

**Import:**
```tsx
import { GlobalLimitSettings } from '@/components/MessageLimits';
```

---

### 3. **MessageLimitsDashboard** ✅

**Soubor:** `/src/components/MessageLimits/MessageLimitsDashboard.tsx`

**Funkce:**
- Přehledový dashboard všech chatbotů a jejich limitů
- Zobrazení globálního limitu (používá `GlobalLimitSettings`)
- Filtry (Všechny / Varování / Překročeno)
- Progress bary pro každý chatbot
- Barevné označení statusu (zelená/žlutá/oranžová/červená)
- Tlačítko "Obnovit" pro refresh dat

**Import:**
```tsx
import { MessageLimitsDashboard } from '@/components/MessageLimits';
```

---

## 🚀 Jak to použít

### Varianta A: Přidat do existující admin stránky

Pokud máš admin panel, přidej novou stránku/tab:

```tsx
// V tvém admin layoutu nebo menu
import { MessageLimitsDashboard } from '@/components/MessageLimits';

// Přidej do menu
<NavLink to="/admin/message-limits">
  📊 Denní limity
</NavLink>

// Vytvoř stránku
export default function MessageLimitsPage() {
  return <MessageLimitsDashboard />;
}
```

### Varianta B: Samostatná stránka

Vytvoř novou stránku:

```tsx
// app/admin/message-limits/page.tsx
import { MessageLimitsDashboard } from '@/components/MessageLimits';

export default function MessageLimitsPage() {
  return (
    <div className="container mx-auto p-6">
      <MessageLimitsDashboard />
    </div>
  );
}
```

---

## 📸 Jak to vypadá

### 1. Nastavení u chatbota (ChatbotSettingsManager)

```
┌────────────────────────────────────────────────┐
│ ⏰ Denní limit zpráv                            │
├────────────────────────────────────────────────┤
│ Nastavte maximální počet zpráv...              │
│                                                 │
│ Maximální počet zpráv za den                   │
│ ┌─────────────────┐  ┌──────────────┐         │
│ │ 5000            │  │ Uložit limit │         │
│ └─────────────────┘  └──────────────┘         │
│                                                 │
│ ┌─────────────────────────────────────┐        │
│ │ Aktuální využití: 1234 / 5000      │        │
│ │ ████████░░░░░░░░░░░░░░░░  25%      │        │
│ │ 25% využito | Reset: 30.1. 00:00   │        │
│ └─────────────────────────────────────┘        │
└────────────────────────────────────────────────┘
```

### 2. Dashboard přehled (MessageLimitsDashboard)

```
┌────────────────────────────────────────────────┐
│ 📊 Denní limity zpráv        🔄 Obnovit        │
├────────────────────────────────────────────────┤
│ 🌍 Globální denní limit zpráv                  │
│ ┌────────────────────────────────────┐         │
│ │ [Input: 100000] [Uložit]          │         │
│ │ 45,230 / 100,000                   │         │
│ │ ██████████░░░░░░░░░  45%          │         │
│ └────────────────────────────────────┘         │
├────────────────────────────────────────────────┤
│ Filtr: [Všechny (5)] [Varování (2)] [Překročeno (1)] │
├────────────────────────────────────────────────┤
│ ┌────────────────────────────────────┐         │
│ │ 🤖 EO-Smesi         ⚠️ Varování    │         │
│ │ ID: eo_smesi                        │         │
│ │ 4,500 / 5,000                       │         │
│ │ ████████████████████░  90%         │         │
│ └────────────────────────────────────┘         │
│                                                 │
│ ┌────────────────────────────────────┐         │
│ │ 🤖 Wany.Chat Local  ✅ OK          │         │
│ │ ID: wany_chat_local                 │         │
│ │ 523 / 10,000                        │         │
│ │ ██░░░░░░░░░░░░░░░░░░  5%          │         │
│ └────────────────────────────────────┘         │
└────────────────────────────────────────────────┘
```

---

## 🎨 Barevné stavy

| Využití | Barva | Emoji | Status |
|---------|-------|-------|--------|
| 0-50% | 🟢 Zelená | ✅ | OK |
| 50-80% | 🟡 Žlutá | 🟡 | Střední |
| 80-95% | 🟠 Oranžová | ⚠️ | Varování |
| 95-100% | 🔴 Červená | 🔴 | Překročeno |
| Bez limitu | ⚪ Šedá | ∞ | Neomezeno |

---

## 🔧 Nastavení environment variables

Ujisti se, že máš nastavené:

```env
NEXT_PUBLIC_SUPABASE_URL=https://modopafybeslbcqjxsve.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tvuj_anon_key
```

---

## 📋 Checklist - Co dělat teď

### ✅ Hotovo (vytvořeno)
- [x] UI komponenty vytvořeny
- [x] Integrace do ChatbotSettingsManager
- [x] GlobalLimitSettings komponenta
- [x] MessageLimitsDashboard komponenta
- [x] Progress bary a barevné stavy
- [x] Filtry a statistiky

### ⏳ TODO (implementace do projektu)

1. **Přidat stránku do routingu** (5 min)
   - Vytvoř `app/admin/message-limits/page.tsx`
   - Importuj `MessageLimitsDashboard`

2. **Přidat odkaz do menu** (2 min)
   - V admin layoutu přidej link na `/admin/message-limits`

3. **Testování** (10 min)
   - Otevři správu chatbotů
   - Klikni na "Upravit" u chatbota
   - Nastav limit např. 1000
   - Klikni "Uložit limit"
   - Ověř v dashboardu

4. **Styling (volitelné)** (15 min)
   - Přizpůsob barvy designu tvého admin panelu
   - Upravit velikosti fontů
   - Změnit ikony

---

## 🧪 Testovací scénář

### Test 1: Nastavení limitu u chatbota

1. Otevři správu chatbotů
2. Klikni "Upravit" u existujícího chatbota
3. Scrolluj dolů na sekci "⏰ Denní limit zpráv"
4. Zadej např. `1000`
5. Klikni "Uložit limit"
6. Měla by se zobrazit hláška "✅ Denní limit byl úspěšně uložen"
7. Obnovením stránky zkontroluj že limit zůstal uložen

### Test 2: Dashboard přehled

1. Otevři stránku s dashboardem
2. Měl bys vidět:
   - Sekci "Globální denní limit"
   - Seznam všech chatbotů s limity
   - Progress bary
3. Klikni na filtr "Varování"
4. Měly by se zobrazit jen chatboty nad 50% využití

### Test 3: Globální limit

1. V dashboardu najdi sekci "🌍 Globální denní limit zpráv"
2. Zadej např. `100000`
3. Klikni "Uložit"
4. Měla by se zobrazit hláška "✅ Globální limit byl úspěšně uložen"
5. Obnovením stránky ověř že limit zůstal uložen

---

## 🎯 Kam dál?

Po dokončení UI máš všechno potřebné pro správu limitů. Další kroky:

1. **Integruj do chat API** - Přidej kontrolu před odesláním zprávy
2. **Nastav cron job** - Pro automatický denní reset
3. **Monitoring** - Sleduj využití v dashboardu

Detaily v `MESSAGE_LIMITS_README.md`

---

## 💡 Tipy

### Rychlé odkazy

Pro snadný přístup přidej do hlavního menu admin panelu:

```tsx
<nav>
  <Link to="/admin/chatbots">🤖 Chatboty</Link>
  <Link to="/admin/message-limits">📊 Denní limity</Link>
  <Link to="/admin/settings">⚙️ Nastavení</Link>
</nav>
```

### Widget v dashboardu

Můžeš přidat malý widget na hlavní dashboard:

```tsx
import { GlobalLimitSettings } from '@/components/MessageLimits';

<div className="grid grid-cols-3 gap-4">
  <SomeWidget />
  <SomeWidget />
  <GlobalLimitSettings /> {/* Mini verze */}
</div>
```

### Notifikace

Přidej notifikační systém když je limit nad 80%:

```tsx
{percentage >= 80 && (
  <Toast type="warning">
    ⚠️ Chatbot {name} má 80%+ využití limitu!
  </Toast>
)}
```

---

## 📞 Support

Pokud něco nefunguje:

1. Zkontroluj environment variables
2. Zkontroluj že je Edge Function `check-message-limit` deploynutá
3. Zkontroluj browser console pro chyby
4. Zkontroluj Supabase logy

---

**Vytvořeno:** 30. ledna 2026  
**Status:** ✅ UI KOMPONENTY HOTOVÉ  
**Zbývá:** Přidat do routingu a menu (~7 minut)

**Soubory:**
- `/src/components/ChatbotSettings/ChatbotSettingsManager.tsx` ✅
- `/src/components/MessageLimits/GlobalLimitSettings.tsx` ✅
- `/src/components/MessageLimits/MessageLimitsDashboard.tsx` ✅
- `/src/components/MessageLimits/index.ts` ✅
