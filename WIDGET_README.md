# Vany Chat Widget - Developer Documentation

> **Embedovatelný chatbot widget pro Bewit klienty**

## 🎯 Přehled

Tento projekt obsahuje **embedovatelný chatbot widget**, který umožňuje klientům Bewitu snadno integrovat Vany Chat na jejich webové stránky pomocí jednoduchého `<script>` tagu.

## 📁 Struktura projektu

```
app/
├── public/
│   └── widgets/
│       ├── vany-chat-widget.js      # Loader script (hlavní entry point)
│       ├── widget-chat.html         # Widget HTML v iframe
│       └── test.html                # Testovací stránka
├── src/
│   ├── components/
│   │   └── WidgetChat/
│   │       ├── WidgetChat.tsx       # Zjednodušená verze SanaChat
│   │       └── WidgetChatContainer.tsx  # Container s loading logikou
│   ├── services/
│   │   └── widgetConfigService.ts   # Konfigurace a utility funkce
│   └── widget-entry.tsx             # React entry point pro widget
├── vite.config.ts                   # Multi-page build konfigurace
├── WIDGET_DEPLOYMENT.md             # Dokumentace pro klienty
└── WIDGET_README.md                 # Tento soubor (pro vývojáře)
```

## 🚀 Jak to funguje

### Architektura

```
Klientská stránka
    ↓
vany-chat-widget.js (loader)
    ↓
Vytvoří iframe
    ↓
widget-chat.html (React app)
    ↓
WidgetChatContainer
    ↓
WidgetChat (chatbot interface)
    ↓
N8N Webhooks + Supabase
```

### Komponenty

#### 1. **Loader Script** (`vany-chat-widget.js`)

- Minimální vanilla JavaScript
- Čte konfiguraci z data atributů
- Vytváří iframe s widget aplikací
- Poskytuje JavaScript API (window.VanyChatWidget)
- Responsive handling
- PostMessage komunikace

#### 2. **Widget HTML** (`widget-chat.html`)

- Standalone HTML pro iframe
- Importuje React entry point
- Error handling
- Loading states

#### 3. **Widget Chat** (`WidgetChat.tsx`)

- Zjednodušená verze SanaChat
- Pouze Vany Chat funkcionalita
- Intent routing pro produkty
- N8N webhook integrace
- Bez admin funkcí

#### 4. **Widget Container** (`WidgetChatContainer.tsx`)

- Načítá konfiguraci z URL
- Načítá chatbot settings z DB
- Error handling
- Loading states

#### 5. **Config Service** (`widgetConfigService.ts`)

- Utility funkce pro widget
- PostMessage komunikace
- Theme management
- Chatbot settings loading

## 🛠️ Development

### Instalace

```bash
npm install
```

### Spuštění dev serveru

```bash
npm run dev
```

Widget bude dostupný na:
- Hlavní aplikace: `http://localhost:5173/`
- Widget HTML: `http://localhost:5173/widgets/widget-chat.html`
- Test stránka: `http://localhost:5173/widgets/test.html`

### Testování widgetu lokálně

1. Spusťte dev server:
```bash
npm run dev
```

2. Otevřete test stránku:
```
http://localhost:5173/widgets/test.html
```

3. Na test stránce můžete:
   - Měnit konfiguraci widgetu
   - Testovat různé pozice a témata
   - Vyzkoušet JavaScript API

### Build pro produkci

```bash
npm run build
```

Build vytvoří dva entry pointy:
- `dist/index.html` - Hlavní aplikace
- `dist/widgets/widget-chat.html` - Widget

## 📦 Deploy

### 1. Build projektu

```bash
npm run build
```

### 2. Upload na hosting

Upload celou složku `dist/` na váš web server nebo CDN.

### 3. Aktualizace URL v loader scriptu

V produkci musíte aktualizovat URL v `vany-chat-widget.js`:

```javascript
// Změnit z:
const baseUrl = scriptSrc.substring(0, scriptSrc.lastIndexOf('/widgets/'));

// Na produkční URL:
const baseUrl = 'https://vase-domena.cz'; // nebo dynamicky ze scriptSrc
```

### 4. Poskytnutí klientům

Klienti vloží na své stránky:

```html
<script src="https://vase-domena.cz/widgets/vany-chat-widget.js" 
        data-chatbot-id="vany_chat">
</script>
```

## 🔧 Konfigurace

### Vite Build

Multi-page build je nakonfigurován v `vite.config.ts`:

```typescript
build: {
  rollupOptions: {
    input: {
      main: path.resolve(__dirname, 'index.html'),
      widget: path.resolve(__dirname, 'public/widgets/widget-chat.html')
    }
  }
}
```

