# Integrace iLovePDF API - Dokumentace

## Přehled

Implementovaná integrace s iLovePDF API umožňuje automatické zpracování PDF souborů při uploadu do aplikace. Uživatelé mohou vybrat, zda chtějí provést OCR (rozpoznání textu) a/nebo kompresi před uložením souboru do databáze.

## Funkcionalita

### 1. Upload Modal
- Při uploadu PDF souboru se automaticky zobrazí modal s možnostmi zpracování
- Uživatel může zvolit:
  - **Provést OCR**: Rozpoznání textu v naskenovaných dokumentech
    - **Výběr jazyka**: Dropdown s 30+ podporovanými jazyky z iLovePDF API
    - **Automatická detekce**: Systém se pokusí vybrat nejlepší jazyk podle metadat
  - **Provést kompresi**: Zmenšení velikosti souboru s výběrem úrovně:
    - **Low**: Minimální komprese (zachová kvalitu)
    - **Recommended**: Optimální poměr velikost/kvalita (výchozí)
    - **Extreme**: Maximální komprese (může snížit kvalitu)
  - Kombinaci obou možností
  - Žádné zpracování (standardní upload)

### 2. Workflow zpracování
1. **Detekce jazyka**: Systém automaticky detekuje jazyk dokumentu z metadat a navrhne nejlepší shodu
2. **Výběr jazyka**: Uživatel může upravit jazyk z dropdown seznamu podporovaných jazyků
3. **Výběr úrovně komprese**: Uživatel si vybere mezi Low/Recommended/Extreme
4. **OCR zpracování**: Pokud je zvoleno, provede se OCR ve vybraném jazyce
5. **Komprese**: Pokud je zvolena, provede se s vybranou úrovní
6. **Kombinované zpracování**: OCR se provede první, potom se na OCR výsledek aplikuje komprese
7. **Upload**: Zpracovaný soubor se nahraje do Supabase
8. **Cleanup**: Soubory se automaticky mažou z iLovePDF serverů

### 3. Mapování jazyků
Systém automaticky mapuje jazyky z aplikace na iLovePDF kódy:
- Čeština → ces
- Slovenština → slv  
- Angličtina → eng
- Němčina → deu
- A další (viz soubor `ilovepdfService.ts`)

## Technická implementace

### Nové soubory
- `/src/services/ilovepdfService.ts` - Hlavní služba pro komunikaci s iLovePDF API

### Upravené soubory
- `/index.tsx` - Přidána logika pro modal a zpracování souborů

### Nové komponenty
- Upload Processing Modal - Modal pro výběr opcí zpracování
  - Checkbox pro OCR s podmíněným dropdown pro jazyk
  - Checkbox pro kompresi
  - Dynamický informační box
  - Automatická detekce a nastavení nejlepšího jazyka

### API Key
Služba používá API klíč: `secret_key_f7f1f5202b3c109e82533ae8eb60325f_QlYDx414ba9d1382983d200382a941d1a2234`

## Workflow diagramu

```
PDF Upload
    ↓
Upload Modal (OCR/Komprese volby)
    ↓
Detekce jazyka z metadat
    ↓
iLovePDF zpracování:
  - Start Task
  - Upload File  
  - Process (OCR/Compress)
  - Download
  - Cleanup
    ↓
Upload do Supabase
    ↓
Uložení do databáze
```

## Bezpečnost a robustnost

- **Automatické mazání**: Všechny soubory se po zpracování automaticky mažou z iLovePDF serverů
- **Robustní error handling**: 
  - Retry mechanismus s exponential backoff (3 pokusy)
  - Kontrola zdraví API před spuštěním operací
  - Specifické chybové zprávy pro různé typy chyb
  - Fallback na upload bez zpracování při API problémech
- **Uživatelská volba**: Při selhání API se uživatel může rozhodnout pokračovat bez zpracování
- **Timeout protection**: Zpracování je navrženo tak, aby nevyvolalo timeout

## Omezení

- Pouze pro PDF soubory
- Závislé na dostupnosti iLovePDF API
- Zpracování může trvat několik sekund až minut dle velikosti souboru
- Potřebuje aktivní internetové připojení

## Rozšíření v budoucnu

Možnosti pro budoucí rozšíření:
- Batch zpracování více souborů současně
- Pokročilé OCR nastavení (layout detection, apod.)
- Další kompresní režimy
- Progress indikátory pro dlouhé operace
- Webhook notifikace po dokončení

## Použití

1. Vyberte PDF soubor k uploadu
2. V modalu zvolte požadované zpracování:
   - Zaškrtněte "Provést OCR" a vyberte jazyk z dropdown
   - Zaškrtněte "Provést kompresi" pro zmenšení velikosti
3. Zkontrolujte informace o zpracování
4. Klikněte "Zpracovat a nahrát"
5. Vyčkejte dokončení zpracování
6. Soubor se automaticky uloží do databáze se správnými OCR flags

### Podporované jazyky pro OCR
- Čeština, Slovenština, Angličtina, Němčina
- Francouzština, Španělština, Italština, Ruština
- Polština, Maďarština, a další (celkem 30+ jazyků)
- Automatické seřazení podle české abecedy

## Monitoring a řešení problémů

Veškeré operace jsou logovány do konzole s prefixem:
- 🔄 Pro zahájení zpracování
- 📝 Pro task operace
- 📤 Pro upload operace
- 🔍 Pro OCR operace
- 🗜️ Pro kompresní operace
- ✅ Pro úspěšné dokončení
- ❌ Pro chyby
- ⚠️ Pro retry pokusy
- ⏳ Pro čekání mezi pokusy
- 📁 Pro fallback upload

### Řešení běžných problémů

**HTTP 500 Server Error**: 
- Systém automaticky zkusí 3x s exponential backoff (2s, 4s, 8s)
- Pokud selžou všechny pokusy, nabídne se uživateli fallback upload
- Specifická error zpráva: "iLovePDF server má dočasný problém (HTTP 500)"

**Síťové problémy**:
- Detekce síťových chyb a timeout problemů
- Automatický retry pro dočasné výpadky
- Fallback na upload bez zpracování při trvalých problémech

**API Health Check**:
- Lehký HEAD request bez autorizace (3s timeout)
- Neblokuje upload při API problémech
- Používá se pouze pro optimalizaci, ne jako překážka

**Intelligentní Error Messages**:
- Specifické zprávy pro různé typy chyb
- Vždy nabízí konkrétní řešení (fallback upload)
- Česky psané, uživatelsky přívětivé
