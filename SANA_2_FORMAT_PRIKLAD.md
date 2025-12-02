# 📝 Sana 2 - Příklad formátování

## 🎯 Jak má vypadat výstup v Sana 2

### Vstupní text (markdown):

```markdown
**Wany** jsou speciální směsi v tradiční čínské medicíně (TCM), často ve formě kuliček. Tyto směsi obsahují kombinace různých bylin, které jsou tradičně používány k podpoře zdraví. Příklady účinků, které mohou wany mít, zahrnují:

- **Podpora oběhu Qi**: Pomáhají uvolnit blokády a zlepšit tok tělních tekutin.
- **Regulace vlhkosti**: Mnohé směsi pomáhají odstranit nadbytečnou vlhkost z těla.
- **Uklidnění**: Některé wany mají také psychické účinky, mohou pomoci s uklidněním těla a mysli.

### **Příklady použití wanů:**

- **Zdravotní problémy** spojené s hromaděním vlhkosti v těle.
- **Účinky na trávicí systém**: Pomoc při trávení a odstraňování toxinů.
- **Gynologické potíže**: Některé směsi jsou zaměřeny na ženské zdraví a problémy spojené s menstruací.

### **Dávkování a užití:**

Obvykle se doporučuje užívat určité množství kuliček různě na lačno nebo po jídle, v závislosti na konkrétním produktu a poradě s certifikovaným terapeutem TCM.

### **Doporučení:**

- Vždy dodržujte doporučené dávkování a poraďte se se specialistou na TCM.

![Wany](https://modopafybeslbcqjxsve.supabase.co/storage/v1/object/public/images/main/production/0900a09f-4f38-4d1b-ab66-baa19109cc40/mi8le9t6ukivti0834nn25k12txsdlct)
```

### Zdroje (sources):

```json
{
  "sources": [
    {
      "uri": "https://example.com/tcm-wany.pdf",
      "title": "tčm-wany, Autor: Bewit-eshop, vydáno: 2023"
    },
    {
      "uri": "https://example.com/bylinne-pripravky.pdf",
      "title": "Volně prodejné čínské bylinné přípravky a směsi, Autor: Mgr. Daniela Pilařová, vydáno: 2023"
    }
  ]
}
```

---

## ✅ Jak bude vypadat výstup v Sana 2:

### 1. Hlavní obsah (v bílém bubble):

> **Wany** jsou speciální směsi v tradiční čínské medicíně (TCM), často ve formě kuliček. Tyto směsi obsahují kombinace různých bylin, které jsou tradičně používány k podpoře zdraví. Příklady účinků, které mohou wany mít, zahrnují:
> 
> - **Podpora oběhu Qi**: Pomáhají uvolnit blokády a zlepšit tok tělních tekutin.
> - **Regulace vlhkosti**: Mnohé směsi pomáhají odstranit nadbytečnou vlhkost z těla.
> - **Uklidnění**: Některé wany mají také psychické účinky, mohou pomoci s uklidněním těla a mysli.
> 
> ### **Příklady použití wanů:**
> 
> - **Zdravotní problémy** spojené s hromaděním vlhkosti v těle.
> - **Účinky na trávicí systém**: Pomoc při trávení a odstraňování toxinů.
> - **Gynologické potíže**: Některé směsi jsou zaměřeny na ženské zdraví a problémy spojené s menstruací.
> 
> ### **Dávkování a užití:**
> 
> Obvykle se doporučuje užívat určité množství kuliček různě na lačno nebo po jídle, v závislosti na konkrétním produktu a poradě s certifikovaným terapeutem TCM.
> 
> ### **Doporučení:**
> 
> - Vždy dodržujte doporučené dávkování a poraďte se se specialistou na TCM.
> 
> [Obrázek Wany - stylovaný s rounded corners, shadow, lazy loading]

---

### 2. Úzká horizontální čára

---

### 3. Zdroje (pod čarou):

**Soubory:**
- tčm-wany, Autor: Bewit-eshop, vydáno: 2023
- Volně prodejné čínské bylinné přípravky a směsi, Autor: Mgr. Daniela Pilařová, vydáno: 2023

---

## 🔧 Formát N8N webhooku pro Sana 2:

### ⚠️ DŮLEŽITÉ: Zdroje musí být v samostatném poli!

