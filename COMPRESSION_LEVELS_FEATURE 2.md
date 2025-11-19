# iLovePDF - Výběr Úrovně Komprese

## 🎯 **Nová Funkcionalita**

### **Uživatelský Výběr Úrovně Komprese**
Uživatel si nyní může při uploadu PDF vybrat úroveň komprese podle svých potřeb.

## 📋 **Dostupné Úrovně Komprese**

### **🔹 Low**
- **Popis**: Minimální komprese pro zachování kvality bez ztráty dat
- **Použití**: Dokumenty s důležitými obrázky, diagramy nebo grafikou
- **Výhody**: Zachová nejvyšší kvalitu
- **Nevýhody**: Nejmenší úspora místa

### **🔹 Recommended** (výchozí)
- **Popis**: Nejlepší mix komprese a kvality pro běžné použití
- **Použití**: Většina dokumentů, optimální pro běžné použití
- **Výhody**: Dobrý poměr velikost/kvalita
- **Nevýhody**: Střední úspora místa

### **🔹 Extreme**
- **Popis**: Maximální komprese, může snížit kvalitu obrázků
- **Použití**: Textové dokumenty, kde kvalita obrázků není kritická
- **Výhody**: Největší úspora místa
- **Nevýhody**: Možná degradace kvality obrázků

## 🖥️ **Uživatelské Rozhraní**

### **Upload Modal**
```
☑️ Provést OCR
    └── 🌐 Jazyk dokumentu: [Dropdown]

☑️ Provést kompresi
    └── 🗜️ Úroveň komprese: [Dropdown]
        ├── Low - Minimální komprese (zachová kvalitu)
        ├── Recommended - Optimální poměr velikost/kvalita ✅
        └── Extreme - Maximální komprese (může snížit kvalitu)
```

### **Dynamické Popisy**
- Při výběru úrovně se zobrazí detailní popis
- Uživatel vidí, co může očekávat od každé úrovně
- Jasné doporučení pro různé typy dokumentů

## ⚙️ **Technická Implementace**

### **State Management**
```typescript
const [selectedCompressionLevel, setSelectedCompressionLevel] = useState<string>('recommended');
```

### **Předávání Parametrů**
```typescript
// Komprese metoda
compressPDF(file: File, compressionLevel: string = 'recommended')

// Kombinované zpracování
processWithOCRAndCompression(file: File, language: string, compressionLevel: string = 'recommended')

// Upload workflow
processFileUpload(file, options, ocrLanguage, compressionLevel)
```

### **API Volání**
```typescript
// iLovePDF API parametr
processRequest.compression_level = compressionLevel; // 'low', 'recommended', 'extreme'
```

## 🔄 **Workflow s Výběrem Úrovně**

### **1. Upload PDF**
```
PDF soubor → Modal se zobrazí
```

### **2. Výběr Možností**
```
☑️ OCR: [Jazyk dropdown]
☑️ Komprese: [Úroveň dropdown - výchozí: recommended]
```

### **3. Zpracování**
```
OCR (pokud zvoleno) → Komprese (s vybranou úrovní) → Upload
```

### **4. Informace pro Uživatele**
```
⏱️ Zpracování pomocí iLovePDF API...
🔍 OCR bude provedeno v jazyce: Čeština
🗜️ Komprese: recommended
```

## 📊 **Výhody Nové Funkcionality**

### **Pro Uživatele**
- 🎯 **Kontrola nad kvalitou** - výběr podle typu dokumentu
- 📏 **Flexibilita** - různé potřeby, různé úrovně
- 💡 **Vzdělávací** - popisy pomáhají pochopit rozdíly
- ⚡ **Jednoduchá** - výchozí "recommended" pro většinu případů

### **Pro Systém**
- 🔧 **Modulární** - snadno rozšiřitelné o další úrovně
- 📈 **Škálovatelné** - parametrizované API volání
- 🛡️ **Robustní** - fallback na výchozí hodnoty
- 📝 **Dokumentované** - jasné popisy a použití

## 🎨 **UI/UX Vylepšení**

### **Vizuální Hierarchie**
- Checkbox pro aktivaci komprese
- Podmíněný dropdown (zobrazí se pouze při zaškrtnutí)
- Barevné rozlišení úrovní v popisech

### **Informativní Texty**
- Krátké popisy v option textu
- Detailní vysvětlení pod dropdownem
- Emoji ikony pro lepší orientaci

### **Responsive Design**
- Dropdown se přizpůsobí šířce modalu
- Popisy se zalamují na menších obrazovkách
- Zachována čitelnost na všech zařízeních

## 🚀 **Připraveno k Použití**

### **Výchozí Nastavení**
- ✅ **Recommended** jako výchozí úroveň
- ✅ **Automatické předávání** parametrů
- ✅ **Kompatibilita** se stávajícím workflow

### **Testování**
- ✅ **Upload modal** - výběr úrovně funguje
- ✅ **API volání** - parametr se správně předává
- ✅ **Kombinované zpracování** - OCR + komprese s úrovní
- ✅ **Fallback** - výchozí hodnoty při chybách

---
*Uživatelé si nyní mohou vybrat úroveň komprese podle svých potřeb při uploadu PDF dokumentů.*
