# 🚀 START HERE - Klientská integrace obou chatbotů

## 📦 Balíček pro klienta (Bewit web)

---

## ⚡ RYCHLÝ START (3 kroky)

### 1️⃣ Stáhni hlavní soubor
👉 **`KLIENT_INTEGRACE_OBA_CHATY.html`** - Kompletní kód pro copy-paste

### 2️⃣ Uprav PHP část
Najdi a uprav tento blok podle vašeho backendu:
```javascript
const CURRENT_USER = {
    id: '<?php echo $user->id; ?>',
    // ... atd.
};
```

### 3️⃣ Zkopíruj na web a otestuj
Test stránka: **https://gr8learn.eu/test-klient-integrace.html**

---

## 📚 Dokumentace (vyberte si co potřebujete)

### Jsem vývojář → chci implementovat rychle
👉 **`README_KLIENT.md`** (5 min čtení)
- Rychlý přehled
- Co se změnilo
- Checklist

### Chci pochopit detaily
👉 **`KLIENT_INTEGRACE_INSTRUKCE.md`** (15 min čtení)
- Detailní vysvětlení
- Příklady kódu
- Jak to funguje
- FAQ

### Chci vidět co bylo změněno v aplikaci
👉 **`CHANGELOG_IFRAME_READY_FIX.md`** (10 min čtení)
- Změny na naší straně
- Změny na straně klienta
- Breaking changes

### Chci celkový přehled
👉 **`IFRAME_READY_FIX_SUMMARY.md`** (5 min čtení)
- Krátké shrnutí
- Výsledky
- Časový odhad

---

## 🧪 TESTOVÁNÍ

### Online test (bez instalace):
👉 **https://gr8learn.eu/test-klient-integrace.html**

Otevři stránku, klikni na oba chaty a sleduj konzoli.

### Co hledat v konzoli:
```
✅ Globální IFRAME_READY listener zaregistrován
✅ IFRAME_READY přijato z chatu: wany_chat
📤 User data poslána do wany_chat
```

---

## ❓ NEJČASTĚJŠÍ OTÁZKY

### Co je nového?
- Globální IFRAME_READY listener (1× na stránku)
- Odstranění `iframe.addEventListener('load', ...)`

### Musím měnit open/close funkce?
- **NE!** Zůstávají úplně stejné.

### Kolik to zabere času?
- **~15 minut** (kopírování + test)

### Co když mám jen 1 chat?
- **Funguje to stejně!** Listener je univerzální.

---

## 📁 Struktura balíčku

```
📦 Balíček pro klienta
├── 📄 START_HERE_KLIENT_INTEGRACE.md ← Tento soubor (start zde)
├── 🎯 KLIENT_INTEGRACE_OBA_CHATY.html ← HLAVNÍ SOUBOR (copy-paste)
├── 📖 README_KLIENT.md ← Rychlý přehled
├── 📘 KLIENT_INTEGRACE_INSTRUKCE.md ← Detailní návod
├── 📋 CHANGELOG_IFRAME_READY_FIX.md ← Co se změnilo
├── 📊 IFRAME_READY_FIX_SUMMARY.md ← Souhrn
└── 🧪 https://gr8learn.eu/test-klient-integrace.html ← Online test
```

---

## ✅ IMPLEMENTAČNÍ CHECKLIST

### Příprava (5 min):
- [ ] Přečetl jsem `README_KLIENT.md`
- [ ] Stáhl jsem `KLIENT_INTEGRACE_OBA_CHATY.html`
- [ ] Otestoval jsem na https://gr8learn.eu/test-klient-integrace.html

### Implementace (10 min):
- [ ] Upravil jsem PHP výrazy pro user data
- [ ] Zkopíroval jsem globální IFRAME_READY listener
- [ ] ODSTRANIL jsem všechny staré `iframe.addEventListener('load', ...)`
- [ ] Zkopíroval jsem kód obou chatů

### Testování (5 min):
- [ ] Otevřel jsem konzoli (F12)
- [ ] Vidím `✅ IFRAME_READY přijato`
- [ ] Otevřel jsem oba chaty
- [ ] User data jsou vyplněná
- [ ] Zkontroloval jsem N8N webhook

### Deploy:
- [ ] Nasadil jsem na staging
- [ ] Otestoval jsem na staging
- [ ] Nasadil jsem na produkci
- [ ] Sledoval jsem konzoli první den

---

## 🆘 POTŘEBUJI POMOC

### Krok 1: Zkontroluj test stránku
👉 https://gr8learn.eu/test-klient-integrace.html

Pokud funguje tam, ale ne u vás → problém je ve vaší implementaci.

### Krok 2: Zkontroluj konzoli
- Parent stránka: Hledej `✅ IFRAME_READY přijato`
- Iframe: Hledej `🔥 ZPRÁVA:`, `✅ DATA ZACHYCENA`

### Krok 3: Kontakt
- **Email:** podpora@gr8learn.eu
- **Pošli:** Screenshot konzole (parent + iframe)

---

## 🎯 CO PO IMPLEMENTACI OČEKÁVAT

### ✅ Mělo by fungovat:
- Data se VŽDY doručí do iframe
- Data se pošlou jen 1× (ne duplicitně)
- Data jdou do správného iframe (když jsou oba na stránce)
- N8N webhook obsahuje user data

### ❌ Kdyby nefungovalo:
- Zkontroluj že jsi ODSTRANIL `iframe.addEventListener('load', ...)`
- Zkontroluj že globální listener je před oběma chaty
- Zkontroluj že PHP výrazy vracejí správná data

---

## 📞 KONTAKT

- **Email:** podpora@gr8learn.eu
- **Test:** https://gr8learn.eu/test-klient-integrace.html
- **Dokumentace:** Tento balíček

---

## 🎉 VÝSLEDEK

Po implementaci budete mít:
- ✅ 100% spolehlivou integraci
- ✅ User data v každém chatu
- ✅ Žádné duplicitní posílání
- ✅ Fungující N8N webhook s user daty

---

**Status:** ✅ Production Ready  
**Verze:** 2.0  
**Datum:** 2. února 2026

**🚀 Začněte zde: `KLIENT_INTEGRACE_OBA_CHATY.html`**
