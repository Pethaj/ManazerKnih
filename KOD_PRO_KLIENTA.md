# 🚀 Wany Chat Widget - Kód pro Klienta

## ✅ CO BYLO DOKONČENO

1. ✅ **Vytvořen `vercel.json`** s CSP hlavičkami pro iframe embedding
2. ✅ **Vytvořen `embed.html`** jako standalone entry point
3. ✅ **Build zkontrolován** - `embed.html` je v `dist/`
4. ✅ **Git commit & push** do main branch
5. ✅ **Vercel automaticky deployuje** (GitHub je napojený na Vercel)

---

## 🎯 ČEKÁNÍ NA VERCEL DEPLOYMENT

**STAV**: Pushed do GitHubu, Vercel právě builduje...

### Jak ověřit že je deployment hotový:

1. Otevři Vercel Dashboard: https://vercel.com/dashboard
2. Najdi projekt (nejspíš `ManazerKnih` nebo podobně)
3. Počkej až se zobrazí **"Ready"** ✅
4. Klikni na deployment a zkontroluj URL

---

## 📋 KÓD PRO KLIENTA (3 VARIANTY)

### **🎯 VARIANTA 1: Vždy viditelný chat (NEJJEDNODUŠŠÍ)**

Klient vloží tento kód **před `</body>` tag**:

```html
<!-- Wany Chat Widget -->
<iframe
  src="https://gr8learn.eu/embed.html"
  style="position:fixed; right:24px; bottom:24px; width:1200px; height:700px; border:0; border-radius:16px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.25); z-index:999999;"
  allow="clipboard-write"
  title="Wany Chat"
></iframe>
```

---

### **🎯 VARIANTA 2: S jednoduchým tlačítkem**

```html
<!-- Wany Chat - Simple Toggle -->
<button 
  onclick="document.getElementById('wany-iframe').style.display = document.getElementById('wany-iframe').style.display === 'none' ? 'block' : 'none'" 
  style="position:fixed; right:24px; bottom:24px; width:65px; height:65px; border-radius:50%; background:#2563eb; color:white; font-size:28px; border:none; cursor:pointer; z-index:999998; box-shadow:0 10px 25px rgba(37,99,235,0.3);">
  💬
</button>

<iframe
  id="wany-iframe"
  src="https://gr8learn.eu/embed.html"
  style="display:none; position:fixed; right:24px; bottom:100px; width:1200px; height:700px; border:0; border-radius:24px; box-shadow:0 40px 100px -20px rgba(0,0,0,0.4); z-index:999999;"
  allow="clipboard-write"
  title="Wany Chat"
></iframe>
```

---

### **🎯 VARIANTA 3: S pokročilým toggle tlačítkem (DOPORUČENÁ)**

