# 🚀 Wany Chat Widget - Finální Kód pro Klienta

## 📋 Návod pro IT oddělení

### Co potřebujete vložit na web:

Zkopírujte níže uvedený kód a vložte ho **před ukončovací tag `</body>`** na vaší webové stránce.

---

## 💻 KOMPLETNÍ KÓD

```html
<!-- Wany Chat Dlaždice -->
<div style="background:white;border-radius:24px;padding:40px;box-shadow:0 4px 6px -1px rgb(0 0 0 / 0.1);max-width:420px;margin:0 auto;text-align:center;">
  <h2 style="font-size:28px;color:#1e293b;margin-bottom:16px;">Poradce na čínské wany</h2>
  
  <div style="display:flex;flex-direction:column;align-items:center;gap:24px;">
    <p style="color:#64748b;line-height:1.6;font-size:16px;margin:0;">
      Náš asistent na wany dodá informace a poradí s výběrem produktu
    </p>
    
    <button 
      id="wany-chat-btn"
      onclick="openWanyChat()"
      style="width:180px;height:51px;border-radius:15px;cursor:pointer;transition:0.3s ease;background:linear-gradient(to bottom right,#2e8eff 0%,rgba(46,142,255,0) 30%);background-color:rgba(46,142,255,0.2);border:none;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;"
      onmouseover="this.style.backgroundColor='rgba(46,142,255,0.7)';this.style.boxShadow='0 0 10px rgba(46,142,255,0.5)'"
      onmouseout="this.style.backgroundColor='rgba(46,142,255,0.2)';this.style.boxShadow='none'"
    >
      <div style="width:176px;height:47px;border-radius:13px;background-color:#079854;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:16px;">
        Spustit Chat
      </div>
    </button>
  </div>
</div>

<!-- Chat Iframe -->
<iframe 
  id="wany-chat-iframe"
  src="https://gr8learn.eu/embed.html"
  style="position:fixed;inset:0;width:100%;height:100%;border:0;z-index:999999;visibility:hidden;opacity:0;transition:opacity 0.3s;"
  allow="clipboard-write"
></iframe>

<!-- Zavírací tlačítko -->
<button 
  id="wany-close-btn"
  onclick="closeWanyChat()"
  style="position:fixed;top:20px;right:20px;z-index:1000000;background:#ef4444;color:white;border:none;width:44px;height:44px;border-radius:50%;cursor:pointer;font-size:20px;visibility:hidden;opacity:0;transition:all 0.3s;"
>✕</button>

<script>
function openWanyChat() {
  document.getElementById('wany-chat-iframe').style.visibility='visible';
  document.getElementById('wany-chat-iframe').style.opacity='1';
  document.getElementById('wany-close-btn').style.visibility='visible';
  document.getElementById('wany-close-btn').style.opacity='1';
  document.body.style.overflow='hidden';
}

function closeWanyChat() {
  document.getElementById('wany-chat-iframe').style.visibility='hidden';
  document.getElementById('wany-chat-iframe').style.opacity='0';
  document.getElementById('wany-close-btn').style.visibility='hidden';
  document.getElementById('wany-close-btn').style.opacity='0';
  document.body.style.overflow='';
}

// ESC key pro zavření
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closeWanyChat();
  }
});
</script>

<!-- Responzivní CSS pro mobil -->
<style>
@media (max-width: 768px) {
  .wany-tile-responsive {
    padding: 24px !important;
    max-width: calc(100% - 40px) !important;
  }
  .wany-tile-responsive h2 {
    font-size: 24px !important;
  }
}
</style>
```

---

## 🎨 Design Specifikace

### Dlaždice:
- **Rozměry**: Max-width 420px (téměř čtvercová)
- **Pozadí**: Bílá (#ffffff)
- **Stíny**: Jemný shadow pro hloubku
- **Border-radius**: 24px (zaoblené rohy)
- **Padding**: 40px

### Tlačítko:
- **Barva**: Zelená (#10b981)
- **Okraj**: Modrý gradient s glow efektem (#2e8eff)
- **Text**: "Spustit Chat"
- **Hover efekt**: Zesiluje modrou barvu a glow

### Text:
- **Nadpis**: 28px, tmavě šedá (#1e293b)
- **Popis**: 16px, středně šedá (#64748b)
- **Zarovnání**: Vše vycentrované

---

## 📱 Responzivita

Widget je plně responzivní:
- **Desktop**: Kompaktní čtvercová dlaždice (420px)
- **Mobil**: Přizpůsobí se šířce obrazovky
- **Chat**: Na mobilu se otevře přes celou obrazovku

---

## ✅ Funkce

1. **Kliknutí na tlačítko** → Otevře se Wany Chat na celou obrazovku
2. **Červený křížek v rohu** → Zavře chat
3. **ESC klávesa** → Také zavře chat
4. **Žádné konflikty** → 100% CSS izolace
5. **Automatické aktualizace** → Změny na serveru se projeví okamžitě

---

## 🔧 Umístění kódu

### Kde vložit:
```html
<!DOCTYPE html>
<html>
<head>
    <title>Vaše stránka</title>
</head>
<body>
    
    <!-- Váš obsah stránky -->
    
    <!-- ⬇️ VLOŽTE KÓD SEM (před </body>) -->
    
</body>
</html>
```

---

## 🧪 Testování

Před nasazením do produkce:

1. **Otevřete přímo embed URL**: `https://gr8learn.eu/embed.html`
2. **Ověřte, že se chat načte**
3. **Vložte kód na testovací stránku**
4. **Zkuste otevřít/zavřít chat**
5. **Otestujte na mobilu**

---

## 📞 Podpora

Pokud narazíte na jakýkoliv problém během implementace, kontaktujte nás.

**Poznámka**: URL `https://gr8learn.eu/embed.html` je již aktivní a připravená k použití.

---

## 🎯 Preview

Vytvořenou dlaždici můžete vidět na: `file:///.../demo-final-tile.html`

---

**Poslední aktualizace**: 6. ledna 2025  
**Status**: ✅ Připraveno k nasazení

