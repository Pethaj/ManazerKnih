# LoadingPhrases Komponenta

## 📋 Popis

`LoadingPhrases` je React komponenta, která zobrazuje animované loading fráze s efektem **Split Text** inspirovaným [React Bits](https://reactbits.dev/text-animations/split-text). Každé písmeno textu se animuje samostatně s použitím Framer Motion knihovny.

## ✨ Vlastnosti

- 🎭 **30 unikátních frází** - motivující a zajímavé texty pro loading stav
- 🎬 **Split Text animace** - každé písmeno se animuje s spring efektem
- 🔀 **Náhodná rotace** - zajišťuje, že se nikdy neopakuje stejná fráze po sobě
- ⚡ **Výkonné animace** - využívá Framer Motion pro plynulé animace
- ⏱️ **Nastavitelný interval** - změna každých 7 sekund (konfigurovatelné)
- 🎯 **Zero duplicates** - inteligentní systém prevence opakování stejných frází

## 🚀 Použití

### Základní použití

```tsx
import LoadingPhrases from './components/SanaChat/LoadingPhrases';

function MyComponent() {
  return <LoadingPhrases />;
}
```

### S vlastním intervalem

```tsx
import LoadingPhrases from './components/SanaChat/LoadingPhrases';

function MyComponent() {
  return <LoadingPhrases changeInterval={5000} />; // Změna každých 5 sekund
}
```

### V TypingIndicator (doporučené použití)

```tsx
const TypingIndicator: React.FC = () => (
    <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-bewit-blue">
            <BotIcon className="w-5 h-5" />
        </div>
        <div className="px-4 py-3 rounded-2xl bg-white border shadow-sm">
            <div className="flex flex-col gap-3">
                {/* Animované tečky */}
                <div className="flex items-center space-x-1">
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                </div>
                {/* Animované loading fráze */}
                <LoadingPhrases changeInterval={7000} />
            </div>
        </div>
    </div>
);
```

## 🎨 Props

| Prop | Typ | Výchozí | Popis |
|------|-----|---------|-------|
| `changeInterval` | `number` | `7000` | Interval v milisekundách pro změnu fráze |

## 📚 Příklady frází

Komponenta obsahuje 30 pečlivě vybraných frází:

- "Generuji odpověď pro vás..."
- "Hledám tu nejlepší informaci..."
- "Moment, kontroluji databázi..."
- "Zpracovávám váš dotaz..."
- "Prosím o chvilku strpení..."
- ... a další!

## 🔧 Technické detaily

### Animační parametry

- **Stagger delay**: 0.03s mezi jednotlivými písmeny
- **Delay children**: 0.04s před zahájením animace
- **Spring animace**:
  - Damping: 12
  - Stiffness: 200
- **Transformace**: Y: 20px → 0px, Scale: 0.8 → 1.0, Opacity: 0 → 1

### Závislosti

- `framer-motion` - Pro animace
- `react` - Pro React komponenty

### Instalace závislostí

```bash
npm install framer-motion
```

## 🎯 Workflow

1. **Inicializace**: Komponenta začíná s náhodně vybranou frází
2. **Timer**: Každých N sekund (výchozí 7s) se spustí změna fráze
3. **Náhodný výběr**: Vybere se náhodná fráze, která NENÍ aktuální
4. **Tracking**: Používá `Set` pro sledování již použitých frází
5. **Reset**: Po projití všech frází se tracker resetuje
6. **Animace**: Split Text efekt se aplikuje na každou novou frázi

## 📁 Struktura souborů

```
src/
├── components/
│   └── SanaChat/
│       ├── LoadingPhrases.tsx          # Hlavní komponenta
│       ├── LoadingPhrases.README.md    # Dokumentace
│       └── SanaChat.tsx                 # Integrace v chatu
└── examples/
    └── LoadingPhrasesDemo.tsx          # Demo stránka
```

## 🧪 Testování

Pro testování komponenty je k dispozici demo stránka:

```tsx
import LoadingPhrasesDemo from './examples/LoadingPhrasesDemo';

// Spusť demo v aplikaci
```

Demo stránka nabízí:
- ✅ Live preview animací
- ✅ Interaktivní ovládání intervalu
- ✅ Zapnutí/vypnutí loading stavu
- ✅ Technické informace

## 🎨 Styling

Komponenta používá Tailwind CSS třídy:
- `text-slate-600` - Barva textu
- `text-sm` - Velikost písma
- `inline-block` - Pro správné chování animací

Pro změnu stylu můžete:

1. **Přepsat Tailwind třídy** v komponentě
2. **Přidat vlastní CSS** přes className prop
3. **Upravit motion varianty** pro jiné animační efekty

## 💡 Best Practices

1. **Použij v loading stavech** - Ideální pro čekání na API odpověď
2. **Nastav vhodný interval** - 7 sekund je optimální pro UX
3. **Kombinuj s jinými indikátory** - Tečky, spinner, atd.
4. **Používej v kontextu** - Chatbot, formuláře, uploady

## 🐛 Troubleshooting

### Animace se nehraje

- Zkontroluj, že je `framer-motion` nainstalován
- Ověř, že komponenta je viditelná v DOM

### Fráze se nemění

- Zkontroluj hodnotu `changeInterval` prop
- Ověř, že komponenta není unmountována

### Build warnings

Varování o "use client" direktivách jsou normální při použití Framer Motion s Vite bundlerem a lze je ignorovat.

## 📖 Reference

- [React Bits - Split Text](https://reactbits.dev/text-animations/split-text)
- [Framer Motion Dokumentace](https://www.framer.com/motion/)
- [Framer Motion Stagger Children](https://www.framer.com/motion/animation/#orchestration)

## 🔄 Changelog

### v1.0.0 (2024-12-11)
- ✅初版发布
- ✅ 30 unikátních frází
- ✅ Split Text animace s Framer Motion
- ✅ Náhodná rotace bez opakování
- ✅ Konfigurovatelný interval
- ✅ Integrace do SanaChat

## 📝 Licence

Součást Bewit Manažer Knih aplikace.

















