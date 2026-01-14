# Produktové feedy - Dynamické načítání

## 📋 Popis implementace

Upravena komponenta `ProductEmbeddingManagerFeed2` pro efektivní práci s velkými datasety produktových feedů.

## 🎯 Funkcionalita

### Prvotní načtení
- Načte se **1000 položek** z databáze při prvním otevření
- Zobrazí se informační banner s počtem načtených položek: "Načteno: 1000 z 5000 produktů"

### Paginace na frontendu
- Uživatel může procházet načtené položky po stranách (50, 100, 500, 1000 položek na stránku)
- Změna počtu položek na stránku je možná v selectu "Načíst po:"

### Dynamické donačítání
- Když uživatel dojde na poslední stránku, zobrazí se tlačítko **"📥 Načíst dalších X položek"**
- X = počet položek nastavený v pagination (50, 100, 500, nebo 1000)
- Po kliknutí se načte další batch položek z databáze
- Načtené položky se přidají k existujícím

## 🔧 Technické detaily

### Změny v `ProductEmbeddingManagerFeed2.tsx`

#### Nové state proměnné
```typescript
const [loadedCount, setLoadedCount] = useState<number>(1000); // Počet načtených položek z databáze
const [totalCount, setTotalCount] = useState<number>(0); // Celkový počet v databázi
const [loadingMore, setLoadingMore] = useState(false); // Indikátor načítání dalších položek
```

#### Upravená funkce `loadProducts`
- Přijímá parametr `append: boolean = false`
- Při `append = false`: Načte prvních 1000 položek (prvotní load)
- Při `append = true`: Načte dalších X položek podle `itemsPerPage` (donačítání)
- Používá Supabase `.range(offset, offset + limit - 1)` pro efektivní databázové dotazy

#### Informační banner
```tsx
<div style={styles.loadInfoBanner}>
  📦 Načteno: <strong>{loadedCount}</strong> z <strong>{totalCount}</strong> produktů
  {loadedCount < totalCount && (
    <span>(Zbývá načíst: {totalCount - loadedCount})</span>
  )}
</div>
```

#### Tlačítko "Načíst další"
- Zobrazuje se pouze když:
  - `loadedCount < totalCount` (jsou ještě položky k načtení)
  - `currentPage === totalPages` (jsme na poslední stránce)
- Při kliknutí volá `loadProducts(true)` pro donačtení dalších položek

## 📊 Statistiky

Upravený dashboard statistik:
- **V paměti**: Počet produktů aktuálně načtených v browseru
- **Bez embeddingu**: Produkty bez vygenerovaného embeddingu
- **Čeká**: Produkty ve frontě
- **Hotovo**: Produkty s dokončeným embeddingem
- **Chyby**: Produkty s chybou při generování embeddingu

## 🎨 Uživatelské rozhraní

### Hlavní ovládací prvky
1. **Vyhledávání**: Filtruje produkty v aktuálně načtených datech
2. **Status filtr**: Filtruje podle stavu embeddingu
3. **Refresh**: Znovu načte data (resetuje na prvních 1000)
4. **Paginace**: 
   - Select "Načíst po:" (50/100/500/1000)
   - Tlačítka: << < Stránka X z Y > >>
5. **Načíst další**: Donačte další položky podle pagination nastavení

### Vizuální indikátory
- **Banner**: Modrý informační banner s počtem načtených/celkových položek
- **Loading state**: "⏳ Načítám dalších X položek..." při donačítání
- **Zbývající počet**: "Zbývá načíst: X produktů"

## ✅ Výhody implementace

1. **Výkon**: Načítá se pouze to, co uživatel potřebuje
2. **Paměť**: Šetří RAM browseru (nemusí držet všechny položky)
3. **UX**: Rychlejší prvotní načtení
4. **Flexibilita**: Uživatel si může vybrat, kolik položek chce načítat najednou
5. **Transparentnost**: Vždy vidí, kolik položek je načteno a kolik zbývá

## 🔄 Kompatibilita

Všechny stávající funkce zůstávají funkční:
- ✅ Vyhledávání v načtených produktech
- ✅ Filtrování podle statusu
- ✅ Výběr produktů (checkbox)
- ✅ Hromadné operace (embedding, N8N webhook)
- ✅ Statistiky
- ✅ Refresh dat

## 📝 Poznámky

- První načtení je fixně na **1000 položek** (optimální pro většinu use-casů)
- Další načítání respektuje nastavení pagination selectu
- Filtrování a vyhledávání pracuje pouze s **již načtenými daty** (ne s celou databází)
- Pro vyhledání v celé databázi je potřeba nejdřív načíst všechny položky

## 🚀 Budoucí vylepšení

Možná rozšíření:
- Server-side vyhledávání (hledání napříč celou databází)
- Infinite scroll místo tlačítka
- Cache načtených dat
- Persistentní stav pagination mezi otevřeními
