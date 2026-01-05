# 🚀 LoadingPhrases - Quick Start Guide

> **⏱️ Čas na zprovoznění: 2 minuty**

---

## ✅ Status

```
┌─────────────────────────────────────────┐
│  ✅  Implementace HOTOVA                │
│  ✅  Závislosti NAINSTALOVÁNY           │
│  ✅  Integrace DOKONČENA                │
│  🚀  READY TO USE                       │
└─────────────────────────────────────────┘
```

---

## 📦 Co už je hotovo

### 1. Instalace
```bash
✅ npm install framer-motion  (hotovo)
✅ npx shadcn@latest mcp init --client cursor  (hotovo)
```

### 2. Komponenta
```
✅ src/components/SanaChat/LoadingPhrases.tsx  (vytvořena)
✅ 30 zajímavých frází  (připraveno)
✅ Split Text animace  (implementována)
```

### 3. Integrace
```
✅ src/components/SanaChat/SanaChat.tsx  (upravena)
✅ TypingIndicator s frázemi  (hotovo)
```

---

## 🎯 Jak to používat

### Automaticky (v SanaChat)

**Funguje OKAMŽITĚ!** Není potřeba nic dělat.

```
1. Otevři chatbot
2. Odešli zprávu
3. LoadingPhrases se automaticky zobrazí
4. Každých 7 sekund nová fráze
```

### Manuálně (ve vlastním kódu)

```tsx
import LoadingPhrases from './components/SanaChat/LoadingPhrases';

// Základní použití
<LoadingPhrases />

// S vlastním intervalem
<LoadingPhrases changeInterval={5000} />
```

---

## 🎬 Vidět v akci

### Spusť demo stránku

```tsx
// 1. Import
import LoadingPhrasesDemo from './examples/LoadingPhrasesDemo';

// 2. Přidej do routeru nebo přímo zobraz
<LoadingPhrasesDemo />
```

### Nebo otevři v prohlížeči

```
http://localhost:5173/demo/loading-phrases
```

---

## 🎨 Co uvidíš

```
┌────────────────────────────────────────┐
│  🤖 Bot                                │
│  ┌──────────────────────────────────┐  │
│  │  • • •                           │  │
│  │                                  │  │
│  │  G e n e r u j i   o d p o v ě ď │  │ <- Animované
│  │  p r o   v á s . . .             │  │    písmena
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
     ↓ (7 sekund)
┌────────────────────────────────────────┐
│  🤖 Bot                                │
│  ┌──────────────────────────────────┐  │
│  │  • • •                           │  │
│  │                                  │  │
│  │  H l e d á m   v   d a t a b á z i │  │ <- Nová fráze
│  │  k n i h . . .                   │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

---

## ⚙️ Konfigurace

### Změnit interval

```tsx
// V src/components/SanaChat/SanaChat.tsx
<LoadingPhrases changeInterval={5000} />  // 5 sekund místo 7
```

### Přidat fráze

```tsx
// V src/components/SanaChat/LoadingPhrases.tsx
const loadingPhrases = [
    // ... existující fráze ...
    "Tvoje nová fráze zde...",
];
```

---

## 📊 Vlastnosti

```
✨ 30 českých frází
🎬 Split Text animace
🔀 Náhodná rotace
⏱️ Změna každých 7s
🚫 Nikdy stejná po sobě
⚡ Plynulé animace
```

---

## 🐛 Troubleshooting

### Build warnings?

```
⚠️ "use client" warnings jsou NORMÁLNÍ
   Framer Motion je určen pro Next.js
   V Vite lze ignorovat
```

### Animace nehraje?

```
✅ Zkontroluj: npm install framer-motion
✅ Refresh stránky
✅ Zkontroluj console pro errors
```

### Fráze se nemění?

```
✅ Zkontroluj prop: changeInterval={7000}
✅ Ověř, že komponenta není unmountována
```

---

## 📚 Dokumentace

| Dokument | Co obsahuje |
|----------|-------------|
| `README_LoadingPhrases_Implementation.md` | Hlavní README |
| `LoadingPhrases.README.md` | API dokumentace |
| `CHANGELOG_LoadingPhrases.md` | Změny |
| `LoadingPhrases_SUMMARY.md` | Souhrn s příklady |
| `LoadingPhrases_VISUAL_GUIDE.md` | Vizuální průvodce |
| `QUICK_START_LoadingPhrases.md` | Tento soubor |

---

## 💡 Quick Tips

### Tip 1: Spusť demo
```tsx
import LoadingPhrasesDemo from './examples/LoadingPhrasesDemo';
```

### Tip 2: Zkontroluj integraci
```tsx
// src/components/SanaChat/SanaChat.tsx
// Hledej: <LoadingPhrases changeInterval={7000} />
```

### Tip 3: Test v chatu
```
1. Otevři chatbot
2. Odešli zprávu
3. Pozoruj loading fráze
```

---

## 🎉 Hotovo!

```
╔════════════════════════════════════╗
║                                    ║
║  🎬  LoadingPhrases JE PŘIPRAVENO  ║
║                                    ║
║  🚀  Spusť aplikaci a vyzkoušej!   ║
║                                    ║
╚════════════════════════════════════╝
```

---

## 🚀 Spusť aplikaci

```bash
npm run dev
```

Otevři chatbot a pošli zprávu - uvidíš LoadingPhrases v akci! 🎬

---

**Čas strávený čtením tohoto dokumentu: ~1 minuta**  
**Čas na otestování v aplikaci: ~1 minuta**  
**Celkem: 2 minuty** ✅

---

## 📧 Potřebuješ pomoc?

- 📖 Přečti si [README_LoadingPhrases_Implementation.md](./README_LoadingPhrases_Implementation.md)
- 🎨 Podívej se na [LoadingPhrases_VISUAL_GUIDE.md](./LoadingPhrases_VISUAL_GUIDE.md)
- 🎬 Spusť [LoadingPhrasesDemo.tsx](./src/examples/LoadingPhrasesDemo.tsx)

---

**Verze**: 1.0.0  
**Status**: ✅ Ready  
**Datum**: 11. prosince 2024

**Užij si animace! 🎉**













