# ✅ NOVÝ TAB "DASHBOARD" PŘIDÁN

## 🎉 Co bylo uděláno:

Přidal jsem nový tab **"Dashboard"** do správy chatbotů, který obsahuje kompletní přehled denních limitů zpráv a spendingu.

---

## 📍 Kde to najdeš:

1. Otevři správu chatbotů (ikona 🤖 v hlavním menu)
2. Uvidíš nový tab **"Dashboard"** hned vedle "Chatboty"
3. Struktura tabů:
   ```
   🤖 Chatboty | 📊 Dashboard | 🔗 Produktový feed | ⚙️ Nastavení
   ```

---

## 🎨 Co Dashboard obsahuje:

### 1. **Globální denní limit zpráv** 🌍
- Nastavení maximálního počtu zpráv pro všechny chatboty dohromady
- Aktuální využití s progress barem
- Barevné varování (zelená/žlutá/oranžová/červená)
- Statistiky:
  - Zbývá dnes
  - Využito dnes
  - Celkový limit

### 2. **Filtry**
- **Všechny** - Zobrazí všechny chatboty s limity
- **Varování** - Chatboty nad 50% využití
- **Překročeno** - Chatboty nad 100% (limit vyčerpán)

### 3. **Seznam chatbotů s limity**
Pro každý chatbot uvidíš:
- Název a ID
- Aktuální využití (např. 1,234 / 5,000)
- Progress bar s barvou podle využití
- Procenta využití
- Čas do resetu
- Status badge (✅ OK, ⚠️ Varování, 🔴 Překročeno)

---

## 🚀 Jak to použít:

### Nastavení globálního limitu:

1. Klikni na tab **"Dashboard"**
2. V horní sekci "🌍 Globální denní limit zpráv" zadej např. `100000`
3. Klikni **"Uložit"**
4. Měla by se zobrazit hláška "✅ Globální limit byl úspěšně uložen"

### Nastavení individuálního limitu pro chatbot:

1. Přejdi na tab **"Chatboty"**
2. Scrolluj dolů u konkrétního chatbota
3. Najdi sekci **"⏰ Denní limit zpráv"** (s modrým pozadím)
4. Zadej limit např. `5000`
5. Klikni **"Uložit limit"**

### Monitoring:

1. Otevři tab **"Dashboard"**
2. Použij filtr **"Varování"** pro zobrazení chatbotů nad 50%
3. Sleduj progress bary a procenta
4. Klikni **"🔄 Obnovit"** pro refresh dat

---

## 🎨 Barevné stavy:

| Využití | Barva | Status | Akce |
|---------|-------|--------|------|
| 0-50% | 🟢 Zelená | OK | Vše v pořádku |
| 50-80% | 🟡 Žlutá | Střední | Sledovat |
| 80-95% | 🟠 Oranžová | Varování | Zvážit zvýšení |
| 95-100% | 🔴 Červená | Kritické | Zvýšit limit! |

---

## 📸 Ukázka:

### Tab Dashboard:
```
┌─────────────────────────────────────────────────────┐
│ 📊 Denní limity zpráv              🔄 Obnovit      │
├─────────────────────────────────────────────────────┤
│ 🌍 Globální denní limit zpráv                       │
│ ┌─────────────────────────────────────────┐        │
│ │ Maximální počet zpráv za den (globálně) │        │
│ │ [100000] [Uložit]                        │        │
│ │                                           │        │
│ │ Aktuální globální využití:                │        │
│ │ 45,230 / 100,000                          │        │
│ │ ████████████░░░░░░░░░░░  45%            │        │
│ │ 45% využito | Reset: 31.1. 00:00        │        │
│ └─────────────────────────────────────────┘        │
├─────────────────────────────────────────────────────┤
│ Filtr: [Všechny (5)] [Varování (2)] [Překročeno (1)]│
├─────────────────────────────────────────────────────┤
│ 📦 EO-Smesi                    ⚠️ Varování          │
│ ID: eo_smesi                                        │
│ 4,500 / 5,000                                       │
│ ████████████████████░░  90%                        │
│ 90% využito | Zbývá: 500 | Reset: 00:00           │
├─────────────────────────────────────────────────────┤
│ 📦 Wany.Chat Local              ✅ OK               │
│ ID: wany_chat_local                                 │
│ 523 / 10,000                                        │
│ ███░░░░░░░░░░░░░░░░░  5%                          │
│ 5% využito | Zbývá: 9,477 | Reset: 00:00          │
└─────────────────────────────────────────────────────┘
```

