# Vany Chat Widget - Dokumentace nasazení

> **Embedovatelný chatbot widget pro klienty Bewitu**

## 📋 Obsah

1. [Rychlý start](#rychlý-start)
2. [Konfigurace widgetu](#konfigurace-widgetu)
3. [Pokročilé možnosti](#pokročilé-možnosti)
4. [API Reference](#api-reference)
5. [Troubleshooting](#troubleshooting)
6. [Podpora](#podpora)

---

## 🚀 Rychlý start

### Základní integrace

Přidejte následující kód na vaši webovou stránku před uzavírací tag `</body>`:

```html
<script src="https://vase-domena.cz/widgets/vany-chat-widget.js" 
        data-chatbot-id="vany_chat">
</script>
```

To je vše! Widget se automaticky zobrazí v pravém dolním rohu vaší stránky.

### Ukázka

```html
<!DOCTYPE html>
<html>
<head>
  <title>Moje stránka</title>
</head>
<body>
  <h1>Vítejte na mé stránce</h1>
  <p>Váš obsah zde...</p>

  <!-- Vany Chat Widget -->
  <script src="https://vase-domena.cz/widgets/vany-chat-widget.js" 
          data-chatbot-id="vany_chat">
  </script>
</body>
</html>
```

---

## ⚙️ Konfigurace widgetu

### Dostupné parametry

Widget můžete přizpůsobit pomocí `data-*` atributů:

| Parametr | Popis | Výchozí hodnota | Příklad |
|----------|-------|----------------|---------|
| `data-chatbot-id` | ID chatbota | `vany_chat` | `data-chatbot-id="vany_chat"` |
| `data-theme` | Barevné téma | `light` | `data-theme="dark"` |
| `data-position` | Pozice na stránce | `bottom-right` | `data-position="bottom-left"` |
| `data-greeting` | Vlastní uvítací zpráva | - | `data-greeting="Ahoj! Jak mohu pomoci?"` |
| `data-width` | Šířka widgetu (px) | `400` | `data-width="500"` |
| `data-height` | Výška widgetu (px) | `600` | `data-height="700"` |

### Ukázky konfigurace

#### 1. Widget s tmavým tématem

```html
<script src="https://vase-domena.cz/widgets/vany-chat-widget.js" 
        data-chatbot-id="vany_chat"
        data-theme="dark">
</script>
```

#### 2. Widget v levém dolním rohu

```html
<script src="https://vase-domena.cz/widgets/vany-chat-widget.js" 
        data-chatbot-id="vany_chat"
        data-position="bottom-left">
</script>
```

#### 3. Widget s vlastní uvítací zprávou

```html
<script src="https://vase-domena.cz/widgets/vany-chat-widget.js" 
        data-chatbot-id="vany_chat"
        data-greeting="Vítejte! Jsem tady, abych vám pomohl s produkty Bewit.">
</script>
```

#### 4. Plná konfigurace

```html
<script src="https://vase-domena.cz/widgets/vany-chat-widget.js" 
        data-chatbot-id="vany_chat"
        data-theme="light"
        data-position="bottom-right"
        data-greeting="Dobrý den! Jak vám mohu pomoci?"
        data-width="450"
        data-height="650">
</script>
```

---

## 🎯 Pokročilé možnosti

### JavaScript API

Widget poskytuje JavaScript API pro programové ovládání:

```javascript
// Widget API je dostupné jako window.VanyChatWidget

// Zobrazit widget
window.VanyChatWidget.open();

// Skrýt widget
window.VanyChatWidget.close();

// Přepnout viditelnost
window.VanyChatWidget.toggle();

// Poslat zprávu do chatu
window.VanyChatWidget.sendMessage("Ahoj!");

// Změnit téma
window.VanyChatWidget.setTheme("dark");

// Získat konfiguraci
console.log(window.VanyChatWidget.config);
```

### Příklad: Otevření widgetu tlačítkem

```html
<button onclick="window.VanyChatWidget.open()">
  💬 Kontaktujte nás
</button>

<script src="https://vase-domena.cz/widgets/vany-chat-widget.js" 
        data-chatbot-id="vany_chat">
</script>
```

### Příklad: Poslání automatické zprávy

```html
<button onclick="askQuestion()">
  ❓ Zeptejte se na produkty
</button>

<script>
  function askQuestion() {
    window.VanyChatWidget.open();
    setTimeout(() => {
      window.VanyChatWidget.sendMessage("Jaké produkty doporučujete?");
    }, 500);
  }
</script>

<script src="https://vase-domena.cz/widgets/vany-chat-widget.js" 
        data-chatbot-id="vany_chat">
</script>
```

### Event Listener

Widget komunikuje s vaší stránkou pomocí postMessage:

```javascript
window.addEventListener('message', function(event) {
  const data = event.data;
  
  switch (data.type) {
    case 'WIDGET_READY':
      console.log('Widget je připraven');
      break;
      
    case 'WIDGET_OPEN':
      console.log('Widget byl otevřen');
      break;
      
    case 'WIDGET_CLOSE':
      console.log('Widget byl zavřen');
      break;
  }
});
```

---

## 📱 Responsivní design

Widget je plně responsivní a automaticky se přizpůsobí velikosti obrazovky:

- **Desktop:** Fixní velikost (400x600px výchozí)
- **Tablet:** Přizpůsobená velikost
- **Mobile:** Fullscreen mód (s ohledem na viewport)

Nemusíte dělat nic - widget se postará o vše sám!

---

## 🎨 Vlastní styling

### Pozice widgetu

Dostupné pozice:

- `bottom-right` - Pravý dolní roh (výchozí)
- `bottom-left` - Levý dolní roh
- `top-right` - Pravý horní roh
- `top-left` - Levý horní roh

### Témata

Dostupná témata:

- `light` - Světlé téma (výchozí)
- `dark` - Tmavé téma

---

## 🔒 Bezpečnost

### HTTPS

Widget vyžaduje HTTPS protokol v produkčním prostředí. Ujistěte se, že vaše stránka používá `https://`.

### Content Security Policy (CSP)

Pokud používáte CSP, přidejte následující direktivy:

```
script-src 'self' https://vase-domena.cz;
frame-src 'self' https://vase-domena.cz;
connect-src 'self' https://n8n.srv980546.hstgr.cloud https://modopafybeslbcqjxsve.supabase.co;
```

---

## 📊 Analytics

Widget automaticky loguje důležité události do konzole prohlížeče:

```javascript
// V developer konzoli uvidíte:
// 🤖 Vany Chat Widget inicializován
// ✅ Vany Chat Widget připraven
// 📨 Zpráva z widgetu: ...
```

Pro pokročilé analytics můžete naslouchat událostem pomocí postMessage (viz [Event Listener](#event-listener)).

---

## 🐛 Troubleshooting

### Widget se nezobrazuje

**Možné příčiny:**

1. **Nesprávná URL scriptu**
   - Zkontrolujte, že URL scriptu je správná
   - Zkontrolujte konzoli prohlížeče na chyby

2. **CSP blokuje načtení**
   - Přidejte povolení pro doménu widgetu v CSP

3. **JavaScript je vypnutý**
   - Widget vyžaduje JavaScript

**Řešení:**

```javascript
// Zkontrolujte, zda je widget načten
console.log(window.VanyChatWidget);
// Mělo by vrátit objekt s konfigurací

// Zkontrolujte, zda je iframe přidán
console.log(document.getElementById('vany-chat-widget-iframe'));
// Mělo by vrátit iframe element
```

### Widget je příliš velký/malý

Upravte velikost pomocí parametrů `data-width` a `data-height`:

```html
<script src="https://vase-domena.cz/widgets/vany-chat-widget.js" 
        data-chatbot-id="vany_chat"
        data-width="500"
        data-height="700">
</script>
```

### Widget zasahuje do obsahu stránky

Widget má `z-index: 999999`, což by mělo zajistit, že je vždy navrchu. Pokud stále zasahuje:

1. Zkontrolujte CSS vaší stránky na konflikty
2. Změňte pozici widgetu pomocí `data-position`

### Chat neodpovídá

**Možné příčiny:**

1. **N8N webhook není dostupný**
   - Zkontrolujte síťovou konzoli (Network tab)
   - Hledejte failed požadavky na `n8n.srv980546.hstgr.cloud`

2. **Špatná konfigurace chatbota**
   - Zkontrolujte `data-chatbot-id`
   - Ujistěte se, že chatbot existuje v databázi

**Řešení:**

```javascript
// Zkontrolujte konfiguraci
console.log(window.VanyChatWidget.config);

// Zkuste poslat testovací zprávu
window.VanyChatWidget.sendMessage("test");
```

---

## 🧪 Testování

### Lokální testování

Pro testování na lokálním vývojovém serveru:

```html
<script src="http://localhost:5173/widgets/vany-chat-widget.js" 
        data-chatbot-id="vany_chat">
</script>
```

### Demo stránka

Navštivte testovací stránku:

```
http://localhost:5173/widgets/test.html
```

Na této stránce můžete:
- Vyzkoušet různé konfigurace
- Testovat API funkce
- Vidět ukázky integrace

---

## 📞 Podpora

### Kontakt

Pro technickou podporu nebo dotazy kontaktujte:

- **Email:** podpora@bewit.love
- **Web:** https://bewit.love

### Častá vylepšení (Roadmap)

Plánované funkce:

- [ ] Floating bubble widget (minimalizovatelný)
- [ ] Vlastní barvy a logo
- [ ] Multi-language podpora
- [ ] Analytics dashboard
- [ ] API key autentizace
- [ ] Domain whitelist

---

## 📝 Changelog

### Verze 1.0.0 (Aktuální)

- ✅ Základní widget s iframe implementací
- ✅ Intent routing pro produktová doporučení
- ✅ N8N webhook integrace
- ✅ Responsivní design
- ✅ JavaScript API
- ✅ Konfigurace přes data atributy

---

## 📄 Licence

© 2025 Bewit. Všechna práva vyhrazena.

Tento widget je určen výhradně pro klienty Bewitu. Neoprávněné použití je zakázáno.

---

## 🎉 Příklady použití

### E-shop

```html
<!-- Přidejte widget na všechny stránky e-shopu -->
<script src="https://vase-domena.cz/widgets/vany-chat-widget.js" 
        data-chatbot-id="vany_chat"
        data-greeting="Hledáte produkt? Rád vám poradím!">
</script>
```

### Landing page

```html
<!-- Widget s tmavým tématem pro tmavou landing page -->
<script src="https://vase-domena.cz/widgets/vany-chat-widget.js" 
        data-chatbot-id="vany_chat"
        data-theme="dark"
        data-greeting="Zajímá vás naše nabídka? Zeptejte se!">
</script>
```

### Blog

```html
<!-- Widget v levém dolním rohu, aby nepřekrýval sharing tlačítka -->
<script src="https://vase-domena.cz/widgets/vany-chat-widget.js" 
        data-chatbot-id="vany_chat"
        data-position="bottom-left">
</script>
```

---

**Přejeme příjemné používání Vany Chat Widgetu! 🚀**






