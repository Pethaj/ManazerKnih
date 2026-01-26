# 🚀 START HERE - Iframe User Data Fix

**Co bylo opraveno?** Iframe widget nyní správně odesílá informace o přihlášeném uživateli do N8N.

---

## 📚 Dokumentace

Vyberte si podle toho, co potřebujete:

### 1. ⚡ Rychlý start (5 minut)
👉 **`QUICK_START_IFRAME_USER_DATA.md`**
- Co bylo opraveno
- Jak testovat
- Základní použití v N8N

### 2. 🔧 Technické detaily (15 minut)
👉 **`IFRAME_USER_DATA_FIX.md`**
- Analýza problému
- Popis řešení
- Datový tok
- Bezpečnost

### 3. 💡 N8N workflow příklady (10 minut)
👉 **`N8N_USER_DATA_EXAMPLES.md`**
- 10 praktických příkladů
- Personalizace odpovědí
- Ukládání do databáze
- Rate limiting
- Analytics

### 4. 📋 Kompletní přehled (20 minut)
👉 **`IFRAME_USER_TRACKING_COMPLETE.md`**
- Celé řešení od A do Z
- Všechny soubory
- Checklist
- Best practices

---

## 🧪 Okamžité testování

```bash
# 1. Spustit dev server
npm run dev

# 2. Otevřít testovací stránku
http://localhost:5173/test-iframe-user-data.html
```

---

## 📦 Co se změnilo v kódu?

**1 soubor:**
- `src/components/WidgetChat/WidgetChatContainer.tsx` ← Opraveno předávání user dat

**4 nové dokumenty:**
- `QUICK_START_IFRAME_USER_DATA.md` ← Rychlý návod
- `IFRAME_USER_DATA_FIX.md` ← Technická dokumentace
- `N8N_USER_DATA_EXAMPLES.md` ← N8N příklady
- `IFRAME_USER_TRACKING_COMPLETE.md` ← Kompletní přehled

**1 testovací soubor:**
- `test-iframe-user-data.html` ← Interaktivní test

---

## ✅ Výsledek

### PŘED:
```json
{
  "sessionId": "...",
  "chatInput": "...",
  "metadata": {...}
  // ❌ Chybí user data
}
```

### PO:
```json
{
  "sessionId": "...",
  "chatInput": "...",
  "metadata": {...},
  "user": {
    "id": "...",
    "email": "...",
    "firstName": "...",
    "lastName": "...",
    "role": "..."
  }
}
```

---

## 🎯 Co to přináší?

✅ Personalizace odpovědí podle jména  
✅ Ukládání historie podle uživatele  
✅ Analytics s user ID  
✅ Email notifikace s kontakty  
✅ Role-based přístup (admin, premium, user)  
✅ Rate limiting podle typu uživatele  

---

## 💬 Potřebujete pomoc?

1. Přečtěte si **QUICK_START** pro základní přehled
2. Otevřete **testovací stránku** a vyzkoušejte to
3. Podívejte se na **N8N příklady** pro workflow

---

**Status:** ✅ Production Ready  
**Verze:** 1.0  
**Datum:** 26. ledna 2026
