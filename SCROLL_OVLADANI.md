# Řízení scrollování v chatu

## Problém
Při kombinovaném vyhledávání (knihy + produkty) se nejdříve zobrazí výsledky z knih, pak se přidají produkty. Původně chat automaticky scrolloval dolů při každé změně, což znamenalo, že když se přidaly produkty, uživatel byl "vytržen" z četby a přesunut na spodek.

## Řešení

### Inteligentní auto-scroll
- ✅ **Nová zpráva od uživatele** → zapne auto-scroll a scrolluje na konec
- ✅ **Odpověď z knih** → zobrazí se s auto-scroll, pak se auto-scroll vypne  
- ❌ **Přidání produktů** → NEVYKONÁVÁ auto-scroll, zůstane na místě
- ✅ **Vizuální indikátor** → Ukáže tlačítko "Nový obsah" při přidání produktů

### Stav auto-scroll

```typescript
const [autoScroll, setAutoScroll] = useState<boolean>(true);

// Při nové zprávě od uživatele
setAutoScroll(true);

// Po zobrazení knih
setAutoScroll(false); // Zakáže scroll pro produkty
```

### ChatWindow komponenta

**Nové props:**
```typescript
interface ChatWindowProps {
    messages: ChatMessage[];
    isLoading: boolean;
    onSilentPrompt: (prompt: string) => void;
    shouldAutoScroll?: boolean; // 🆕 Řídí automatické scrollování
}
```

**Logika scrollování:**
```typescript
const newMessageAdded = messages.length > lastMessageCount;

if (shouldAutoScroll && (newMessageAdded || isLoading)) {
    // Scrolluj pouze při nových zprávách nebo loading
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollButton(false);
} else if (!shouldAutoScroll) {
    // Ukáž tlačítko pro manuální scroll
    setShowScrollButton(true);
}
```

### Vizuální indikátor

**Floating tlačítko:**
- 📍 Pozice: `fixed bottom-20 right-8`
- 🎨 Styl: Modrý, kulatý, s animací bounce
- 🔤 Text: "Nový obsah" + šipka dolů
- ⚡ Akce: Smooth scroll na konec + skryje tlačítko

```tsx
{showScrollButton && (
    <div className="fixed bottom-20 right-8 z-50">
        <button
            onClick={scrollToBottom}
            className="flex items-center gap-2 bg-bewit-blue text-white px-4 py-2 rounded-full shadow-lg hover:bg-blue-700 transition-all duration-200 animate-bounce"
            title="Přejít na konec chatu"
        >
            <span className="text-sm font-medium">Nový obsah</span>
            <svg>...</svg> {/* Šipka dolů */}
        </button>
    </div>
)}
```

## Scénáře použití

### 1. Pouze knihy nebo pouze produkty
- **Chování**: Normální auto-scroll (bez změn)
- **Důvod**: Není potřeba koordinace

### 2. Kombinované vyhledávání
**Timeline:**
```
0ms    → Uživatel pošle dotaz (autoScroll: true)
200ms  → Zobrazí se typing indicator (scroll dolů)
1200ms → Knihy dorazí (zobrazí se + autoScroll: false)
1800ms → Produkty dorazí (přidají se + zobrazí tlačítko "Nový obsah")
```

**UX výhoda:**
- 📖 Uživatel si přečte výsledky z knih
- 🛍️ Vidí notifikaci o nových produktech  
- 🎯 Sám se rozhodne, kdy se posunout dolů

### 3. Více aktualizací za sebou
- První aktualizace → Vypne auto-scroll
- Další aktualizace → Pouze ukáže/aktualizuje tlačítko
- Tlačítko zůstává, dokud uživatel neklikne

## Implementované změny

### Soubory:
- `src/components/SanaChat/SanaChat.tsx` - Hlavní logika

### Klíčové změny:
1. **State management** - `autoScroll` state v obou komponentách
2. **ChatWindow props** - Nový `shouldAutoScroll` parametr  
3. **Callback logika** - `setAutoScroll(false)` po knihách
4. **Visual feedback** - Floating tlačítko s indikátorem
5. **Smart detection** - Rozlišuje nové zprávy vs. aktualizace

## Testování

### Test scénář:
1. ✅ Zapněte obě možnosti (knihy + produkty)
2. ✅ Pošlete dotaz typu "Bolí mě záda"
3. ✅ Pozorujte: Chat scrolluje k výsledkům z knih
4. ✅ Pozorujte: Chat NESCROLLUJE při přidání produktů
5. ✅ Pozorujte: Zobrazí se tlačítko "Nový obsah"
6. ✅ Klikněte na tlačítko → smooth scroll dolů

### Console logy:
```
🔄 Auto-scroll: { shouldAutoScroll: true, newMessageAdded: true, isLoading: false }
📚 Zobrazuji výsledky z knih (priorita)
📍 Auto-scroll vypnutý - zobrazuji scroll tlačítko pro nový obsah
🛍️ Přidávám produkty k existující zprávě (bez auto-scroll)
```

## Backward compatibility
- ✅ **Zachováno**: Standardní chování pro jednotlivé zdroje
- ✅ **Zachováno**: Auto-scroll pro nové konverzace
- ✅ **Přidáno**: Inteligentní kontrola pro kombinované vyhledávání

Tato implementace výrazně zlepšuje UX při čtení dlouhých odpovědí s postupně přidávaným obsahem. 🎯
