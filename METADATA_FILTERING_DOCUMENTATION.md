# Implementace Metadata Filtrování pro Sana AI Chat

## Přehled

Tato implementace přidává funkcionalitu filtrování na základě metadata do Sana AI Chat aplikace. Chat nyní umožňuje uživatelům filtrovat výsledky podle kategorií, štítků a typů publikací, čímž se zlepšuje přesnost vyhledávání ve vektorové databázi Qdrant.

## Hlavní funkce

### 1. Filtrovací UI
- **Levý panel s filtry** obsahuje checkboxy pro:
  - **Kategorie**: Aromaterapie, Masáže, Akupunktura, Diagnostika, TČM, Wany
  - **Typy publikací**: Veřejné (public), Pro studenty (students), Interní (internal_bewit)  
  - **Štítky**: Dynamicky načítané (pokud jsou k dispozici)

### 2. Webhook integrace
- **Rozšířený payload**: Do webhook se nyní odesílají vybraná metadata v novém poli `metadata`
- **Formát pro Qdrant**: Metadata jsou strukturovaná pro snadné filtrování v Qdrant vector store

### 3. Struktura metadata

#### Odesílaná data do webhooku:
```json
{
  "sessionId": "unique-session-id",
  "action": "sendMessage", 
  "chatInput": "uživatelský dotaz",
  "chatHistory": [...],
  "metadata": {
    "categories": ["Aromaterapie", "Diagnostika"],
    "publication_types": ["public", "students"],
    "labels": []
  }
}
```

#### Očekávaný formát pro Qdrant filtrování:
```json
{
  "should": [
    {
      "key": "metadata.categories",
      "match": {
        "value": "Aromaterapie"
      }
    },
    {
      "key": "metadata.categories", 
      "match": {
        "value": "Diagnostika"
      }
    },
    {
      "key": "metadata.publication_type",
      "match": {
        "value": "public"
      }
    },
    {
      "key": "metadata.publication_type",
      "match": {
        "value": "students"
      }
    }
  ]
}
```

## Technická implementace

### 1. Nové komponenty

#### `FilteredSanaChat`
- Hlavní komponenta obsahující filtry a chat
- Spravuje stav vybraných filtrů
- Předává metadata do `SanaChat` komponenty

#### Rozšířený `SanaChat`
- Přijímá metadata jako props
- Odesílá metadata v payload webhooku
- Zachovává zpětnou kompatibilitu

### 2. Typ definice

```typescript
interface ChatMetadata {
  categories?: string[];
  labels?: string[];
  publication_types?: string[];
}

interface SanaChatProps {
  metadata?: ChatMetadata;
}
```

### 3. Hlavní změny v kódu

#### `sendMessageToAPI` funkce:
```typescript
const sendMessageToAPI = async (
  message: string, 
  sessionId: string, 
  history: ChatMessage[], 
  metadata?: ChatMetadata
): Promise<{ text: string; sources: Source[] }> => {
  const payload: any = {
    sessionId,
    action: "sendMessage",
    chatInput: message,
    chatHistory: history,
  };

  // Přidání metadata pokud jsou k dispozici
  if (metadata) {
    payload.metadata = metadata;
  }
  // ...
}
```

## Využití v n8n workflow

### Příklad zpracování metadata v n8n:

1. **Příjem dat**: Webhook přijme payload s metadata
2. **Transformace pro Qdrant**: Převod metadata do Qdrant filter formátu
3. **Vyhledávání**: Použití filtrů při dotazování Qdrant vector store
4. **Výsledky**: Vrácení pouze relevantních dokumentů

### Doporučený n8n node kód:

```javascript
// Získání metadata z webhook payload
const metadata = $json.metadata || {};

// Transformace na Qdrant filter
const qdrantFilter = {
  should: []
};

// Přidání kategorie filtrů
if (metadata.categories && metadata.categories.length > 0) {
  metadata.categories.forEach(category => {
    qdrantFilter.should.push({
      key: "metadata.categories",
      match: { value: category }
    });
  });
}

// Přidání type filtrů
if (metadata.publication_types && metadata.publication_types.length > 0) {
  metadata.publication_types.forEach(type => {
    qdrantFilter.should.push({
      key: "metadata.publication_type", 
      match: { value: type }
    });
  });
}

// Přidání label filtrů
if (metadata.labels && metadata.labels.length > 0) {
  metadata.labels.forEach(label => {
    qdrantFilter.should.push({
      key: "metadata.labels",
      match: { value: label }
    });
  });
}

// Použití filtru v Qdrant dotazu
return {
  filter: qdrantFilter.should.length > 0 ? qdrantFilter : undefined,
  query: $json.chatInput
};
```

## Struktura Qdrant metadata

Pro správné fungování filtrování musí být dokumenty v Qdrant uloženy s následující strukturou metadata:

```json
{
  "metadata": {
    "categories": "Aromaterapie,TČM",
    "publication_type": "public",
    "labels": "",
    "document_name": "Tradiční čínská medicína",
    "Author": "David Pánek",
    // ... další metadata
  }
}
```

## Nasazení a konfigurace

### 1. Frontend (React aplikace):
- Komponenty jsou automaticky aktivní po implementaci
- Filtry se zobrazují v levém panelu chat widgetu
- Rozměry widgetu byly zvětšeny pro lepší UX (1200x700px)

### 2. Backend (n8n workflow):
- Aktualizovat webhook endpoint pro zpracování nového pole `metadata`
- Implementovat logiku pro transformaci metadata na Qdrant filtry
- Otestovat filtrování s různými kombinacemi metadata

### 3. Qdrant databáze:
- Ověřit strukturu metadata v uložených dokumentech
- Přidat indexy pro lepší výkon filtrování (pokud je to potřeba)

## Testování

### Testovací scénáře:

1. **Bez filtrů**: Chat funguje jako dříve, prohledává všechny dokumenty
2. **Jeden filtr**: Aktivace pouze kategorie "Aromaterapie"
3. **Více filtrů**: Kombinace kategorií + typů publikací
4. **Prázdné výsledky**: Filtry které nevrátí žádné dokumenty

### Příklad testovacího payloadu:

```json
{
  "sessionId": "test-session",
  "action": "sendMessage",
  "chatInput": "Jaké jsou účinky levandule?",
  "metadata": {
    "categories": ["Aromaterapie"],
    "publication_types": ["public"]
  }
}
```

## Budoucí rozšíření

### Možné vylepšení:

1. **Dynamické načítání filtrů**: Připojení k Supabase pro načítání aktuálních kategorií a štítků
2. **Uložení preferencí**: Zapamatování si vybraných filtrů mezi sessions
3. **Pokročilé filtry**: Datum publikace, autor, jazyk
4. **Rychlé filtry**: Přednastavené kombinace filtrů
5. **Vizuální feedback**: Zobrazení počtu dostupných dokumentů pro každý filtr

## Závěr

Implementace metadata filtrování výrazně zlepšuje přesnost a relevanci výsledků v Sana AI Chat. Uživatelé nyní mohou cíleně vyhledávat v konkrétních kategoriích dokumentů, což zvyšuje efektivitu práce s knihovnou znalostí.

Systém je navržen modulárně a umožňuje snadné rozšíření o další typy filtrů v budoucnosti.