### Environment Variables

Widget používá stejné env variables jako hlavní aplikace:

```env
VITE_SUPABASE_URL=https://modopafybeslbcqjxsve.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

## 🎨 Customizace

### Přidání nových parametrů

1. **Aktualizujte loader script** (`vany-chat-widget.js`):

```javascript
const config = {
  chatbotId: script.getAttribute('data-chatbot-id') || 'vany_chat',
  newParam: script.getAttribute('data-new-param') || 'default',
  // ...
};
```

2. **Přidejte do URL parametrů**:

```javascript
widgetUrl.searchParams.set('newParam', config.newParam);
```

3. **Aktualizujte WidgetConfig interface** (`widgetConfigService.ts`):

```typescript
export interface WidgetConfig {
  // ...
  newParam?: string;
}
```

4. **Zpracujte v komponente** (`WidgetChat.tsx`):

```typescript
const { newParam } = config;
// Use newParam...
```

### Styling

Widget používá Tailwind CSS z hlavní aplikace. Pro vlastní styly:

1. Upravte komponenty v `WidgetChat.tsx`
2. Nebo přidejte custom CSS do `widget-chat.html`

## 🧪 Testing

### Unit testy (budoucnost)

```bash
npm run test
```

### E2E testy (budoucnost)

```bash
npm run test:e2e
```

### Manuální testování

1. Otevřete `http://localhost:5173/widgets/test.html`
2. Vyzkoušejte různé konfigurace
3. Testujte API funkce v konzoli
4. Zkontrolujte responsivitu (mobile/tablet/desktop)

## 📊 Monitoring & Analytics

### Console Logging

Widget loguje důležité události:

```javascript
widgetLog('Widget Chat inicializován', { config, chatbotSettings });
widgetError('Chyba při zpracování zprávy:', error);
```

### PostMessage Events

Widget posílá události do parent window:

```javascript
WIDGET_READY      // Widget je načten
WIDGET_OPEN       // Widget byl otevřen
WIDGET_CLOSE      // Widget byl zavřen
WIDGET_RESIZE     // Widget změnil velikost
```

## 🐛 Debugging

### V dev módu

1. Otevřete DevTools
2. Zkontrolujte Console pro logy
3. Network tab pro API calls
4. Elements tab pro iframe struktur

### Widget API v konzoli

```javascript
// Zkontrolujte, zda je widget načten
window.VanyChatWidget

// Získejte konfiguraci
window.VanyChatWidget.config

// Najděte iframe
document.getElementById('vany-chat-widget-iframe')
```

## 🔒 Bezpečnost

### CORS

Widget volá:
- N8N webhooks na `n8n.srv980546.hstgr.cloud`
- Supabase API na `modopafybeslbcqjxsve.supabase.co`

Ujistěte se, že tyto domény mají správné CORS headers.

### CSP (Content Security Policy)

Widget vyžaduje následující CSP direktivy:

```
script-src 'self' https://vase-domena.cz;
frame-src 'self' https://vase-domena.cz;
connect-src 'self' https://n8n.srv980546.hstgr.cloud https://modopafybeslbcqjxsve.supabase.co;
```

### PostMessage Security

Widget validuje origin všech postMessage komunikací:

```typescript
if (event.source !== iframe.contentWindow) {
  return; // Ignore messages from unknown sources
}
```

## 📝 TODO & Roadmap

### V1.0 (Current) ✅
- [x] Basic widget implementation
- [x] Iframe isolation
- [x] JavaScript API
- [x] Responsive design
- [x] Intent routing
- [x] N8N integration

### V1.1 (Planned)
- [ ] Floating bubble widget (minimize/maximize)
- [ ] Custom branding (colors, logo)
- [ ] Analytics dashboard
- [ ] Multi-language support

### V2.0 (Future)
- [ ] API key authentication
- [ ] Domain whitelist
- [ ] Rate limiting
- [ ] A/B testing
- [ ] Advanced analytics

## 🤝 Contributing

### Code Style

- TypeScript strict mode
- Functional components (React)
- Tailwind CSS
- ESLint + Prettier

### Commit Messages

```
feat: přidána nová funkce
fix: opravena chyba
docs: aktualizace dokumentace
style: formátování
refactor: refaktoring kódu
test: přidání testů
```

## 📞 Support

Pro technickou podporu nebo dotazy:

- **Email:** podpora@bewit.love
- **Web:** https://bewit.love

## 📄 License

© 2025 Bewit. Všechna práva vyhrazena.

---

**Happy coding! 🚀**