```html
<!-- Wany Chat Widget - Toggle Button -->
<script>
  (function() {
    const EMBED_URL = 'https://gr8learn.eu/embed.html';
    
    // Vytvoření toggle tlačítka
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'wany-chat-toggle';
    toggleBtn.innerHTML = '💬';
    toggleBtn.style.cssText = `
      position: fixed;
      right: 24px;
      bottom: 24px;
      width: 65px;
      height: 65px;
      border-radius: 50%;
      background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
      border: none;
      color: white;
      font-size: 28px;
      cursor: pointer;
      box-shadow: 0 15px 35px rgba(37,99,235,0.35);
      z-index: 999998;
      transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    `;
    
    // Vytvoření iframe
    const iframe = document.createElement('iframe');
    iframe.id = 'wany-chat-iframe';
    iframe.src = EMBED_URL;
    iframe.allow = 'clipboard-write';
    iframe.title = 'Wany Chat';
    iframe.style.cssText = `
      position: fixed;
      z-index: 999999;
      border: 0;
      transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
      opacity: 0;
      transform: translateY(10px) scale(0.95);
      visibility: hidden;
      pointer-events: none;
      background-color: white;
    `;
    
    let isOpen = false;
    
    // Toggle funkce
    toggleBtn.addEventListener('click', function() {
      isOpen = !isOpen;
      
      if (isOpen) {
        // Otevřít chat
        toggleBtn.innerHTML = '✕';
        toggleBtn.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
        toggleBtn.style.transform = 'rotate(90deg)';
        
        iframe.style.opacity = '1';
        iframe.style.transform = 'translateY(0) scale(1)';
        iframe.style.visibility = 'visible';
        iframe.style.pointerEvents = 'auto';
        
        // Desktop
        if (window.innerWidth >= 768) {
          iframe.style.right = '24px';
          iframe.style.bottom = '100px';
          iframe.style.width = '1200px';
          iframe.style.height = '700px';
          iframe.style.borderRadius = '24px';
          iframe.style.boxShadow = '0 40px 100px -20px rgba(0,0,0,0.4)';
          iframe.style.top = 'auto';
          iframe.style.left = 'auto';
        } else {
          // Mobile - fullscreen
          iframe.style.top = '0';
          iframe.style.left = '0';
          iframe.style.width = '100vw';
          iframe.style.height = '100vh';
          iframe.style.borderRadius = '0';
        }
      } else {
        // Zavřít chat
        toggleBtn.innerHTML = '💬';
        toggleBtn.style.background = 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)';
        toggleBtn.style.transform = 'rotate(0deg)';
        
        iframe.style.opacity = '0';
        iframe.style.transform = 'translateY(10px) scale(0.95)';
        iframe.style.visibility = 'hidden';
        iframe.style.pointerEvents = 'none';
      }
    });
    
    // Hover efekt
    toggleBtn.addEventListener('mouseenter', function() {
      toggleBtn.style.transform = isOpen ? 'rotate(90deg) scale(1.1)' : 'scale(1.1)';
    });
    
    toggleBtn.addEventListener('mouseleave', function() {
      toggleBtn.style.transform = isOpen ? 'rotate(90deg) scale(1)' : 'scale(1)';
    });
    
    // Vložení do stránky
    document.body.appendChild(toggleBtn);
    document.body.appendChild(iframe);
    
    console.log('✅ Wany Chat widget loaded successfully');
  })();
</script>
```

---

## 🧪 TESTOVÁNÍ

### 1. Otevři v prohlížeči:
```
https://gr8learn.eu/embed.html
```

Měl by se zobrazit **Wany Chat** s:
- ✅ Header s Sana AI logem
- ✅ Filtry: TČM, Wany
- ✅ Typy publikací: Interní, Veřejné, Pro studenty
- ✅ Input pole "Jak vám mohu pomoci..."
- ✅ **BEZ** štítků (skryté)
- ✅ **BEZ** tlačítka zavřít

### 2. Zkontroluj CSP hlavičky:
```bash
curl -I https://gr8learn.eu/embed.html | grep -i "content-security\|x-frame"
```

Měl by vrátit:
```
Content-Security-Policy: frame-ancestors *
X-Frame-Options: ALLOWALL
```

---

## 🎊 FINÁLNÍ KROKY PRO KLIENTA

1. **Čekej až Vercel deployment dokončí** (cca 2-5 minut)
2. **Otestuj** `https://gr8learn.eu/embed.html` přímo v prohlížeči
3. **Vyber jednu variantu** kódu (doporučuji Variantu 3)
4. **Vlož kód** na svůj web před `</body>` tag
5. **Otestuj** na svém webu

---

## 🔧 TROUBLESHOOTING

### Problém: 404 Not Found
**Řešení**: Vercel ještě builduje, počkej 2-5 minut

### Problém: "Refused to display in a frame"
**Řešení**: CSP hlavičky nejsou aktivní, restartuj Vercel deployment

### Problém: Chat se nezobrazuje
**Řešení**: Otevři F12 (konzoli) a zkontroluj chyby

---

## ✅ DEPLOYMENT CHECKLIST

- [x] `vercel.json` vytvořen s CSP hlavičkami
- [x] `embed.html` existuje v projektu
- [x] Build projde bez chyb
- [x] Git commit & push do main
- [ ] **ČEKÁ SE NA VERCEL** ⏳
- [ ] Otestovat `https://gr8learn.eu/embed.html`
- [ ] Zkontrolovat CSP hlavičky
- [ ] Poslat kód klientovi

---

**STAV**: 🟡 Čeká se na Vercel deployment (automatické)
**NEXT STEP**: Zkontroluj Vercel Dashboard za 2-5 minut


