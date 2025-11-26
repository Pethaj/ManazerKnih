# Implementace Tlačítka s Gradientním Textem

## Přehled změn

Tlačítko "Doporuč produkty" bylo upraveno na světlý design s animovaným gradientním textem.

## Vytvořené soubory

### 1. `/src/components/ui/GradientText.tsx`
Reusable komponenta pro animovaný gradientní text.

**Vlastnosti:**
- `children`: Text nebo obsah pro zobrazení
- `className`: Volitelné CSS třídy
- `colors`: Pole barev pro gradient (default: `['#40ffaa', '#4079ff', '#40ffaa', '#4079ff', '#40ffaa']`)
- `animationSpeed`: Rychlost animace v sekundách (default: `8`)
- `showBorder`: Zobrazit gradient border (default: `false`)

**Použití:**
```tsx
<GradientText 
  colors={['#40ffaa', '#4079ff', '#40ffaa', '#4079ff', '#40ffaa']}
  animationSpeed={8}
  showBorder={false}
>
  Doporuč produkty
</GradientText>
```

### 2. `/src/components/ui/GradientText.css`
CSS styly pro animovaný gradient text včetně keyframe animací.

**Klíčové vlastnosti:**
- Plynulá animace gradientu zleva doprava
- Background-clip na text pro průhledný efekt
- Volitelný gradient border s průhledným středem

### 3. `/src/components/ProductRecommendationButton.css`
CSS styly specifické pro tlačítko produktového doporučení.

**Vlastnosti:**
- Světlé pozadí (`#f8f9fa`)
- Jemný border (`#e0e6ed`)
- Hover efekt s elevation
- Spinner animace pro loading stav
- Disabled stav

## Upravené soubory

### `/src/components/ProductRecommendationButton.tsx`

**Změny:**
1. Import `GradientText` komponenty
2. Import CSS stylů
3. Změna pozadí tlačítka na světlé (`#f8f9fa`)
4. Odstranění emoji z textu
5. Nahrazení jednoduchého textu komponentou `GradientText`
6. Aktualizace spinner borderu na modrou barvu
7. Přidání hover efektů přes CSS třídy

**Před:**
```tsx
<button style={{ backgroundColor: '#007bff', color: 'white' }}>
  <ProductIcon />
  <span>💊 Doporučit produkty</span>
</button>
```

**Po:**
```tsx
<button style={{ backgroundColor: '#f8f9fa', color: '#2c3e50' }}>
  <ProductIcon />
  <GradientText 
    colors={['#40ffaa', '#4079ff', '#40ffaa', '#4079ff', '#40ffaa']}
    animationSpeed={8}
    showBorder={false}
  >
    Doporuč produkty
  </GradientText>
</button>
```

## Design specifikace

### Barvy
- **Pozadí tlačítka:** `#f8f9fa` (světle šedá)
- **Border:** `#e0e6ed` (jemná šedá)
- **Gradient barvy:** 
  - Zelená: `#40ffaa`
  - Modrá: `#4079ff`

### Animace
- **Rychlost:** 8 sekund
- **Typ:** Lineární, nekonečná smyčka
- **Směr:** Zleva doprava
- **Background size:** 300% pro smooth přechod

### Hover efekt
- Světlejší pozadí (`#ffffff`)
- Zvětšený shadow (`0 4px 12px rgba(0, 0, 0, 0.1)`)
- Posun nahoru o 1px (`translateY(-1px)`)

### Loading stav
- Modrý spinner (`#007bff`)
- Text: "Načítám doporučení..."
- Disabled stav s opacity 0.6

## Použití

Tlačítko se automaticky zobrazuje na konci zprávy chatu:

```tsx
<ProductRecommendationButton
  userQuery="poslední dotaz uživatele"
  botResponse="odpověď chatbota"
  sessionId="session-id"
  onProductsLoaded={(products) => console.log(products)}
/>
```

## Technické detaily

### CSS Animations
- Používá `@keyframes gradient` pro animaci
- `background-clip: text` pro průhledný text s gradientem
- `animation: gradient linear infinite` pro nekonečnou smyčku

### React Props
- Všechny props jsou plně typované s TypeScript
- Výchozí hodnoty pro všechny volitelné props
- Reusable komponenta použitelná kdekoli v aplikaci

## Testování

Tlačítko by mělo:
1. ✅ Zobrazit světlé pozadí
2. ✅ Zobrazit animovaný gradientní text
3. ✅ Reagovat na hover s elevation efektem
4. ✅ Zobrazit spinner při načítání
5. ✅ Být disabled během načítání
6. ✅ Zobrazit produkty po kliknutí

## Poznámky

- Komponenta `GradientText` je reusable a může být použita i pro jiné části aplikace
- Animace je optimalizovaná pro výkon (používá pouze `background-position`)
- Podpora pro všechny moderní prohlížeče včetně Safari (`-webkit-background-clip`)

