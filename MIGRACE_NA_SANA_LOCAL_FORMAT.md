# 🔄 Migrace: Sana Chat → Sana Local Format

## 📋 Přehled změn

Tento dokument popisuje migraci z původního **"Sana Chat"** na nový **"Sana Local Format"** s pokročilým markdown renderingem.

---

## 🎯 Co bylo změněno?

### 1. Databáze

#### Před:
```sql
chatbot_id: 'sana_chat'
chatbot_name: 'Sana Chat'
-- Standardní nastavení
```

#### Po:
```sql
chatbot_id: 'sana_local_format'
chatbot_name: 'Sana Local Format'
description: 'Pokročilý chatbot s markdown renderingem...'
```

### 2. Kód (src/components/SanaChat/SanaChat.tsx)

#### Řádek ~390:
```typescript
// PŘED:
const usesMarkdown = chatbotId === 'sana_2';

// PO:
const usesMarkdown = chatbotId === 'sana_local_format';
```

### 3. Hlavní aplikace (index.tsx)

#### Řádek ~4848:
```typescript
<FilteredSanaChat 
    chatbotId={activeChatbot.id}  // ← Přidáno!
    onClose={() => setActiveChatbot(null)}
    chatbotSettings={{...}}
/>
```

---

## 🚀 Instalační kroky

### Krok 1: Spusť SQL migration

```bash
# V Supabase SQL editoru:
```

```sql
-- Soubor: replace_sana_with_local_format.sql

-- Tento script:
-- ✅ Přejmenuje 'sana_chat' → 'sana_local_format'
-- ✅ Nebo vytvoří nový, pokud neexistuje
-- ✅ Deaktivuje 'sana_2' (už není potřeba)
```

### Krok 2: Restartuj aplikaci

```bash
# Terminal:
Ctrl+C  # Zastav server
npm run dev  # Spusť znovu
```

### Krok 3: Zkontroluj výsledek

1. Otevři aplikaci v prohlížeči
2. Klikni **"Správa chatbotů"**
3. Ověř, že vidíš **"Sana Local Format"** (ne "Sana Chat")
4. Klikni **"Spustit chat"**
5. Testuj dotaz: **"Co jsou Wany?"**

---

## ✅ Co očekávat po migraci

### V UI správy chatbotů:

```
┌─────────────────────────────────────┐
│  🤖 Sana Local Format               │  ← Nový název!
│                                     │
│  Pokročilý chatbot s markdown       │
│  renderingem a plným přístupem      │
│  k databázi knih...                 │
│                                     │
│  [Spustit chat] [Nastavení]         │
└─────────────────────────────────────┘
```

### Ve výstupu chatu:

```
┌────────────────────────────────────┐
│  Wany jsou speciální směsi...      │  ← Tučný text!
│                                    │
│  Hlavní výhody wanů:               │  ← Nadpis!
│  • Pročištění horkosti             │  ← Odrážky!
│  • Uvolnění blokád                 │
│                                    │
│  [Obrázek profesionálně stylovaný] │
└────────────────────────────────────┘

───────────────────────────────────────  ← Tenká šedá čára

Soubory:
- TČM-Wany, Autor: Bewit-eshop...      ← Odkazy!
- Volně prodejné čínské...
```

---

## 🔧 N8N Webhook - Důležité!

### ⚠️ Formát musí být:

```json
{
  "output": "**Markdown text BEZ sekce Zdroje**",
  "sources": [
    {
      "uri": "https://url-k-dokumentu.pdf",
      "title": "Název, Autor: XY, Publikováno: 2023"
    }
  ]
}
```

### ❌ NESMÍ být:

```json
{
  "output": "**Text**\n\n### Zdroje:\n- Zdroj 1\n- Zdroj 2"
}
```

**Proč?** Zdroje musí být v samostatném poli `sources`, aby se mohly zobrazit pod horizontální čarou!

---

## 🐛 Troubleshooting

### Problém: Stále vidím "Sana Chat"

**Řešení:**
1. Zkontroluj, že SQL script proběhl
2. Obnov stránku (F5)
3. Zkontroluj v Supabase tabulku `chatbot_settings`:
   ```sql
   SELECT * FROM chatbot_settings WHERE chatbot_id LIKE 'sana%';
   ```

### Problém: Markdown se nezobrazuje (vidím `**text**`)

**Řešení:**
1. Zkontroluj Browser Console (F12)
2. Hledej log: `🔍 Původní odpověď z N8N`
3. Ověř, že `chatbotId === 'sana_local_format'`
4. Zkontroluj, že N8N webhook vrací `output` pole

### Problém: Zdroje nejsou pod čarou

**Řešení:**
1. Zkontroluj N8N webhook - musí vracet pole `sources`
2. Ověř formát: každý source má `uri` a `title`
3. Zkontroluj, že `usesMarkdown === true` v Console

### Problém: Horizontální čára není vidět

**Řešení:**
1. Zkontroluj, že `sources` pole není prázdné
2. Ověř CSS: `border-t border-slate-200` (světle šedá)
3. Zkus zvýšit kontrast: `border-slate-300`

---

## 📁 Soubory změněny

### Upravené:
- ✅ `src/components/SanaChat/SanaChat.tsx` (řádek ~390)
- ✅ `index.tsx` (řádek ~4848)

### Nové:
- ✅ `replace_sana_with_local_format.sql` - SQL migrace
- ✅ `SANA_LOCAL_FORMAT_SETUP.md` - Dokumentace
- ✅ `MIGRACE_NA_SANA_LOCAL_FORMAT.md` - Tento soubor

### Zastaralé (můžeš smazat):
- ❌ `add_sana_2_chatbot.sql` - Už nepotřebujeme
- ❌ `SANA_2_*.md` - Zastaralá dokumentace

---

## 🎉 Po úspěšné migraci

Nyní máš:
- ✅ **Sana Local Format** nahradila původní Sana Chat
- ✅ Krásný markdown rendering (tučný text, nadpisy, seznamy)
- ✅ Profesionální styling obrázků
- ✅ Horizontální čáru oddělující zdroje
- ✅ Klikatelné odkazy na zdroje

**Gratulujeme! Migrace dokončena!** 🎊

---

## 📞 Další kroky

1. Testuj všechny typy dotazů
2. Ověř, že zdroje se zobrazují správně
3. Zkontroluj, že obrázky se načítají
4. Smaž zastaralé soubory (`SANA_2_*.md`)

---

**Vytvořeno:** 2. prosince 2025  
**Status:** ✅ Připraveno k nasazení



