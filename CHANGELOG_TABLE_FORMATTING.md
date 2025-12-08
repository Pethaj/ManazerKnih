# 📋 Changelog - Formátování tabulek v chatech

## 🎉 Nová funkcionalita: Pěkné designové tabulky

**Datum:** 5. prosince 2025  
**Autor:** AI Assistant  
**Verze:** 1.0.0

---

## 🎯 Co bylo implementováno

Přidáno automatické formátování tabulek v chat odpovědích z n8n webhooků jako **pěkné designové tabulky**.

### ✅ Změny v kódu

#### Soubor: `src/components/SanaChat/SanaChat.tsx`

Byly aktualizovány všechny instance ReactMarkdown komponent pro podporu pěkných tabulek:

1. **Hlavní markdown rendering** (řádek ~865)
2. **Inline produktové buttony - text před markerem** (řádek ~703)
3. **Inline produktové buttony - text po markeru** (řádek ~750)
4. **Fallback rendering bez markerů** (řádek ~784)

### 🎨 Styling tabulek

Každá tabulka obsahuje následující CSS třídy:

```jsx
table: ({node, ...props}) => (
    <div className="overflow-x-auto my-4 rounded-lg shadow-sm border border-slate-200">
        <table className="min-w-full border-collapse bg-white" {...props} />
    </div>
),
thead: ({node, ...props}) => <thead className="bg-gradient-to-r from-bewit-blue to-blue-700" {...props} />,
tbody: ({node, ...props}) => <tbody className="divide-y divide-slate-200" {...props} />,
tr: ({node, ...props}) => <tr className="hover:bg-slate-50 transition-colors" {...props} />,
th: ({node, ...props}) => <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider" {...props} />,
td: ({node, ...props}) => <td className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap" {...props} />,
```

### 🌟 Vlastnosti designu

- ✅ **Modrý gradient** v hlavičce tabulky (bewit-blue → blue-700)
- ✅ **Bílý text** v hlavičce s uppercase transformací
- ✅ **Hover efekt** na řádcích (světle šedé pozadí)
- ✅ **Zaoblené rohy** na celém containeru
- ✅ **Stín** pro 3D efekt
- ✅ **Responsive** - automatický horizontal scroll
- ✅ **Rozdělení řádků** tenkou čarou pro lepší čitelnost
- ✅ **Dostatečný padding** v buňkách (6x3 pro th, 6x4 pro td)

---

## 📦 Nové soubory

### 1. `TABLE_FORMATTING_INFO.md`
Dokumentace o formátování tabulek - jak funguje, jak použít, příklady.

### 2. `test-table-preview.html`
Testovací HTML stránka pro vizuální náhled tabulek v browseru.

### 3. `CHANGELOG_TABLE_FORMATTING.md`
Tento soubor - changelog změn.

---

## 🧪 Testování

### Jak otestovat:

1. **V browseru:**
   - Otevřete `test-table-preview.html` v prohlížeči
   - Uvidíte pěkně naformátované tabulky

2. **V aplikaci:**
   - Spusťte aplikaci: `npm run dev`
   - Otevřete chat widget
   - Pošlete dotaz do n8n, který vrátí markdown tabulku
   - Tabulka se automaticky naformátuje

### Příklad n8n odpovědi:

```markdown
## Složení směsi

| Složka | Množství |
|--------|----------|
| Chuan Xiong | 5 g |
| Bo He | 6 g |
| Bai Zhi | 6 g |
```

---

## 🔧 Kompatibilita

### Podporované formáty:
- ✅ Markdown tabulky (GFM)
- ✅ HTML tabulky
- ✅ Vnořené tabulky

### Podporované chat komponenty:
- ✅ SanaChat (hlavní chat widget)
- ✅ Sana Local Format (markdown chatbot)
- ✅ Vany Chat (speciální chatbot)
- ✅ Všechny chatboty používající n8n webhook

---

## 💡 Použití

### V n8n workflow:

Stačí vrátit markdown tabulku v odpovědi:

```json
{
  "output": "## Tabulka\n\n| Sloupec 1 | Sloupec 2 |\n|-----------|----------|\n| Data 1 | Data 2 |"
}
```

Systém automaticky detekuje tabulku a aplikuje pěkný design.

---

## 🚀 Výhody

1. **Profesionální vzhled** - Tabulky vypadají moderně
2. **Automatické** - Není potřeba nic konfigurovat
3. **Responsive** - Funguje i na mobilech
4. **Konzistentní** - Stejný styl ve všech chatech
5. **Přístupné** - Správná HTML sémantika

---

## 📝 Poznámky

- Tabulky fungují i se složitějšími strukturami (více sloupců, vnořené elementy)
- Pokud text přesáhne šířku tabulky, aktivuje se horizontal scroll
- Emojis a speciální znaky v tabulkách jsou plně podporovány
- Tabulky se správně zobrazují v light/dark mode

---

## 🎓 Pro vývojáře

### Jak upravit design:

1. Otevřete `src/components/SanaChat/SanaChat.tsx`
2. Najděte všechny instance `table:`, `thead:`, `tbody:`, `tr:`, `th:`, `td:` v ReactMarkdown componentách
3. Upravte CSS třídy podle potřeby
4. Tailwind CSS třídy jsou použity pro styling

### Příklad změny barvy hlavičky:

```jsx
thead: ({node, ...props}) => <thead className="bg-gradient-to-r from-purple-600 to-pink-600" {...props} />,
```

---

## ✨ Hotovo!

Tabulky v chatech nyní vypadají profesionálně a moderně! 🎉
