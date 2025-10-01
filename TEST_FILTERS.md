# Test filtrovacích funkcí v Sana AI Chat

## Testovací scénáře

### 1. Výchozí stav
- ✅ Všechny filtry jsou defaultně zaškrtnuté
- ✅ Metadata obsahují `undefined` (všechny filtry vybrané = žádné omezení)

### 2. Odškrtnutí některých kategorií
- Odškrtnout "Masáže" a "TČM"
- ✅ Metadata by měla obsahovat: `categories: ["Aromaterapie", "Akupunktura", "Diagnostika", "Wany"]`

### 3. Filter Reset
- Kliknout "Filter Reset"
- ✅ Všechny checkboxy se odškrtnou
- ✅ Metadata obsahují prázdné objekty pro všechny typy

### 4. Vybrat vše
- Kliknout "Vybrat vše"  
- ✅ Všechny checkboxy se zaškrtnou
- ✅ Metadata obsahují `undefined` (zpět na defaultní stav)

### 5. Štítky
- ✅ Zobrazují se: Relaxace, Zdraví, Wellness, Terapie, Alternativní medicína
- ✅ Funguje jejich zaškrtávání/odškrtávání

### 6. Debug metadata
- ✅ V žlutém boxu se zobrazují aktuální metadata
- ✅ Metadata se mění při změně filtrů

## Očekávaný formát metadata

### Všechny vybrané (default):
```json
{
  "categories": undefined,
  "labels": undefined, 
  "publication_types": undefined
}
```

### Částečně vybrané:
```json
{
  "categories": ["Aromaterapie", "Diagnostika"],
  "labels": ["Zdraví", "Wellness"],
  "publication_types": ["public"]
}
```

### Žádné vybrané:
```json
{
  "categories": undefined,
  "labels": undefined,
  "publication_types": undefined
}
```

## Testování webhook payloadu

Zkuste poslat zprávu do chatu s různými nastaveními filtrů a zkontrolujte:

1. **Network tab** v Developer Tools - payload obsahuje pole `metadata`
2. **n8n webhook** přijímá správná data
3. **Qdrant filtrování** pracuje s dodanými metadata

## Řešení problémů

### Metadata se neodesílají
- Zkontrolujte debug box - zobrazuje se správná struktura?
- Ověřte Network tab při odesílání zprávy

### Filtry nefungují v Qdrant
- Zkontrolujte strukturu metadata v Qdrant dokumentech
- Ověřte mapping mezi frontend metadata a Qdrant filtry

### UI problémy
- Zkontrolujte konzoli prohlížeče na chyby
- Ověřte že se správně načítají CSS třídy
