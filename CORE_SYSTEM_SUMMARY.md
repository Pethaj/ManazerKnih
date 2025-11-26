# 🎯 CORE Dokumentační Systém - Souhrn Implementace

## ✅ Co bylo vytvořeno

### 1. CORE.md - Centrální Dokumentace
**Soubor:** `/Users/petrhajduk/Documents/Code/Bewit/Manazer Knih/app/CORE.md`

**Obsah:**
- Kompletní dokumentace funkce **"Synchronizace Product Feed 2"** (FUNC-001)
- Všechny požadované sekce podle specifikace:
  - ✅ Základní informace (název, ID, oblast, stav)
  - ✅ Popis funkce a business logika
  - ✅ Technická implementace (frontend, backend, služby)
  - ✅ Databázové schéma (tabulky, sloupce, indexy, triggery)
  - ✅ API & Endpointy (Edge Function, N8N webhook, BEWIT feed)
  - ✅ Datové toky (3 vizualizované flow diagramy)
  - ✅ Závislosti (externí služby, npm balíčky, Supabase komponenty)
  - ✅ Bezpečnost (RLS policies, permissions, autentizace)
  - ✅ Automatizace (cron job, logování)
  - ✅ UI komponenty (ProductSync, ProductRecommendationButton, ProductCarousel)
  - ✅ Testování & Monitoring
  - ✅ Obnova při selhání
  - ✅ Známá omezení

**Statistiky:**
- Délka: ~875 řádků
- 1 kompletně zdokumentovaná funkce
- 3 datové flow diagramy
- 12+ kódových příkladů
- 20+ SQL queries pro monitoring

### 2. .cursorrules - Cursor Metodika
**Soubor:** `/Users/petrhajduk/Documents/Code/Bewit/Manazer Knih/app/.cursorrules`

**Obsah:**
- Implementace "core it" trigger workflow
- 7-krokový proces analýzy:
  1. Načtení CORE dokumentace
  2. Analýza navrhované změny
  3. Kontrola dopadu na CORE
  4. Identifikace konfliktů
  5. Návrh implementačních variant (A/B/C)
  6. Zastavení a čekání na schválení
  7. Implementace po schválení

- Ochrana CORE:
  - ❌ Zakázány automatické změny CORE.md
  - ✅ Vždy vyžadováno ruční schválení
  - ✅ Kontrola dopadu před změnou
  - ✅ Návrh více variant

- Formát výstupu "core it"
- Pravidla pro práce s CORE
- Příklady použití

### 3. CORE_IT_TEST_EXAMPLE.md - Testovací Demo
**Soubor:** `/Users/petrhajduk/Documents/Code/Bewit/Manazer Knih/app/CORE_IT_TEST_EXAMPLE.md`

**Obsah:**
- Kompletní ukázka "core it" workflow
- Testovací scénář: Přidání pole "rating" do product_feed_2
- Demonstrované analýzy:
  - ✅ Identifikace dopadů (střední úroveň)
  - ✅ Dotčené komponenty (5 souborů)
  - ✅ Potenciální konflikty (NULL values, XML format)
  - ✅ 3 implementační varianty (A: minimální, B: optimální, C: hybrid)
  - ✅ Validační checklist
  - ✅ Návrh aktualizace CORE.md

---

## 🎯 Jak používat CORE systém

### Krok 1: Před jakoukoli změnou

Pokud plánuješ změnu, která ovlivňuje:
- Databázové schéma
- API endpointy
- Sdílené služby/komponenty
- Datové toky
- Nové funkce

**Zadej příkaz:**
```
core it
```

### Krok 2: Popis změny

Cursor se zeptá na detaily. Odpověz například:
```
Chci přidat pole "rating" do tabulky product_feed_2
```

### Krok 3: Analýza

Cursor automaticky:
1. ✅ Načte CORE.md
2. ✅ Identifikuje ovlivněné CORE funkce
3. ✅ Analyzuje dopady (kritický/střední/nízký)
4. ✅ Navrhne 2-3 implementační varianty
5. ⏸️ Zastaví a čeká na tvoje rozhodnutí

