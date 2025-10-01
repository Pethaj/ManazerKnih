# Integrace s vektorovou databází přes n8n webhook

## Přehled
Aplikace nyní podporuje nahrávání knih do vektorové databáze pomocí n8n webhook. Každá kniha má stav nahrání, který je vizuálně indikován ikonou databáze.

## Funkce

### 1. Stav vektorové databáze
Každá kniha má pole `vectorStatus` s možnými hodnotami:
- `pending` - kniha čeká na nahrání (šedá ikona)
- `success` - kniha byla úspěšně nahrána (zelená ikona)
- `error` - nastala chyba při nahrávání (červená ikona)

### 2. Vizuální indikace
- **Ikona databáze** v seznamu knih ukazuje aktuální stav
- **Tooltip** při najetí myší zobrazuje stav a instrukce
- **Kliknutí** na ikonu spustí proces nahrání do vektorové databáze

### 3. Detail knihy
V detailním panelu knihy je zobrazen:
- **Stav vektorové DB** s ikonou a textovým popisem
- **Možnost manuální editace** stavu v editačním režimu

### 4. Webhook integrace
- **URL**: `https://n8n.srv801780.hstgr.cloud/webhook-test/10f5ed9e-e0b1-465d-8bc8-b2ba9a37bc58`
- **Metoda**: POST
- **Data**: JSON s metadaty knihy a binárním souborem v base64

## Implementované změny

### 1. Databáze (Supabase)
```sql
-- Spusťte tento SQL v Supabase SQL editoru
ALTER TABLE public.books 
ADD COLUMN vector_status TEXT DEFAULT 'pending' 
CHECK (vector_status IN ('pending', 'success', 'error'));

UPDATE public.books 
SET vector_status = 'pending' 
WHERE vector_status IS NULL;
```

### 2. TypeScript typy
- Rozšířen interface `Book` o pole `vectorStatus`
- Aktualizovány Supabase Database typy
- Upraveny funkce `createBook`, `updateBook`, `mapSupabaseToBook`

### 3. UI komponenty
- **IconDatabase**: Nyní přijímá `status` prop pro barevné rozlišení
- **BookListView**: Kliknutí na ikonu databáze spustí webhook
- **BookDetailPanel**: Zobrazení a editace vector statusu

### 4. API funkce
- `api.sendToVectorDatabase(book)`: Odesílá knihu do n8n webhook
- Stahuje soubor z Supabase Storage
- Převádí do base64 formátu
- Odesílá metadata + binární data
- Aktualizuje stav na základě odpovědi

## Použití

### Automatické nahrání
1. Klikněte na ikonu databáze u knihy v seznamu
2. Zobrazí se potvrzovací dialog s kontrolou metadat:
   - **Pokud chybí povinná metadata**: Dialog upozorní na chybějící pole
   - **Pokud jsou metadata kompletní**: Dialog požádá o potvrzení odeslání
3. Po potvrzení se stav změní na "pending" (šedá)
4. Po dokončení se stav změní na "success" (zelená) nebo "error" (červená)

### Povinná metadata
Před odesláním do vektorové databáze jsou kontrolována tato pole:
- **Autor** - nesmí být prázdný nebo "Neznámý"
- **Rok vydání** - musí být vyplněn
- **Nakladatelství** - nesmí být prázdné
- **Sumarizace** - musí obsahovat popis knihy
- **Klíčová slova** - musí být alespoň jedno
- **Kategorie** - musí být alespoň jedna

### Manuální editace stavu
1. Otevřete detail knihy
2. Klikněte na "Upravit metadata"
3. V poli "Stav vektorové databáze" vyberte požadovaný stav
4. Uložte změny

## Webhook payload
```json
{
  "bookId": "uuid-knihy",
  "metadata": {
    "id": "uuid-knihy",
    "title": "Název knihy",
    "author": "Autor",
    "publicationYear": 2023,
    "publisher": "Nakladatelství",
    "summary": "Shrnutí",
    "keywords": ["klíčové", "slova"],
    "language": "čeština",
    "format": "PDF",
    "fileSize": 1024,
    "categories": ["kategorie"],
    "labels": ["štítky"]
  },
  "fileData": "base64-encoded-file-content",
  "fileName": "kniha.pdf"
}
```

## Očekávaná odpověď z n8n
```json
{
  "success": true,
  "message": "Kniha byla úspěšně nahrána do vektorové databáze"
}
```

nebo

```json
{
  "success": false,
  "message": "Chyba při zpracování: popis chyby"
}
```

## Troubleshooting

### Kniha se nenahráva
1. Zkontrolujte, zda je webhook URL dostupný
2. Ověřte, že kniha má validní soubor v Supabase Storage
3. Zkontrolujte console pro error logy

### Ikona zůstává šedá
- N8n webhook neodpověděl správným JSON formátem
- Zkontrolujte síťové připojení
- Ověřte formát odpovědi z webhook

### Manuální oprava stavu
Pokud dojde k problému, můžete stav opravit manuálně:
1. Otevřete detail knihy
2. Klikněte "Upravit metadata"
3. Změňte "Stav vektorové databáze"
4. Uložte změny
