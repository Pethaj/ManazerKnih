# 🚀 Nastavení Chatbota Sana Local Format

Tento dokument popisuje kroky pro nastavení chatbota **"Sana Local Format"**, který nahrazuje původní **"Sana Chat"** v systému správy chatbotů. Tento chatbot má vylepšené markdown rendering schopnosti pro krásné formátování výstupu.

---

## 📋 Co se změnilo?

### Před (Sana Chat):
- `chatbot_id: 'sana_chat'`
- Standardní HTML rendering
- Zdroje zobrazeny uvnitř bílého bubble

### Po (Sana Local Format):
- `chatbot_id: 'sana_local_format'`
- **Pokročilý markdown rendering**
- Zdroje zobrazeny **pod** bubble s horizontální čarou
- Podpora pro:
  - **Tučný text** (`**text**`)
  - Nadpisy (`###`)
  - Seznamy (`-`)
  - Obrázky s profesionálním stylingem
  - Tabulky, code bloky, citace

---

## 🔧 Instalace

### Krok 1: Spusť SQL script

V Supabase SQL editoru spusť:

```sql
-- Soubor: replace_sana_with_local_format.sql
```

Tento script:
1. ✅ Přejmenuje existující `sana_chat` na `sana_local_format`
2. ✅ Nebo vytvoří nový záznam, pokud `sana_chat` neexistuje
3. ✅ Deaktivuje `sana_2`, pokud existuje (už není potřeba)

### Krok 2: Restartuj aplikaci

```bash
# Stiskni Ctrl+C v terminálu
npm run dev
```

### Krok 3: Aktualizuj N8N webhook

N8N webhook **MUSÍ** vracet tento formát:

```json
{
  "output": "**Markdown text BEZ sekce Zdroje**\n\n![Obrázek](url)",
  "sources": [
    {
      "uri": "https://url-k-dokumentu.pdf",
      "title": "Název, Autor: XY, Publikováno: 2023"
    }
  ]
}
```

**⚠️ DŮLEŽITÉ:**
- `output` pole **NESMÍ** obsahovat sekci `### Zdroje:`
- Zdroje musí být v samostatném poli `sources`
- Každý source musí mít `uri` a `title`

---

## 🎨 Jak vypadá výstup?

### Struktura:

```
┌────────────────────────────────────────┐
│  Wany jsou speciální směsi tradiční    │  ← Tučný text!
│  čínské medicíny (TCM)...              │
│                                        │
│  Hlavní výhody wanů:                   │  ← Nadpis!
│  • Pročištění horkosti                 │  ← Odrážky!
│  • Uvolnění blokád                     │
│                                        │
│  [Obrázek s rounded corners]           │  ← Profesionální styling!
│                                        │
│  Doporučení: Před užíváním...          │
└────────────────────────────────────────┘
       ↓ 16px spacing
───────────────────────────────────────────  ← Tenká šedá čára
       ↓ 16px spacing
Soubory:
- TČM-Wany, Autor: Bewit-eshop...         ← Klikatelné odkazy!
- Volně prodejné čínské...
```

---

## ✅ Test

### 1. Otevři aplikaci

1. Klikni na **"Správa chatbotů"**
2. Najdi kartu **"Sana Local Format"** (místo původního "Sana Chat")
3. Klikni **"Spustit chat"**

### 2. Testuj dotaz

Napiš: **"Co jsou Wany?"**

### 3. Zkontroluj výstup

#### ✅ Správný výstup:

- **Tučný text** je tučný (ne `**text**`)
- Nadpisy jsou větší a tučné
- Seznamy mají odrážky
- Obrázky mají zaoblené rohy a stín
- Pod textem je **tenká šedá horizontální čára**
- Pod čarou jsou zdroje jako **klikatelné odkazy**

#### ❌ Špatný výstup:

- Vidím `**text**` místo tučného textu
- Vidím `###` místo nadpisů
- Zdroje jsou v textu místo pod čarou

**Pokud vidíš špatný výstup:**
1. Zkontroluj, že SQL script proběhl správně
2. Zkontroluj N8N webhook formát
3. Zkontroluj Browser Console (F12) pro chyby

---

## 🔍 Technické detaily

### Detekce markdown renderingu:

```typescript
// V src/components/SanaChat/SanaChat.tsx
const usesMarkdown = chatbotId === 'sana_local_format';
```

### Podmíněný rendering:

```tsx
{usesMarkdown ? (
  // ReactMarkdown rendering
  <ReactMarkdown ...>
    {message.text}
  </ReactMarkdown>
) : (
  // Standardní HTML rendering
  <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
)}
```

### Zdroje mimo bubble (pouze pro Sana Local Format):

```tsx
{usesMarkdown && !isUser && message.sources && message.sources.length > 0 && (
  <div className="w-full mt-4 pt-4 border-t border-slate-200">
    {/* Horizontální čára je součástí border-t */}
    <div>
      <h4>Soubory</h4>
      {/* Klikatelné odkazy */}
    </div>
  </div>
)}
```

---

## 📝 Checklist

- [ ] SQL script `replace_sana_with_local_format.sql` spuštěn
- [ ] Aplikace restartována
- [ ] N8N webhook vrací správný formát
- [ ] `output` pole neobsahuje sekci "### Zdroje:"
- [ ] `sources` jsou v samostatném poli
- [ ] V aplikaci se zobrazuje "Sana Local Format" místo "Sana Chat"
- [ ] Markdown text se zobrazuje správně (tučný text, nadpisy)
- [ ] Horizontální čára odděluje text od zdrojů
- [ ] Zdroje jsou klikatelné odkazy

---

## 🎉 Hotovo!

Gratulujeme! Nyní máš:
- ✅ **Sana Local Format** chatbot s markdown renderingem
- ✅ Krásně naformátovaný výstup jako ChatGPT
- ✅ Horizontální čáru oddělující zdroje
- ✅ Profesionální styling

---

**Vytvořeno:** 2. prosince 2025  
**Pro:** Sana Local Format chatbot - náhrada za původní Sana Chat