### Krok 4: Schválení

Vyber variantu:
```
Schvaluji variantu B - Optimální řešení
```

### Krok 5: Implementace

Cursor:
1. ✅ Implementuje změny podle schválené varianty
2. 📝 Navrhne aktualizaci CORE.md (ukáže diff)
3. ⏸️ Čeká na schválení aktualizace CORE
4. ✅ Po schválení aktualizuje CORE.md
5. ✅ Udělá checkpoint

---

## 📋 Pravidla práce s CORE

### ✅ VŽDY

1. **Před změnou sdíleného komponentu** → `core it`
2. **Před změnou DB schématu** → `core it`
3. **Před změnou API** → `core it`
4. **Při přidání nové funkce** → `core it` a pak manuální přidání do CORE
5. **Po schválení** → Aktualizovat CORE.md

### ❌ NIKDY

1. **Neupravuj CORE.md automaticky** - vždy čekej na schválení
2. **Nemažej funkce z CORE** bez explicitního souhlasu
3. **Neimplementuj změny** bez "core it" analýzy (pokud ovlivňují CORE)
4. **Neignoruj konflikty** identifikované v analýze

### 🤔 VOLITELNÉ (nemusíš spouštět "core it")

- CSS/styling změny
- Text/copy změny
- Malé UI tweaky
- Bug fixy, které nemění rozhraní
- Refaktoring bez změny API

---

## 🔍 Struktura CORE.md

```
CORE.md
├── Úvod a pravidla
├── Obsah funkcí (index)
└── Funkce 1: Synchronizace Product Feed 2
    ├── Základní informace
    ├── Popis a business logika
    ├── Technická implementace
    │   ├── Frontend komponenty
    │   ├── Backend služby
    │   └── Edge Function
    ├── Databázové schéma
    │   ├── product_feed_2
    │   └── product_embeddings (rozšíření)
    ├── SQL Funkce pro vyhledávání
    ├── API & Endpointy
    │   ├── Edge Function
    │   ├── N8N Webhook
    │   └── BEWIT Feed API
    ├── Datové toky (3 flow diagramy)
    ├── Závislosti
    │   ├── Externí služby
    │   ├── NPM balíčky
    │   └── Supabase komponenty
    ├── Bezpečnost (RLS, permissions)
    ├── Automatizace (cron, logs)
    ├── UI komponenty
    ├── Testování & Monitoring
    ├── Obnova při selhání
    └── Známá omezení
```

---

## 🎓 Příklad workflow

### Scénář: Chci přidat novou funkci "Export produktů do CSV"

#### 1. Spustím analýzu
```
core it

Chci přidat funkci pro export všech produktů z product_feed_2 do CSV souboru.
Export by měl být dostupný v admin UI a měl by obsahovat všechna pole.
```

#### 2. Cursor analyzuje
```
🔍 CORE ANALÝZA

📋 Požadovaná změna:
Export produktů z product_feed_2 do CSV formátu

📚 Načtené CORE funkce:
- Funkce 1: Synchronizace Product Feed 2 - ✅ Aktivní

⚠️ Identifikované dopady:

Funkce: Synchronizace Product Feed 2 (FUNC-001)
Úroveň dopadu: 🟢 NÍZKÝ

Popis dopadu:
- Export pouze čte data z product_feed_2
- Neovlivňuje synchronizační proces
- Sdílená tabulka, ale read-only operace
- Nepotřebuje změny v Edge Function ani N8N

Dotčené komponenty:
- Nová komponenta: ProductExport.tsx (nová)
- Sdílená tabulka: product_feed_2 (read-only)

Potenciální konflikty: Žádné

💡 Implementační varianty:

Varianta A: Frontend CSV export
- CSV generování v browseru (papaparse)
- Výhody: Jednoduchý, rychlý
- Nevýhody: Limit na počet záznamů

Varianta B: Backend API endpoint
- Edge Function pro generování CSV
- Výhody: Škálovatelné, stream velkých dat
- Nevýhody: Více kódu

Varianta C: Supabase Storage export
- Scheduled job ukládá CSV do Storage
- Výhody: Automatický, historické exporty
- Nevýhody: Složitější setup

❓ Rozhodnutí: Která varianta?
```

