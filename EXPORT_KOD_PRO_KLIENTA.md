# 🚀 Wany Chat - Kód pro Integraci na Web Klienta

## 📋 KOMPLETNÍ KÓD (Copy & Paste)

Tento kód obsahuje:
- ✅ Dlaždici s obrázkem na pozadí
- ✅ Tlačítko "Spustit Chat"
- ✅ Funkční chat iframe
- ✅ Zavírací tlačítko
- ✅ ESC klávesa pro zavření

---

## 💻 KÓD PRO VLOŽENÍ NA WEB

**Vložte tento kód před ukončovací tag `</body>` na vaší webové stránce:**

```html
<!-- ========================================
     WANY CHAT WIDGET - START
     ======================================== -->

<!-- Dlaždice s tlačítkem -->
<div id="wany-chat-tile" style="position:relative;background-image:url('https://modopafybeslbcqjxsve.supabase.co/storage/v1/object/public/images/main/production/Gemini_Generated_Image_gnhw0wgnhw0wgnhw.png');background-size:cover;background-position:center;border-radius:24px;padding:40px;box-shadow:0 4px 6px -1px rgb(0 0 0 / 0.1);max-width:420px;margin:0 auto;text-align:center;overflow:hidden;">
  
  <!-- Tmavý overlay -->
  <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.65);z-index:1;"></div>
  
  <!-- Nadpis -->
  <h2 style="position:relative;z-index:2;font-size:28px;color:#ffffff;margin:0 0 16px 0;text-shadow:0 2px 4px rgba(0,0,0,0.3);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    Poradce na čínské wany
  </h2>
  
  <!-- Obsah -->
  <div style="position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;gap:24px;">
    <p style="color:#e2e8f0;line-height:1.6;font-size:16px;margin:0;text-shadow:0 1px 3px rgba(0,0,0,0.3);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      Náš asistent na wany dodá informace a poradí s výběrem produktu
    </p>
    
    <!-- Tlačítko Spustit Chat -->
    <button 
      id="wany-chat-open-btn"
      onclick="openWanyChat()"
      style="width:180px;height:51px;border-radius:15px;cursor:pointer;transition:0.3s ease;background:linear-gradient(to bottom right,#2e8eff 0%,rgba(46,142,255,0) 30%);background-color:rgba(46,142,255,0.2);border:none;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;"
      onmouseover="this.style.backgroundColor='rgba(46,142,255,0.7)';this.style.boxShadow='0 0 10px rgba(46,142,255,0.5)'"
      onmouseout="this.style.backgroundColor='rgba(46,142,255,0.2)';this.style.boxShadow='none'"
    >
      <div style="width:176px;height:47px;border-radius:13px;background-color:#079854;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        Spustit Chat
      </div>
    </button>
  </div>
</div>

<!-- Chat Iframe (skrytý, otevře se po kliknutí) -->
<iframe 
  id="wany-chat-iframe"
  src="https://gr8learn.eu/embed.html"
  style="position:fixed;inset:0;width:100%;height:100%;border:0;z-index:999999;visibility:hidden;opacity:0;transition:opacity 0.3s ease;background:#fff;"
  allow="clipboard-write"
  title="Wany Chat"
></iframe>

<!-- Zavírací tlačítko (zobrazí se po otevření chatu) -->
<button 
  id="wany-chat-close-btn"
  onclick="closeWanyChat()"
  style="position:fixed;top:20px;right:20px;z-index:1000000;background:#ef4444;color:white;border:none;width:44px;height:44px;border-radius:50%;cursor:pointer;font-size:20px;visibility:hidden;opacity:0;transition:all 0.3s ease;box-shadow:0 4px 12px rgba(239,68,68,0.3);font-family:sans-serif;"
>✕</button>

<!-- JavaScript funkce -->
<script>
// Otevřít chat
function openWanyChat() {
  const iframe = document.getElementById('wany-chat-iframe');
  const closeBtn = document.getElementById('wany-chat-close-btn');
  
  if (iframe && closeBtn) {
    iframe.style.visibility = 'visible';
    iframe.style.opacity = '1';
    closeBtn.style.visibility = 'visible';
    closeBtn.style.opacity = '1';
    
    // Zablokovat scroll stránky
    document.body.style.overflow = 'hidden';
  }
}

// Zavřít chat
function closeWanyChat() {
  const iframe = document.getElementById('wany-chat-iframe');
  const closeBtn = document.getElementById('wany-chat-close-btn');
  
  iframe.style.visibility = 'hidden';
  iframe.style.opacity = '0';
  closeBtn.style.visibility = 'hidden';
  closeBtn.style.opacity = '0';
  
  // Obnovit scroll stránky
  document.body.style.overflow = '';
}

// ESC klávesa pro zavření
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    const iframe = document.getElementById('wany-chat-iframe');
    if (iframe.style.visibility === 'visible') {
      closeWanyChat();
    }
  }
});
</script>

<!-- Responzivní CSS pro mobil -->
<style>
@media (max-width: 768px) {
  #wany-chat-tile {
    padding: 24px !important;
    max-width: calc(100% - 40px) !important;
    margin: 20px auto !important;
  }
  #wany-chat-tile h2 {
    font-size: 24px !important;
  }
  #wany-chat-tile p {
    font-size: 15px !important;
  }
}
</style>

<!-- ========================================
     WANY CHAT WIDGET - END
     ======================================== -->
```