N8N webhook **MUSÍ** vracet zdroje v poli `sources`, **NE** jako součást markdown textu!

### ✅ SPRÁVNÝ formát (option 1):

```json
[
  {
    "output": "**Wany** jsou speciální směsi v tradiční čínské medicíně (TCM)...\n\n- **Podpora oběhu Qi**: Pomáhají uvolnit...\n\n![Wany](https://...)",
    "sources": [
      {
        "uri": "https://example.com/tcm-wany.pdf",
        "title": "TČM-Wany, Autor: Bewit-eshop, BEWIT, Publikováno 2023"
      },
      {
        "uri": "https://example.com/bylinne-pripravky.pdf",
        "title": "Volně prodejné čínské bylinné přípravky a směsi, Autor: Mgr. Daniela Pilařová, Shanti Academy, Publikováno 2023"
      }
    ]
  }
]
```

### ✅ SPRÁVNÝ formát (option 2):

```json
{
  "output": "**Markdown text**...",
  "sources": [
    {
      "uri": "https://...",
      "title": "Název, Autor: XY, Publikováno: 2023"
    }
  ]
}
```

### ❌ ŠPATNÝ formát (NE takhle!):

```json
[
  {
    "output": "**Wany** jsou...\n\n### Zdroje:\n- TČM-Wany, Autor: Bewit-eshop\n- Volně prodejné čínské bylinné přípravky"
  }
]
```

**Proč je to špatně?** Zdroje jsou součástí markdown textu místo samostatného pole. Aplikace je pak neumí zobrazit pod horizontální čarou.

---

## 🎨 Styling detaily:

### V bílém bubble (hlavní obsah):

- **Tučný text**: `**Wany**` → zobrazeno jako **Wany** (font-bold)
- **Nadpisy**: `### Nadpis` → větší font (text-lg, font-bold)
- **Seznamy**: `- položka` → odrážky s mezerou
- **Vnořené položky**: automaticky formátovány
- **Obrázky**: 
  - max-width: 100%
  - rounded-lg (zaoblené rohy)
  - shadow-md (stín)
  - lazy loading
  - block display
  - margin: 12px 0

### Pod bubble (zdroje):

- **Horizontální čára**: `<hr>` - tenká, světle šedá (`border-slate-300`)
- **Nadpis "Soubory"**: 
  - font-size: xs
  - font-weight: semibold
  - uppercase
  - tracking-wider
  - color: text-slate-500
- **Seznam zdrojů**:
  - Každý zdroj na novém řádku
  - Prefix: `- `
  - font-size: xs
  - color: text-slate-600
  - hover: text-bewit-blue
  - Klikatelné odkazy (target="_blank")

---

## 🔍 Jak Sana 2 detekuje markdown:

```typescript
// V komponente Message:
const usesMarkdown = chatbotId === 'sana_2';

// Pokud je markdown:
if (usesMarkdown && !isUser) {
  // Použije ReactMarkdown rendering
  <ReactMarkdown ...>
    {message.text}
  </ReactMarkdown>
  
  // Zdroje zobrazí pod bubble s horizontální čarou
}
```

---

## ✅ Checklist pro perfektní výstup:

- [x] N8N webhook vrací markdown v poli `output`
- [x] Text obsahuje markdown syntaxi (`**`, `###`, `-`, atd.)
- [x] Obrázky mají validní URL
- [x] Sources jsou array objektů s `uri` a `title`
- [x] ChatbotId je nastaven na `'sana_2'`
- [x] ReactMarkdown renderuje markdown
- [x] Horizontální čára odděluje obsah od zdrojů
- [x] Zdroje jsou klikatelné odkazy

---

## 🎉 Výsledek:

Sana 2 zobrazí:
1. ✅ Krásně naformátovaný markdown text v bílém bubble
2. ✅ Tučný text, nadpisy, seznamy - vše perfektně stylované
3. ✅ Obrázky s profesionálním stylingem
4. ✅ Horizontální čára pod bubble
5. ✅ Zdroje jako klikatelné odkazy pod čarou

**Výsledek vypadá jako ChatGPT!** 🚀

---

**Vytvořeno:** 2. prosince 2025  
**Pro:** Sana 2 chatbot

