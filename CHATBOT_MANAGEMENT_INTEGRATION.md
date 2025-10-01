# Integrace nastavení filtrací do Správy chatbotů

## Provedené změny

### 1. Rozšíření ChatbotManagement komponenty

Stávající komponenta `ChatbotManagement.tsx` byla rozšířena o:

#### Nové importy a závislosti
```typescript
import { 
  ChatbotSettingsService, 
  ChatbotSettings, 
  Category, 
  PublicationType, 
  CreateChatbotSettingsData,
  UpdateChatbotSettingsData 
} from '../services/chatbotSettingsService';
```

#### Nový state pro správu dat z databáze
```typescript
// Načítání dat z Supabase
const [chatbotSettings, setChatbotSettings] = useState<ChatbotSettings[]>([]);
const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
const [availablePublicationTypes, setAvailablePublicationTypes] = useState<PublicationType[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [savingChatbotId, setSavingChatbotId] = useState<string | null>(null);
```

#### Automatické načítání dat při startu
```typescript
useEffect(() => {
    const loadChatbotData = async () => {
        // Načte všechna nastavení chatbotů, kategorie a typy publikací z Supabase
        const [settings, categories, publicationTypes] = await Promise.all([
            ChatbotSettingsService.getAllChatbotSettings(),
            ChatbotSettingsService.getCategories(),
            ChatbotSettingsService.getPublicationTypes(),
        ]);
        // ...
    };
    loadChatbotData();
}, []);
```

#### Nové funkce pro správu nastavení
- `toggleChatbotCategory()` - Zapne/vypne kategorii pro chatbota
- `toggleChatbotPublicationType()` - Zapne/vypne typ publikace pro chatbota  
- `toggleChatbotFunction()` - Zapne/vypne základní funkce (produkty, knihy)
- `updateChatbotSettings()` - Univerzální funkce pro ukládání do databáze

### 2. Rozšířené UI v tabu "Chatboty"

#### Nové sekce pro každý chatbot:
1. **Základní informace**
   - Název chatbota a status (Aktivní/Neaktivní)
   - Popis a ID chatbota
   - Indikátor ukládání

2. **🔧 Základní funkce**
   - ✅ Produktová doporučení
   - ✅ Databáze knih

3. **🔍 Povolené kategorie**
   - Checkbox seznam všech dostupných kategorií
   - Počítadlo: (vybrané/celkem)

4. **📄 Povolené typy publikací**
   - Checkbox seznam s popisky
   - Zobrazení popisu každého typu

5. **💬 Test chatu**
   - Tlačítko pro spuštění s aktuálním nastavením

### 3. Automatické ukládání do Supabase

Všechny změny se **automaticky ukládají** do databáze:
```typescript
// Při každé změně se volá:
await ChatbotSettingsService.updateChatbotSettings(chatbotId, updates);
```

**Indikátory pro uživatele:**
- 💾 "Ukládám..." - během ukládání
- ✅ Zelená zpětná vazba v konzoli
- ❌ Chybové hlášky při problémech

## Jak používat

### 1. Instalace databáze
```sql
-- Spusťte v Supabase SQL editoru
-- create_chatbot_settings_table.sql
```

### 2. Spuštění aplikace
```bash
# Normální spuštění aplikace
npm start
```

### 3. Otevření správy chatbotů
1. V hlavní aplikaci klikněte na **"🤖 Správa chatbotů"**
2. Zůstaňte v tabu **"Chatboty"**

### 4. Konfigurace chatbotů
Pro každý chatbot můžete:
- ✅ Zapnout/vypnout produktová doporučení
- ✅ Zapnout/vypnout přístup k databázi knih
- 🔍 Vybrat povolené kategorie léčby
- 📄 Vybrat povolené typy publikací

**Všechny změny se automaticky ukládají!**

### 5. Testování
- Klikněte na **"💬 Spustit chat s nastavením"**
- Chat bude používat pouze zaškrtnuté filtrace

## Předkonfigurované chatboty

Po spuštění SQL scriptu budete mít:

### 🏥 MedBase Sana
- **Přístup**: Všechny kategorie + všechny typy publikací
- **Funkce**: Produkty ✅ + Knihy ✅  
- **Využití**: Hlavní chatbot s plným přístupem

### 🏢 Sana Kancelář  
- **Přístup**: Pouze veřejné publikace
- **Funkce**: Produkty ❌ + Knihy ✅
- **Využití**: Omezený přístup pro kancelář

### 👥 Obecný Chat
- **Přístup**: Pouze veřejné publikace
- **Funkce**: Produkty ❌ + Knihy ✅
- **Využití**: Základní chat pro návštěvníky

## Technické detaily

### Synchronizace s existujícím systémem
- Starý systém (hardcoded chatboti) zůstává funkční
- Nový systém má prioritu a načítá data z databáze
- Postupný přechod bez výpadku funkčnosti

### Chybové stavy
- 🔄 Loading indicator během načítání
- ❌ Chybové hlášky při selhání databáze
- 📄 Instrukce pro prázdný stav (žádné chatboty)

### Výkon
- Parallel loading kategorií a typů publikací
- Optimistické UI updaty (okamžitá odezva)
- Batch operace pro minimalizaci API volání

## Budoucí rozšíření

Systém je připraven na:
- 🏷️ Přidání štítků (labels) - už je v databázi
- 👤 Individuální oprávnění uživatelů
- 📊 Analytika využití filtrů
- 🔄 Import/export nastavení chatbotů

## Troubleshooting

### Chatboti se nezobrazují
1. Zkontrolujte konzoli pro chybové hlášky
2. Ověřte připojení k Supabase
3. Spusťte SQL script pro vytvoření tabulky

### Nastavení se neukládají
1. Zkontrolujte RLS pravidla v Supabase
2. Ověřte správnost API klíčů
3. Podívejte se do Network tabu v Developer Tools

### Filtrace nefungují v chatu
1. Ujistěte se, že chat používá nový systém
2. Zkontrolujte, že chatbot má zaškrtnuté kategorie
3. Ověřte UUID kategorií v databázi

Systém je nyní plně integrovaný a připravený k použití! 🎉