---

## 🎯 Kde vložit kód

### Struktura HTML stránky:
```html
<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <title>Vaše stránka</title>
    <!-- Vaše CSS a meta tagy -->
</head>
<body>
    
    <!-- Váš obsah stránky -->
    <header>...</header>
    <main>...</main>
    <footer>...</footer>
    
    <!-- ⬇️ VLOŽTE WANY CHAT KÓD SEM ⬇️ -->
    
</body>
</html>
```

---

## ✅ Co kód dělá

### 1. **Dlaždice s obrázkem**
- Zobrazí se na stránce tam, kde kód vložíte
- Má obrázek na pozadí s tmavým overlay
- Obsahuje nadpis, text a tlačítko

### 2. **Tlačítko "Spustit Chat"**
- Zelené tlačítko (#079854)
- Modrý glow efekt při najetí myší
- Po kliknutí otevře chat

### 3. **Chat Iframe**
- Otevře se přes celou obrazovku
- URL: `https://gr8learn.eu/embed.html`
- Plně funkční Wany Chat

### 4. **Zavírací tlačítko**
- Červený křížek v pravém horním rohu
- Zobrazí se jen když je chat otevřený
- Zavře chat

### 5. **ESC klávesa**
- Také zavře chat
- Obnoví scroll stránky

---

## 📱 Responzivita

- **Desktop**: Dlaždice max 420px šířka
- **Mobil**: Přizpůsobí se šířce obrazovky
- **Chat**: Vždy fullscreen při otevření

---

## 🧪 Testování

### Před nasazením otestujte:

1. **Klikněte na tlačítko** → Chat se otevře
2. **Červený křížek** → Chat se zavře
3. **ESC klávesa** → Chat se zavře
4. **Mobilní zařízení** → Vše responzivní
5. **Hover efekt** → Modrý glow na tlačítku

### Přímý test embed URL:
```
https://gr8learn.eu/embed.html
```
Otevřete v prohlížeči a ověřte, že chat funguje.

---

## 🎨 Customizace (volitelné)

### Změnit pozici dlaždice:
```css
#wany-chat-tile {
  margin: 40px auto; /* nebo margin: 0; pro přilepení k levému okraji */
}
```

### Změnit obrázek na pozadí:
```html
background-image:url('VAŠE_URL_OBRÁZKU');
```

### Změnit barvu tlačítka:
```css
background-color: #079854; /* změňte hex kód */
```

---

## 🔧 Troubleshooting

### Problém: Chat se neotevírá
- **Zkontrolujte**: Je funkce `openWanyChat()` správně definovaná?
- **Zkontrolujte**: Je iframe `id="wany-chat-iframe"` v HTML?

### Problém: Obrázek na pozadí se nezobrazuje
- **Zkontrolujte**: Je URL obrázku dostupná?
- **Zkontrolujte**: Není blokována CSP politikou webu?

### Problém: Tlačítko nemá hover efekt
- **Zkontrolujte**: Jsou funkce `onmouseover` a `onmouseout` na tlačítku?

---

## 📞 Podpora

Pokud narazíte na jakýkoliv problém během implementace, kontaktujte nás.

---

**Status**: ✅ Připraveno k nasazení  
**Poslední aktualizace**: 6. ledna 2025  
**Verze**: 1.0 (Finální)

