# Unifikace hlaviček chatů - Dokumentace změn

## 🎯 Cíl
Sjednotit vzhled hlavičky napříč všemi chaty (Sana Chat, Wany Chat, Product Chat, atd.) tak, aby měly všechny stejnou strukturu:
- **Logo SANA AI** na levé straně
- **Akční tlačítka** (Produkty, Export, Nový chat, Zavřít) na pravé straně
- **Jednotný modrý background** (bewit-blue)

## 📁 Vytvořené soubory

### `/src/components/ui/ChatHeader.tsx`
Nová sdílená komponenta pro hlavičku všech chatů.

**Vlastnosti:**
- ✅ Logo SANA AI (nebo custom content)
- ✅ Název chatbota (zobrazí se pod logem)
- ✅ Akční tlačítka (product, download, plus, close, custom)
- ✅ Jazyková tlačítka (CZ, SK, DE, UK)
- ✅ Podpora custom obsahu v levé části (např. filter toggle)
- ✅ Plně konfigurovatelná přes props

**Interface:**
```typescript
export interface ChatHeaderButton {
  icon: 'close' | 'product' | 'download' | 'plus' | 'custom';
  onClick: () => void;
  label: string;
  tooltip: string;
  isActive?: boolean;
  customIcon?: React.ReactNode;
}

export interface Language {
  code: string;
  label: string;
}

export interface ChatHeaderProps {
  chatbotName?: string;
  buttons?: ChatHeaderButton[];
  leftContent?: React.ReactNode;
  onClose?: () => void;
  languages?: Language[];
  selectedLanguage?: string;
  onLanguageChange?: (lang: string) => void;
}
```

## 🔄 Upravené soubory

### 1. `/src/components/ProductChat/ProductChat.tsx`
**Změny:**
- ✅ Import `ChatHeader`
- ✅ Nahrazena stará hlavička za novou `<ChatHeader />`
- ✅ Přidán `title` property do product mapping (fix TypeScript chyby)

**Použití:**
```tsx
<ChatHeader
  chatbotName="Product Chat - Produktová doporučení BEWIT"
  onClose={onClose}
  buttons={[]}
/>
```

### 2. `/src/components/ChatbotSettings/FilteredSanaChatWithSettings.tsx`
**Změny:**
- ✅ Import `ChatHeader` a `ChatHeaderButton`
- ✅ Nahrazena stará hlavička za novou `<ChatHeader />`
- ✅ Custom left content s filtry a logem
- ✅ Tlačítko pro správu produktů (podmíněně)

**Použití:**
```tsx
<ChatHeader
  chatbotName={chatbotDisplayName}
  onClose={onClose}
  leftContent={
    <div className="flex items-center space-x-4">
      {/* Filter toggle */}
      <div className="flex items-center space-x-2">
        <span className="text-sm text-white/80">Filtry</span>
        <label className="relative inline-flex items-center cursor-pointer">
          {/* Toggle switch */}
        </label>
      </div>
      <div className="h-6 w-px bg-white/20"></div>
      {/* Logo */}
    </div>
  }
  buttons={
    chatbotSettings.product_recommendations
      ? [{
          icon: 'product',
          onClick: toggleProductSync,
          label: isProductSyncVisible ? 'Skrýt produkty' : 'Spravovat produkty',
          tooltip: isProductSyncVisible ? 'Skrýt produkty' : 'Spravovat produkty BEWIT',
          isActive: isProductSyncVisible
        }]
      : []
  }
/>
```

### 3. `/src/components/SanaChat/SanaChat.tsx`
**Změny:**
- ✅ Import `ChatHeader`
- ✅ Nahrazena stará hlavička v `FilteredSanaChat` komponentě
- ✅ Přidána definice `languages` do component scope
- ✅ Plná podpora pro jazykové přepínače (CZ, SK, DE, UK)
- ✅ Všechna funkční tlačítka (Produkty, Nový chat, Export PDF, Zavřít)

**Použití:**
```tsx
<ChatHeader
  chatbotName={chatbotId || 'Sana Chat'}
  onClose={onClose}
  languages={languages}
  selectedLanguage={selectedLanguage}
  onLanguageChange={setSelectedLanguage}
  leftContent={
    <div className="flex items-center space-x-4">
      {/* Filter toggle + Logo */}
    </div>
  }
  buttons={[
    {
      icon: 'product',
      onClick: toggleProductSync,
      label: isProductSyncVisible ? 'Skrýt produkty' : 'Spravovat produkty',
      tooltip: isProductSyncVisible ? 'Skrýt produkty' : 'Spravovat produkty BEWIT',
      isActive: isProductSyncVisible
    },
    {
      icon: 'plus',
      onClick: handleNewChat,
      label: 'Nový chat',
      tooltip: 'Nový chat'
    },
    {
      icon: 'download',
      onClick: handleExportPdf,
      label: 'Export do PDF',
      tooltip: 'Export do PDF'
    }
  ]}
/>
```

## ✨ Výhody unifikace

1. **Konzistentní UX** - Všechny chaty mají stejný vzhled a ovládání
2. **Snadná údržba** - Změna v jednom souboru (`ChatHeader.tsx`) se projeví ve všech chatech
3. **Flexibilita** - Komponenta podporuje různé konfigurace (jazyky, custom obsah, různá tlačítka)
4. **Type-safe** - Plná TypeScript podpora s definovanými interface
5. **Accessibility** - Všechna tlačítka mají `aria-label` a `title` pro lepší přístupnost

## 🎨 Jednotný styl

Všechny chaty nyní mají:
- **Background:** `bg-bewit-blue` (modrý)
- **Text:** Bílý (`text-white`)
- **Tlačítka:** Bílý podklad s průhledností (`bg-white/10`, `hover:bg-white/20`)
- **Logo:** SANA AI s obrázkem (v SanaChat) nebo textem (ostatní)
- **Výška:** 16 (4rem, `h-16`)
- **Padding:** `pl-4 pr-4`

## 📸 Vizuální výsledek

Všechny chaty nyní vypadají stejně jako na příkladu Sana Chatu:
- Logo vlevo
- Funkční tlačítka vpravo
- Jednotný modrý background
- Responzivní design

## 🚀 Jak přidat hlavičku do nového chatu

```tsx
import ChatHeader from '../ui/ChatHeader';

// V komponentě:
<ChatHeader
  chatbotName="Název chatu"
  onClose={onClose} // Pokud má chat tlačítko pro zavření
  buttons={[
    {
      icon: 'product',
      onClick: handleProductClick,
      label: 'Produkty',
      tooltip: 'Spravovat produkty'
    }
    // ... další tlačítka
  ]}
  languages={languages} // Pokud má chat jazykové přepínače
  selectedLanguage={selectedLanguage}
  onLanguageChange={setSelectedLanguage}
/>
```

## ✅ Hotovo

Všechny chaty v aplikaci nyní používají jednotnou hlavičku s konzistentním vzhledem a funkčností! 🎉













