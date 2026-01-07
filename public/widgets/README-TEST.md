# 🧪 Widget Testing Files

Tato složka obsahuje testovací soubory pro Vany Chat Widget.

## 📁 Soubory

### `test-klient.html`
**Kompletní testovací prostředí pro vývojáře**

- Simuluje reálné klientské prostředí
- 4 předpřipravené testovací scénáře
- API testování
- Live console log
- Stejná integrace jako u klienta

**URL:** `http://localhost:5173/widgets/test-klient.html`

**Použití:**
```bash
npm run dev
# Pak otevři http://localhost:5173/widgets/test-klient.html
```

---

### `priklad-klient.html`
**Jednoduchá ukázková stránka**

- Základní integrace widgetu
- Ukázky různých tlačítek
- Dokumentace integrace
- Kód snippety

**URL:** `http://localhost:5173/widgets/priklad-klient.html`

---

### `vany-chat-widget.js`
**Widget loader script**

- Hlavní entry point pro klienty
- Čte konfiguraci z data-* atributů
- Vytváří iframe s chat aplikací
- PostMessage komunikace
- JavaScript API

**Integrace:**
```html
<script src="https://beautiful-pika-466f18.netlify.app/widgets/vany-chat-widget.js" 
        data-chatbot-id="vany_chat">
</script>
```

---

### `widget-chat.html`
**Widget HTML pro iframe**

- Standalone HTML pro widget
- Importuje React aplikaci
- Error handling
- Loading states

---

## 🚀 Rychlý Start

1. **Spusť dev server:**
   ```bash
   npm run dev
   ```

2. **Otevři testovací stránku:**
   ```
   http://localhost:5173/widgets/test-klient.html
   ```

3. **Testuj widget:**
   - Klikni na "Základní chat"
   - Vyzkoušej ostatní scénáře
   - Testuj API funkce

---

## 📖 Dokumentace

- **Pro vývojáře:** `/TESTING_GUIDE.md`
- **Pro klienty:** `/WIDGET_DEPLOYMENT.md`
- **Implementace:** `/WIDGET_README.md`

---

## ✅ Co testovat

- [ ] Widget se otevře
- [ ] Lze psát zprávy
- [ ] Bot odpovídá
- [ ] Produktová doporučení fungují
- [ ] Funnel flow funguje
- [ ] Responsivní design
- [ ] API funkce (`open`, `close`, `toggle`, `sendMessage`)

---

**Happy Testing! 🎉**



