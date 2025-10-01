# Oprava odesílání metadata do webhook

## Problém
Chat odesílal metadata jako prázdný objekt `{}` i když byly všechny filtry vybrané.

## Řešení

### 1. **Logika metadata**
Změnil jsem logiku aby metadata se odesílala **pouze** když jsou skutečně některé filtry omezené:

```typescript
// PŘED (chybné):
const metadata = {
  categories: selectedCategories.length > 0 ? selectedCategories : undefined,
  // ... vždy se vytvořil objekt s undefined hodnotami
}

// PO (správné):
const hasFilterRestrictions = 
  (selectedCategories.length > 0 && selectedCategories.length < availableCategories.length) ||
  (selectedLabels.length > 0 && selectedLabels.length < availableLabels.length) ||
  (selectedPublicationTypes.length > 0 && selectedPublicationTypes.length < availablePublicationTypes.length);

const metadata = hasFilterRestrictions ? {
  categories: selectedCategories.length > 0 && selectedCategories.length < availableCategories.length ? selectedCategories : undefined,
  // ...
} : undefined;
```

### 2. **Podmínka odesílání**
Upravil jsem `sendMessageToAPI` aby nepřidávala prázdná metadata:

```typescript
// Přidání metadata pouze pokud existují a nejsou prázdné
if (metadata && Object.keys(metadata).some(key => metadata[key as keyof ChatMetadata] !== undefined)) {
    payload.metadata = metadata;
}
```

## Testovací scénáře

### Scénář 1: Všechny filtry vybrané (default)
- **Stav**: Všechny checkboxy zaškrtnuté
- **Metadata**: `undefined`
- **Webhook payload**: NEOBSAHUJE pole `metadata`
- **Význam**: Prohledej všechny dokumenty bez omezení

```json
{
  "sessionId": "xxx",
  "action": "sendMessage", 
  "chatInput": "dotaz",
  "chatHistory": []
}
```

### Scénář 2: Některé filtry odškrtnuté
- **Stav**: Např. pouze "Aromaterapie" a "public" vybrané
- **Metadata**: obsahuje omezení
- **Webhook payload**: OBSAHUJE pole `metadata`

```json
{
  "sessionId": "xxx",
  "action": "sendMessage",
  "chatInput": "dotaz", 
  "chatHistory": [],
  "metadata": {
    "categories": ["Aromaterapie"],
    "publication_types": ["public"]
  }
}
```

### Scénář 3: Filter Reset (žádné vybrané)
- **Stav**: Všechny checkboxy odškrtnuté
- **Metadata**: `undefined` 
- **Webhook payload**: NEOBSAHUJE pole `metadata`
- **Význam**: Prohledej všechny dokumenty (žádné omezení)

## Debug zobrazení

V UI je nyní jasně vidět:
- **Zelený text**: "undefined (žádné omezení - všechny dokumenty)"
- **JSON struktura**: Když jsou metadata aktivní
- **Indikátor**: "Filtry jsou aktivní: ANO/NE"

## Ověření funkcionality

1. **Otevřete chat** → metadata by měla být "undefined"
2. **Odškrtněte některé filtry** → metadata se zobrazí jako JSON
3. **Pošlete zprávu** → zkontrolujte Network tab v Developer Tools
4. **Klikněte Filter Reset** → metadata zpět na "undefined"

## Důležité poznámky

- **Všechny vybrané = undefined** = prohledej vše
- **Žádné vybrané = undefined** = prohledej vše  
- **Částečně vybrané = JSON** = filtruj podle metadata

Tato logika je správná protože:
- Když uživatel nechce omezení → neposílej metadata
- Když uživatel chce specifické výsledky → pošli metadata s omezeními
