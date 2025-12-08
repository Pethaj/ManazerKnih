# 📊 Formátování tabulek v chatech

## ✅ Implementace dokončena

Tabulky v chat odpovědích z n8n jsou nyní automaticky formátovány jako **pěkné designové tabulky**.

## 🎨 Design tabulek

Tabulky mají následující vlastnosti:

### Vizuální vlastnosti:
- **Hlavička (thead)**: 
  - Modrý gradient pozadí (bewit-blue → blue-700)
  - Bílý text
  - Uppercase text s větším tracking
  - Silné fonty (bold)
  
- **Buňky (td)**:
  - Bílé pozadí
  - Šedý text (slate-700)
  - Dostatečný padding (px-6 py-4)
  - Automatické zarovnání textu
  
- **Řádky (tr)**:
  - Hover efekt (světle šedé pozadí při najetí myší)
  - Smooth přechody
  - Oddělené tenkou čarou
  
- **Container**:
  - Zaoblené rohy (rounded-lg)
  - Stín pro 3D efekt
  - Ohraničení (border)
  - Automatický horizontal scroll při překročení šířky

## 📝 Jak použít v n8n

V n8n workflow stačí vrátit markdown tabulku v odpovědi:

### Příklad jednoduchá tabulka:

```markdown
## Složení směsi Wanů 004

| Složka | Množství (g) |
|--------|--------------|
| Chuan Xiong | 5 g |
| Bo He | 6 g |
| Bai Zhi | 6 g |
| Man Jing Zi | 6 g |
| Qiang Huo | 6 g |
| Gan Cao | 3 g |
```

### Příklad složitější tabulka:

```markdown
## Porovnání produktů

| Produkt | Cena | Dostupnost | Hodnocení |
|---------|------|------------|-----------|
| Bewit LoveYOU | 890 Kč | Skladem | ⭐⭐⭐⭐⭐ |
| Bewit Immune | 750 Kč | Skladem | ⭐⭐⭐⭐ |
| Bewit Detox | 650 Kč | Na objednávku | ⭐⭐⭐⭐ |
```

## 🔧 Technické detaily

### Podporované formáty:
- ✅ Markdown tabulky (GFM - GitHub Flavored Markdown)
- ✅ HTML tabulky (když jsou zabaleny v odpovědi)
- ✅ Vnořené tabulky (pokud je potřeba)

### Kde funguje:
- ✅ SanaChat (webový chat widget)
- ✅ Sana Local Format (markdown chatbot)
- ✅ Vany Chat (speciální chatbot pro Wany)
- ✅ Všechny ostatní chatboty používající n8n webhook

### CSS třídy použité:
```css
/* Table container */
.overflow-x-auto.my-4.rounded-lg.shadow-sm.border.border-slate-200

/* Table */
.min-w-full.border-collapse.bg-white

/* Header */
.bg-gradient-to-r.from-bewit-blue.to-blue-700

/* Header cells */
.px-6.py-3.text-left.text-xs.font-bold.text-white.uppercase.tracking-wider

/* Body */
.divide-y.divide-slate-200

/* Rows */
.hover:bg-slate-50.transition-colors

/* Cells */
.px-6.py-4.text-sm.text-slate-700.whitespace-nowrap
```

## 🎯 Automatická detekce

Systém automaticky detekuje:
1. Markdown tabulky v odpovědi
2. HTML tabulky v odpovědi
3. Aplikuje styling bez nutnosti speciálního nastavení

## 🌟 Výhody

- **Profesionální vzhled**: Tabulky vypadají moderně a čitelně
- **Responsivní**: Automatický horizontal scroll na mobilech
- **Přístupné**: Správná sémantika HTML pro screen readery
- **Konzistentní**: Stejný styl ve všech chatech
- **Bez konfigurace**: Funguje out-of-the-box

## 📱 Mobilní zařízení

Na mobilních zařízeních:
- Tabulka je scrollovatelná horizontálně
- Zachová si čitelnost
- Neporuší layout stránky

## 🚀 Ready to use!

Stačí začít posílat markdown tabulky z n8n a uvidíte je pěkně naformátované v chatech!
