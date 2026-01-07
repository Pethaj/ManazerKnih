# DESIGN ANALYSIS - WidgetChat vs SanaChat

## 📊 ZJIŠTĚNÉ ROZDÍLY

### ✅ SPRÁVNĚ (Shoda 100%)
1. **ChatHeader** - WidgetChat používá stejný ChatHeader jako SanaChat
   - `bg-bewit-blue` (#005b96) ✅
   - `h-16` (64px) ✅
   - `SanaAILogo` stejné ✅

### ❌ ROZDÍLY (Musí být opraveno)

#### 1. ChatInput komponent
**SanaChat** (`src/components/SanaChat/SanaChat.tsx:1245-1287`):
- `<textarea>` s auto-resize
- `rounded-xl` s `shadow-sm`
- `focus-within:ring-2 focus-within:ring-bewit-blue`
- placeholder: "Jak vám mohu pomoci..."
- Tlačítko: `w-10 h-10 rounded-lg bg-bewit-blue`

**WidgetChat** (`src/components/WidgetChat/WidgetChat.tsx:195-230`):
- `<input type="text">` ❌
- Jiný styling ❌
- placeholder: "Napište zprávu..." ❌
- Jiné tlačítko ❌

#### 2. ChatWindow komponent
**SanaChat** (`src/components/SanaChat/SanaChat.tsx:1064-1243`):
- Složitější struktura s product recommendations
- Více funkcí

**WidgetChat** (`src/components/WidgetChat/WidgetChat.tsx:149-192`):
- Zjednodušená verze ❌

#### 3. Message komponent
**SanaChat** (`src/components/SanaChat/SanaChat.tsx:638-1062`):
- `rounded-2xl`
- `bg-bewit-blue` pro user messages
- `rounded-br-none` / `rounded-bl-none`
- Markdown rendering s `react-markdown`

**WidgetChat** (`src/components/WidgetChat/WidgetChat.tsx:72-146`):
- Možné rozdíly v detailech

## 🎯 PLÁN OPRAV

### Priorita 1: ChatInput (KRITICKÉ)
- [ ] Nahradit `<input>` za `<textarea>` s auto-resize
- [ ] Přidat správné Tailwind třídy
- [ ] Změnit placeholder
- [ ] Opravit tlačítko styling

### Priorita 2: Message komponenta
- [ ] Zkontrolovat všechny Tailwind třídy
- [ ] Ověřit `rounded-2xl`, `rounded-br-none`, `rounded-bl-none`
- [ ] Ověřit barvy `bg-bewit-blue`

### Priorita 3: ChatWindow
- [ ] Porovnat layout
- [ ] Zkontrolovat spacing (`space-y-4`)

## 🔍 NEXT STEPS
1. Přečíst celý ChatInput z SanaChat
2. Zkopírovat PŘESNĚ do WidgetChat
3. Přečíst celý Message komponent
4. Porovnat detail po detailu
5. Opravit všechny rozdíly
6. Rebuild + lokální test
7. Screenshot comparison
8. Teprve pak Netlify upload







