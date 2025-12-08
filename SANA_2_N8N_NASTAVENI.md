# 🔧 N8N Webhook - Nastavení pro Sana 2

## ⚠️ PROBLÉM: Markdown se nezobrazuje správně

Pokud vidíš výstup v Sana 2 jako prostý text bez formátování (bez tučného textu, bez nadpisů atd.), znamená to, že:

1. **Zdroje jsou součástí markdown textu** místo samostatného pole `sources`
2. N8N webhook nevrací správný formát JSON

---

## ✅ ŘEŠENÍ: Uprav N8N webhook

### Krok 1: Najdi N8N webhook pro Sana 2

1. Otevři N8N workflow pro Sana 2
2. Najdi poslední node před `Respond to Webhook`
3. Zkontroluj strukturu JSON odpovědi

### Krok 2: Odděluj zdroje od textu

#### ❌ ŠPATNĚ (současný stav):

```json
{
  "output": "**Wany** jsou...\n\n![Obrázek](url)\n\n### Zdroje:\n- TČM-Wany, Autor: Bewit-eshop\n- Volně prodejné přípravky..."
}
```

**Problém:** Zdroje jsou součástí textu → nelze je zobrazit pod horizontální čarou.

#### ✅ SPRÁVNĚ:

```json
{
  "output": "**Wany** jsou...\n\n![Obrázek](url)",
  "sources": [
    {
      "uri": "https://example.com/tcm-wany.pdf",
      "title": "TČM-Wany, Autor: Bewit-eshop, BEWIT, Publikováno 2023"
    },
    {
      "uri": "https://example.com/bylinne-pripravky.pdf",
      "title": "Volně prodejné čínské bylinné přípravky, Autor: Mgr. Daniela Pilařová, Shanti Academy, Publikováno 2023"
    }
  ]
}
```

---

## 🔧 Jak upravit N8N workflow:

### Varianta A: Manuální split

1. **Node: "Set - Prepare Response"** (nebo podobný)
2. Přidej JavaScript Code node:

```javascript
// Vstupní text s markdown a zdroji
const fullText = $input.item.json.output;

// Najdi sekci "### Zdroje:" a rozděl text
const sourcesMatch = fullText.match(/###\s*Zdroje:([\s\S]*)$/i);

let mainText = fullText;
let sources = [];

if (sourcesMatch) {
  // Odstraň sekci zdrojů z hlavního textu
  mainText = fullText.replace(/###\s*Zdroje:[\s\S]*$/i, '').trim();
  
  // Parsuj zdroje z textu
  const sourcesText = sourcesMatch[1];
  const sourceLines = sourcesText.split('\n').filter(line => line.trim().startsWith('-'));
  
  sources = sourceLines.map(line => {
    const cleanLine = line.replace(/^-\s*/, '').trim();
    return {
      uri: "https://example.com/document.pdf", // TODO: Pokud máš URL, použij ji
      title: cleanLine
    };
  });
}

return {
  output: mainText,
  sources: sources
};
```

3. Tento node připoj před `Respond to Webhook`

### Varianta B: Automaticky ze zdrojových dat

Pokud máš zdroje jako samostatná data (např. z RAG systému):

```javascript
// Předpokládáme, že máš:
// - $input.item.json.answer (markdown text BEZ zdrojů)
// - $input.item.json.sourceDocuments (pole dokumentů)

const answer = $input.item.json.answer;
const sourceDocuments = $input.item.json.sourceDocuments || [];

// Transformuj zdroje do správného formátu
const sources = sourceDocuments.map(doc => ({
  uri: doc.metadata?.source || doc.metadata?.url || "https://example.com/doc.pdf",
  title: doc.metadata?.title || 
         `${doc.metadata?.filename || 'Dokument'}, Autor: ${doc.metadata?.author || 'Neznámý'}, Publikováno: ${doc.metadata?.year || 'N/A'}`
}));

return {
  output: answer,
  sources: sources
};
```

---

## 📋 Checklist před testem:

- [ ] N8N webhook vrací `output` pole s čistým markdown textem
- [ ] N8N webhook vrací `sources` jako pole objektů
- [ ] Každý source má `uri` (URL link)
- [ ] Každý source má `title` (text pro zobrazení)
- [ ] Text v `output` **NEOBSAHUJE** sekci "### Zdroje:"
- [ ] Markdown syntax je správná (`**tučně**`, `###` nadpisy, atd.)

---

## 🧪 Test:

### 1. Spusť SQL script pro Sana 2:

```bash
# V Supabase SQL editoru spusť:
cat add_sana_2_chatbot.sql
```

### 2. Restartuj aplikaci:

```bash
# Stiskni Ctrl+C v terminálu
npm run dev
```

### 3. Otevři Sana 2:

1. Otevři aplikaci v prohlížeči
2. Klikni na **"Správa chatbotů"**
3. Najdi kartu **"Sana 2"**
4. Klikni **"Spustit chat"**

### 4. Testuj dotaz:

Napiš: **"Co jsou Wany?"**

### 5. Zkontroluj výstup:

#### ✅ Správný výstup:

```
┌────────────────────────────────────────┐
│  Wany jsou speciální směsi tradiční    │  ← Tučný text!
│  čínské medicíny (TCM) ve formě        │
│  kuliček...                            │
│                                        │
│  Hlavní výhody wanů:                   │  ← Nadpis!
│  • Pročištění horkosti z těla.        │  ← Odrážky!
│  • Uvolnění blokád...                  │
│                                        │
│  [Obrázek s rounded corners]           │  ← Obrázek!
│                                        │
│  Doporučení: Před užíváním...          │  ← Tučný text!
└────────────────────────────────────────┘

─────────────────────────────────────────  ← Horizontální čára!

Soubory:
- TČM-Wany, Autor: Bewit-eshop...         ← Klikatelné odkazy!
- Volně prodejné čínské...
```

#### ❌ Špatný výstup (prostý text):

```
┌────────────────────────────────────────┐
│  **Wany** jsou speciální směsi         │  ← Hvězdičky viditelné!
│  tradiční čínské medicíny (TCM)...     │
│                                        │
│  ### Hlavní výhody wanů:               │  ← ### viditelné!
│  - **Pročištění** horkosti...          │
│                                        │
│  ### Zdroje:                           │  ← Zdroje v textu!
│  - TČM-Wany, Autor: Bewit-eshop...     │
└────────────────────────────────────────┘
```

**Pokud vidíš špatný výstup → N8N webhook nevrací správný formát!**

---

## 🔍 Debug:

Otevři Browser Console (F12) a zkontroluj:

```javascript
// Hledej tento log:
🔍 Původní odpověď z N8N: ...
🔧 Zpracovaný text: ...
```

Pokud vidíš `**text**` nebo `###` v logu, znamená to, že:
- `chatbotId` není `'sana_2'` → markdown rendering není aktivní
- Nebo React Markdown nefunguje správně

---

## 💡 Nejčastější chyby:

### 1. Zdroje jsou v textu místo samostatného pole

**Příčina:** N8N webhook nevrací `sources` pole  
**Řešení:** Přidej JavaScript node pro split zdrojů

### 2. Markdown se nezobrazuje (vidím `**text**`)

**Příčina:** `chatbotId` není `'sana_2'`  
**Řešení:** Zkontroluj, že v DB je `chatbot_id = 'sana_2'`

### 3. Chyba "Expected ) but found {"

**Příčina:** Syntax error v JSX  
**Řešení:** Již opraveno v posledním commitu

### 4. Horizontální čára se nezobrazuje

**Příčina:** `sources` nejsou v odpovědi z N8N  
**Řešení:** Zkontroluj formát JSON z webhooku

---

## 📞 Podpora:

Pokud stále nefunguje, zkontroluj:

1. **Console log** - Hledej chyby v F12 Developer Tools
2. **Network tab** - Zkontroluj odpověď z N8N webhooku
3. **SQL** - Ověř, že `chatbot_id = 'sana_2'` existuje v DB

---

**Vytvořeno:** 2. prosince 2025  
**Pro:** Sana 2 chatbot - Markdown rendering setup





