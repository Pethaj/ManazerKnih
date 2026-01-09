# 🧪 Testovací Příručka - Vany Chat Widget

> **Kompletní návod jak testovat chatový widget jako u reálného klienta**

## 📋 Obsah

1. [Rychlý start](#rychlý-start)
2. [Testovací stránka](#testovací-stránka)
3. [Co testovat](#co-testovat)
4. [Časté problémy](#časté-problémy)
5. [Produkční testování](#produkční-testování)

---

## 🚀 Rychlý Start

### 1. Spusť vývojový server

```bash
cd app
npm run dev
```

Server běží na: `http://localhost:5173/`

### 2. Otevři testovací stránku

V prohlížeči otevři:

```
http://localhost:5173/widgets/test-klient.html
```

### 3. Testuj widget

Klikni na tlačítko **"Základní chat"** nebo **"💬 Kontaktujte našeho poradce"**.

---

## 🎯 Testovací Stránka

### Umístění

```
/public/widgets/test-klient.html
```

### Co simuluje?

Testovací stránka přesně simuluje prostředí u reálného klienta:

- ✅ Widget se načítá ze stejného scriptu jako u klienta
- ✅ Používá iframe izolaci
- ✅ Komunikuje přes postMessage API
- ✅ Připojuje se k produkčním službám (N8N, Supabase)
- ✅ Má stejný vzhled a chování

### Testovací scénáře

Stránka nabízí 4 předpřipravené scénáře:

#### 1. 💬 Základní chat
- Otevře widget
- Zobrazí uvítací zprávu
- Umožní psát zprávy

#### 2. 🛒 Produktové doporučení
- Otevře widget
- Automaticky pošle dotaz na produkty
- Testuje intent routing a produktová doporučení

#### 3. 🎯 Funnel flow
- Otevře widget
- Spustí konverzační funnel
- Testuje vedení zákazníka přes otázky

#### 4. 🤖 Automatická zpráva
- Otevře widget
- Pošle předpřipravenou zprávu
- Testuje programové ovládání widgetu

---

## 🔍 Co Testovat

### ✅ Základní funkce

- [ ] Widget se otevře po kliknutí na tlačítko
- [ ] Widget se zobrazí v pravém dolním rohu
- [ ] Widget má správnou velikost (400x600px)
- [ ] Widget má hlavičku "SANA AI"
- [ ] Je vidět vstupní pole "Jak vám mohu pomoci..."
- [ ] Je vidět tlačítko pro odeslání zprávy

### ✅ Chatovací funkce

- [ ] Lze psát do vstupního pole
- [ ] Po stisknutí Enter se zpráva odešle
- [ ] Po kliknutí na tlačítko odeslání se zpráva odešle
- [ ] Zpráva uživatele se zobrazí vpravo (modrý bublina)
- [ ] Odpověď bota se zobrazí vlevo (bílá bublina)
- [ ] Chat se automaticky scrolluje dolů

### ✅ Intent Routing

- [ ] Dotaz na produkty spustí produktová doporučení
- [ ] Obecný dotaz spustí běžný chat
- [ ] Funnel dotaz spustí konverzační funnel

### ✅ Produktová doporučení

- [ ] Bot nabídne produkty v karuselu
- [ ] Lze scrollovat mezi produkty
- [ ] Produkty mají obrázek, název, popis
- [ ] Kliknutím na produkt se otevře detail (nebo jiná akce)

### ✅ Responsivní design

- [ ] Widget funguje na desktopu
- [ ] Widget funguje na tabletu
- [ ] Widget funguje na mobilu (fullscreen)
- [ ] Widget se přizpůsobí velikosti okna

### ✅ API funkce

Testuj v konzoli prohlížeče (F12):

```javascript
// Otevřít widget
window.VanyChatWidget.open();

// Zavřít widget
window.VanyChatWidget.close();

// Přepnout viditelnost
window.VanyChatWidget.toggle();

// Poslat zprávu
window.VanyChatWidget.sendMessage("Ahoj!");

// Změnit téma
window.VanyChatWidget.setTheme("dark");

// Získat konfiguraci
console.log(window.VanyChatWidget.config);
```

---

## 🐛 Časté Problémy

### ❌ Widget se nezobrazuje

**Příznaky:**
- Kliknutím na tlačítko se nic nestane
- V konzoli je chyba

**Řešení:**
1. Zkontroluj konzoli prohlížeče (F12) na chyby
2. Zkontroluj, že server běží (`npm run dev`)
3. Zkontroluj, že widget script se načetl:
   ```javascript
   console.log(window.VanyChatWidget);
   // Mělo by vrátit objekt
   ```

### ❌ "Nepodařilo se načíst chat"

**Příznaky:**
- Widget se otevře, ale zobrazí chybovou hlášku

**Možné příčiny:**
1. **Supabase nedostupná** - zkontroluj síťovou konzoli (Network tab)
2. **Špatné chatbot_id** - zkontroluj, že v databázi existuje chatbot s ID `vany_chat`
3. **CORS problém** - zkontroluj, že Supabase povoluje requesty z `localhost`

**Řešení:**
```javascript
// Zkontroluj chatbot settings
fetch('https://modopafybeslbcqjxsve.supabase.co/rest/v1/chatbot_settings_2?chatbot_id=eq.vany_chat', {
  headers: {
    'apikey': 'your-api-key',
    'Authorization': 'Bearer your-api-key'
  }
})
.then(r => r.json())
.then(console.log);
```

### ❌ Bot neodpovídá

**Příznaky:**
- Zpráva se pošle, ale bot neodpoví
- V konzoli může být chyba "N8N webhook failed"

**Možné příčiny:**
1. **N8N webhook nedostupný** - webhook může být vypnutý
2. **N8N vrací chybu 500** - chyba v workflow
3. **Špatné nastavení webhook URL** - zkontroluj v databázi

**Řešení:**
1. Zkontroluj síťovou konzoli (Network tab) - hledej požadavky na `n8n.srv980546.hstgr.cloud`
2. Zkontroluj response - měla by být JSON s `output` nebo `products`
3. Otestuj webhook přímo v N8N admin panelu

### ❌ ReactMarkdown chyba

**Příznaky:**
- Chyba "Unexpected className prop" v konzoli
- Widget havaruje při zobrazení zprávy

**Řešení:**
- Tato chyba byla opravena! Pokud se stále objevuje, ujisti se, že máš nejnovější verzi kódu.
- `className` prop byl přesunut na obalovací `<div>` místo přímo na `<ReactMarkdown>`.

---

## 🌐 Produkční Testování

### Testování na produkční URL

Widget je nasazený na Netlify:

```
https://beautiful-pika-466f18.netlify.app/widgets/vany-chat-widget.js
```

### Jak testovat produkci?

1. **Vytvoř testovací HTML soubor:**

```html
<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <title>Test - Produkční Widget</title>
</head>
<body>
  <h1>Test Produkčního Widgetu</h1>
  
  <button onclick="window.VanyChatWidget.open()">
    Otevřít Chat
  </button>

  <!-- PRODUKČNÍ WIDGET -->
  <script src="https://beautiful-pika-466f18.netlify.app/widgets/vany-chat-widget.js" 
          data-chatbot-id="vany_chat">
  </script>
</body>
</html>
```

2. **Otevři v prohlížeči** (může být i lokální HTML soubor)

3. **Testuj všechny funkce** jako v dev prostředí

### Rozdíly dev vs produkce

| Feature | Development | Production |
|---------|-------------|------------|
| Widget URL | `http://localhost:5173/widgets/...` | `https://beautiful-pika-466f18.netlify.app/widgets/...` |
| Hot Reload | ✅ Ano | ❌ Ne |
| Console Logs | ✅ Více verbose | ✅ Základní |
| Build | ❌ Ne (Vite dev) | ✅ Ano (optimalizovaný) |
| HTTPS | ❌ Ne | ✅ Ano |

---

## 📊 Checklist Před Nasazením

Před nasazením widgetu k reálnému klientovi:

- [ ] ✅ Widget funguje na test-klient.html
- [ ] ✅ Všechny 4 testovací scénáře fungují
- [ ] ✅ Widget funguje na produkční URL
- [ ] ✅ N8N webhooky odpovídají správně
- [ ] ✅ Produktová doporučení fungují
- [ ] ✅ Funnel flow funguje
- [ ] ✅ Responsivní design funguje (desktop, tablet, mobile)
- [ ] ✅ Žádné chyby v konzoli
- [ ] ✅ API funkce fungují (`open`, `close`, `toggle`, `sendMessage`)
- [ ] ✅ Widget se dá zavřít (ESC nebo křížek)
- [ ] ✅ Widget nezasahuje do obsahu stránky

---

## 🔧 Developer Tips

### Hot Reload

Při vývoji:
- Změny v React komponentách se projeví okamžitě (Hot Module Replacement)
- Změny v `vany-chat-widget.js` vyžadují refresh stránky
- Změny v `widget-chat.html` vyžadují refresh stránky

### Debug Mode

Pro více informací v konzoli:

```javascript
// V widgetConfigService.ts
export function widgetLog(message: string, data?: any) {
  console.warn('[Vany Widget]', message, data); // warn = žlutá barva
}
```

### Network Monitoring

Pro sledování API calls:
1. Otevři DevTools (F12)
2. Jdi na záložku **Network**
3. Filtruj podle:
   - `n8n.srv980546.hstgr.cloud` - N8N webhooky
   - `modopafybeslbcqjxsve.supabase.co` - Supabase requesty
   - `widget-chat.html` - Widget HTML
   - `widget-*.js` - Widget bundle

---

## 📞 Podpora

Pokud narazíš na problém, který není popsaný v této příručce:

1. Zkontroluj konzoli prohlížeče (F12)
2. Zkontroluj síťovou konzoli (Network tab)
3. Zkontroluj, že všechny služby běží (N8N, Supabase)
4. Kontaktuj vývojový tým

---

## 🎉 Příklady Integrace u Klienta

### WordPress

```html
<!-- Do footer.php nebo custom HTML block -->
<script src="https://beautiful-pika-466f18.netlify.app/widgets/vany-chat-widget.js" 
        data-chatbot-id="vany_chat">
</script>
```

### Shopify

```liquid
<!-- Do theme.liquid před </body> -->
<script src="https://beautiful-pika-466f18.netlify.app/widgets/vany-chat-widget.js" 
        data-chatbot-id="vany_chat">
</script>
```

### Custom HTML

```html
<!-- Na konec stránky před </body> -->
<script src="https://beautiful-pika-466f18.netlify.app/widgets/vany-chat-widget.js" 
        data-chatbot-id="vany_chat"
        data-theme="light"
        data-position="bottom-right">
</script>
```

---

**Happy Testing! 🚀**






