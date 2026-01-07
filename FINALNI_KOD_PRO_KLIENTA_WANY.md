# 🎯 Wany Chat Widget - Finální Kód pro Integraci

## 📋 Instrukce pro IT oddělení klienta

### Co tento kód dělá:
- Zobrazí **elegantní dlaždici** s tlačítkem "Spustit Chat"
- Po kliknutí otevře **Sana AI chat uprostřed obrazovky** (ne přes celou obrazovku)
- Chat lze zavřít:
  - Kliknutím na **zavírací křížek** (vpravo nahoře)
  - Kliknutím na **tmavé pozadí** kolem chatu
  - Stisknutím **ESC klávesy**

---

## 🚀 Instalace

### Krok 1: Zkopírovat kód
Zkopírujte celý kód níže (od `<!-- WANY CHAT WIDGET - START -->` až po `<!-- WANY CHAT WIDGET - END -->`).

### Krok 2: Vložit na web
Vložte zkopírovaný kód **před ukončovací tag `</body>`** na vaší stránce.

### Krok 3: Hotovo
Widget je okamžitě funkční. Žádné další závislosti nejsou potřeba.

---

## 💻 Kompletní Kód (Copy & Paste)

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

<!-- Overlay pozadí (tmavé pozadí za modálem) -->
<div 
  id="wany-chat-overlay"
  onclick="closeWanyChat()"
  style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:999998;visibility:hidden;opacity:0;transition:opacity 0.3s ease;backdrop-filter:blur(4px);"
></div>

<!-- Chat Modal Wrapper (pro správné umístění křížku) -->
<div 
  id="wany-chat-wrapper"
  style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) scale(0.95);width:90%;max-width:1200px;height:85%;max-height:800px;z-index:999999;visibility:hidden;opacity:0;transition:all 0.3s ease;"
>
  <!-- Nenápadný zavírací křížek (mimo modal, těsně u rohu) -->
  <button 
    id="wany-close-btn"
    onclick="closeWanyChat()"
    style="position:absolute;top:-48px;right:0;z-index:10;background:rgba(0,0,0,0.6);color:white;border:none;width:36px;height:36px;border-radius:8px;cursor:pointer;font-size:18px;font-family:sans-serif;transition:all 0.2s ease;display:flex;align-items:center;justify-content:center;"
    onmouseover="this.style.opacity='1';this.style.background='rgba(0,0,0,0.9)'"
    onmouseout="this.style.opacity='0.8';this.style.background='rgba(0,0,0,0.6)'"
  >✕</button>

  <!-- Chat Modal (uprostřed obrazovky) -->
  <div 
    id="wany-chat-modal"
    style="width:100%;height:100%;border-radius:24px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);overflow:hidden;"
  >
    <!-- Chat Iframe -->
    <iframe 
      id="wany-chat-iframe"
      src="https://gr8learn.eu/embed.html"
      style="width:100%;height:100%;border:0;border-radius:24px;background:#fff;"
      allow="clipboard-write"
      title="Wany Chat"
    ></iframe>
  </div>
</div>

<!-- JavaScript funkce -->
<script>
// Otevřít chat
function openWanyChat() {
  const wrapper = document.getElementById('wany-chat-wrapper');
  const overlay = document.getElementById('wany-chat-overlay');
  
  if (wrapper && overlay) {
    // Zobrazit overlay a wrapper (který obsahuje modal i křížek)
    overlay.style.visibility = 'visible';
    overlay.style.opacity = '1';
    wrapper.style.visibility = 'visible';
    wrapper.style.opacity = '1';
    wrapper.style.transform = 'translate(-50%, -50%) scale(1)';
    
    // Zablokovat scroll stránky
    document.body.style.overflow = 'hidden';
  }
}

// Zavřít chat
function closeWanyChat() {
  const wrapper = document.getElementById('wany-chat-wrapper');
  const overlay = document.getElementById('wany-chat-overlay');
  
  if (wrapper && overlay) {
    overlay.style.visibility = 'hidden';
    overlay.style.opacity = '0';
    wrapper.style.visibility = 'hidden';
    wrapper.style.opacity = '0';
    wrapper.style.transform = 'translate(-50%, -50%) scale(0.95)';
    
    // Obnovit scroll stránky
    document.body.style.overflow = '';
  }
}

// ESC klávesa pro zavření
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    const wrapper = document.getElementById('wany-chat-wrapper');
    if (wrapper && wrapper.style.visibility === 'visible') {
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
  #wany-chat-wrapper {
    width: 95% !important;
    height: 90% !important;
    max-width: none !important;
    max-height: none !important;
  }
}
</style>

<!-- ========================================
     WANY CHAT WIDGET - END
     ======================================== -->
```

---

## 🎨 Vlastnosti Widgetu

### Desktop
- **Dlaždice**: Max šířka 420px, responzivní
- **Chat modal**: 90% šířky obrazovky, max 1200px
- **Výška chatu**: 85% obrazovky, max 800px
- **Pozice**: Uprostřed obrazovky
- **Zaoblené rohy**: 24px
- **Tmavé pozadí**: S blur efektem

### Mobil (pod 768px)
- **Dlaždice**: Zmenšené odsazení
- **Chat modal**: 95% šířky, 90% výšky
- **Plně responzivní**

### Interakce
- ✅ Kliknutí na tlačítko "Spustit Chat"
- ✅ Zavření křížkem (vpravo nahoře)
- ✅ Zavření kliknutím na tmavé pozadí
- ✅ Zavření ESC klávesou
- ✅ Zablokování scrollu stránky při otevřeném chatu

---

## 🔧 Technické Detaily

### Bez závislostí
- Čistý HTML, CSS, JavaScript
- Žádné externí knihovny
- Okamžitě funkční

### Kompatibilita
- ✅ Všechny moderní prohlížeče
- ✅ Desktop i mobil
- ✅ Tablet

### Z-index hodnoty
- Overlay: `999998`
- Modal wrapper: `999999`
- Close button: `10` (relativní k wrapperu)

---

## 📝 Poznámky

1. **Umístění kódu**: Vložte před `</body>` tag
2. **Testování**: Po vložení obnovte stránku (Ctrl+F5)
3. **Úpravy textu**: Můžete upravit texty v nadpisu a popisu
4. **Barvy**: Barvy tlačítka lze změnit v inline stylech

---

## ✅ Checklist pro IT oddělení

- [ ] Zkopírovat celý kód widgetu
- [ ] Otevřít HTML soubor webu
- [ ] Najít ukončovací tag `</body>`
- [ ] Vložit kód před `</body>`
- [ ] Uložit soubor
- [ ] Nahrát na server
- [ ] Otestovat na webu
- [ ] Otestovat na mobilu

---

## 🆘 Podpora

V případě problémů kontaktujte vývojářský tým.

**Verze:** 1.0  
**Datum:** 6. ledna 2025  
**Status:** ✅ Produkční verze připravená k nasazení