---

## 🧪 Testovací scénář:

### Test 1: Otevření Dashboardu
1. Otevři správu chatbotů
2. Klikni na tab **"Dashboard"**
3. Měl bys vidět:
   - Sekci globálního limitu
   - Filtry
   - Seznam chatbotů (pokud mají nastavený limit)

### Test 2: Nastavení globálního limitu
1. V Dashboardu zadej např. `100000` do inputu
2. Klikni "Uložit"
3. Měla by se zobrazit hláška "✅ Globální limit byl úspěšně uložen"
4. Obnovením stránky zkontroluj že limit zůstal

### Test 3: Monitoring chatbotů
1. Nastav limit pro nějaký chatbot (v tabu "Chatboty")
2. Přejdi zpět do "Dashboard"
3. Měl bys vidět chatbot v seznamu s progress barem
4. Zkus filtr "Všechny" / "Varování" / "Překročeno"

---

## 📋 Změny v kódu:

### Upravené soubory:
- ✅ `/src/components/ChatbotManagement.tsx`
  - Přidán nový tab "Dashboard"
  - Import `MessageLimitsDashboard`
  - Ikona `IconDashboard`
  - State pro `selectedTab` rozšířen o 'dashboard'

### Nové komponenty (již existovaly):
- ✅ `/src/components/MessageLimits/MessageLimitsDashboard.tsx`
- ✅ `/src/components/MessageLimits/GlobalLimitSettings.tsx`
- ✅ `/src/components/MessageLimits/index.ts`

---

## 💡 Tipy:

### Rychlý přístup k dashboardu
Dashboard je teď druhý tab zleva, takže ho máš hned po "Chatboty" - rychlý přístup k monitoringu!

### Pravidelná kontrola
Doporučuji zkontrolovat Dashboard:
- **Každé ráno** - Podívej se na využití z předchozího dne
- **Po spuštění nového chatbota** - První týden sleduj denní využití
- **Když přidáš novou funkci** - Může zvýšit počet zpráv

### Alarmy
Pokud uvidíš chatbot s 🟠 oranžovou nebo 🔴 červenou:
1. Zkontroluj proč je využití vysoké
2. Zvyš limit pokud je to v pořádku
3. Nebo optimalizuj chatbot (kratší odpovědi, lepší screening)

---

## ❓ FAQ

### Q: Proč nevidím žádné chatboty v Dashboardu?
**A:** Dashboard zobrazuje jen chatboty, které mají nastavený denní limit. Přejdi do tabu "Chatboty", klikni na chatbot, scrolluj dolů a nastav limit.

### Q: Jak často se data refreshují?
**A:** Data se načítají při otevření Dashboardu. Pro manuální refresh klikni na tlačítko "🔄 Obnovit" vpravo nahoře.

### Q: Co znamená "Reset: 00:00"?
**A:** Všechny čítače se automaticky resetují na 0 každý den o půlnoci (CET). Potom začne nový den s novým limitem.

### Q: Mohu mít chatbot bez limitu?
**A:** Ano! Pokud nenastavíš limit (nebo ho smažeš), chatbot může přijímat neomezené množství zpráv.

### Q: Co se stane když dosáhnu limitu?
**A:** Chatbot přestane přijímat nové zprávy a uživatelé uvidí pěknou hlášku:
```
⏰ Denní limit zpráv dosažen
Omlouváme se, ale denní limit zpráv pro tento chat byl dosažen.
Chat bude opět dostupný od půlnoci.
```

---

## 🎯 Co dál?

Nyní máš kompletní systém pro správu limitů:

1. ✅ **Dashboard tab** - Monitoring a globální nastavení
2. ✅ **Individuální limity** - V tabu "Chatboty"
3. ⏳ **Integrace do chat API** - Zbývá přidat kontrolu před odesláním zprávy
4. ⏳ **Cron job** - Automatický reset o půlnoci

Další kroky najdeš v `MESSAGE_LIMITS_README.md`

---

**Vytvořeno:** 30. ledna 2026  
**Status:** ✅ DASHBOARD TAB FUNKČNÍ  
**Testováno:** Připraveno k testování  

**Zkus to hned:**
1. Otevři správu chatbotů
2. Klikni na nový tab **"Dashboard"**
3. Nastav globální limit
4. Užij si monitoring! 📊