#### 3. Schvaluji
```
Schvaluji variantu A - Frontend CSV export
```

#### 4. Cursor implementuje
```
✅ Implementuji variantu A...
[vytvoří ProductExport.tsx]
[přidá do admin UI]
[testuje]

📝 Navrhovaná aktualizace CORE.md:

Přidat novou sekci:
# Funkce 2: Export produktů do CSV

Nebo přidat jako sub-feature k Funkci 1?

Doporučuji: Sub-feature, protože souvisí s product_feed_2

Aktualizovat CORE.md?
```

#### 5. Schvalím update
```
Ano, přidej jako sub-feature do Funkce 1
```

#### 6. Checkpoint
```
✅ CORE validace dokončena pro Export produktů do CSV
✅ CORE.md aktualizován
✅ Nová funkce zdokumentována
```

---

## 🛡️ Ochrana CORE systému

### Co CORE chrání

1. **Integritu existujících funkcí**
   - Žádná změna bez analýzy dopadu
   - Identifikace konfliktů předem

2. **Možnost recovery**
   - Kompletní dokumentace pro obnovu
   - Všechny závislosti zdokumentovány

3. **Kvalitu kódu**
   - Vynucuje promyšlené návrhy
   - Zvažování více variant

4. **Knowledge retention**
   - Single source of truth
   - Historický záznam schválených funkcí

### Jak CORE ochraňuje

- ✅ Povinná analýza před změnou
- ✅ Identifikace všech dopadů
- ✅ Návrh více implementačních variant
- ✅ Explicitní schválení uživatelem
- ✅ Dokumentace všech změn
- ✅ Checkpoint po dokončení

---

## 📊 Statistiky implementace

### Vytvořené soubory
1. **CORE.md** - 875 řádků - Kompletní dokumentace
2. **.cursorrules** - 350+ řádků - Metodika
3. **CORE_IT_TEST_EXAMPLE.md** - 400+ řádků - Testovací demo
4. **CORE_SYSTEM_SUMMARY.md** - Tento soubor

**Celkem:** ~1,750+ řádků dokumentace a pravidel

### Zdokumentované komponenty v CORE

- ✅ 1 CORE funkce (Synchronizace Product Feed 2)
- ✅ 6 klíčových souborů (frontend komponenty + služby)
- ✅ 1 Edge Function
- ✅ 3 databázové soubory (.sql)
- ✅ 2 tabulky (product_feed_2, product_embeddings)
- ✅ 4 SQL funkce pro vyhledávání
- ✅ 3 API endpointy
- ✅ 3 datové flow diagramy
- ✅ 10+ závislostí (služby, balíčky)
- ✅ 5+ RLS policies a permissions
- ✅ 1 cron job
- ✅ 3 UI komponenty

---

## 🎉 Hotovo!

CORE dokumentační systém je **plně funkční** a připravený k použití.

### Příští kroky

1. **Přidávej nové funkce do CORE** podle potřeby
2. **Používej "core it"** před každou významnější změnou
3. **Aktualizuj CORE.md** když měníš existující funkce
4. **Udržuj CORE aktuální** - je to living document

### Testování

Pro otestování systému:
```
core it

Chci přidat pole "rating" do product_feed_2
```

Cursor ti ukáže kompletní analýzu podle `.cursorrules` metodiky.

---

**Status:** ✅ Implementace dokončena  
**Datum:** 2024-11-26  
**Verze CORE systému:** 1.0  
**Zdokumentované CORE funkce:** 1 (Synchronizace Product Feed 2)


