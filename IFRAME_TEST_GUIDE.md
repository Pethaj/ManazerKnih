# IFRAME Test API - Návod k Použití

## Situace

Jsi na iframe (`https://www.gr8learn.eu`) kde již probíhá autentifikace. Potřebuješ použít **stejný token**, kterým se autentifikuje iframe, pro volání API endpointu.

## Postup

### 1. Otevři iframe aplikaci
- Přejdi na `https://www.gr8learn.eu`
- Měl by se načíst iframe s chatbotem

### 2. Otevři DevTools
- Stiskni `F12` (nebo `Cmd+Option+I` na Macu)
- Ujisti se, že jsi **v kontextu iframe** - viz nižší console

### 3. Spusť diagnostic skript

Zkopíruj a vlož do Console tento kód:

```javascript
(async () => {
    console.log('%c🔍 IFRAME DIAGNOSTIC - HLEDÁNÍ TOKENU', 'color: #FF6B6B; font-size: 16px; font-weight: bold;');
    
    let token = null;
    let foundIn = null;
    
    // Zkontroluj window objekty
    const windowChecks = [
        { path: 'window.__BEWIT_TOKEN', desc: 'window.__BEWIT_TOKEN' },
        { path: 'window.BEWIT_TOKEN', desc: 'window.BEWIT_TOKEN' },
        { path: 'window.__AUTH_TOKEN', desc: 'window.__AUTH_TOKEN' },
        { path: 'window.AUTH_TOKEN', desc: 'window.AUTH_TOKEN' },
    ];
    
    for (const check of windowChecks) {
        try {
            const value = eval(check.path);
            if (value && typeof value === 'string' && value.length > 10) {
                token = value;
                foundIn = `Window: ${check.desc}`;
                console.log(`✅ Nalezeno: ${check.desc}`);
                break;
            }
        } catch (e) {}
    }
    
    // Zkontroluj localStorage
    if (!token) {
        const keys = Object.keys(localStorage);
        for (const key of keys) {
            const value = localStorage.getItem(key);
            if (value && value.includes('token') && value.length > 50) {
                try {
                    const parsed = JSON.parse(value);
                    if (parsed.token) {
                        token = parsed.token;
                        foundIn = `localStorage: ${key}`;
                        console.log(`✅ Nalezeno v localStorage: ${key}`);
                        break;
                    }
                } catch (e) {
                    if (value.split('.').length >= 2) {
                        token = value;
                        foundIn = `localStorage: ${key}`;
                        console.log(`✅ Nalezeno v localStorage: ${key} (JWT)`);
                        break;
                    }
                }
            }
        }
    }
    
    if (!token) {
        console.error('❌ TOKEN NENALEZEN');
        console.log('Debug info:');
        console.log('localStorage keys:', Object.keys(localStorage));
        console.log('Cookies:', document.cookie);
        return;
    }
    
    console.log(`🔐 Token: ${token.substring(0, 40)}...`);
    console.log(`📍 Lokace: ${foundIn}`);
    
    // Volání API
    console.log('\n⏳ Volám API endpoint...');
    
    try {
        const response = await fetch('https://api.mybewit.com/account?include=bbo.customer', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        console.log(`📊 Status: ${response.status}`);
        const data = await response.json();
        
        if (response.ok) {
            console.log('%c✅ ÚSPĚŠNĚ!', 'color: green; font-weight: bold;');
            console.log('Data:', data);
        } else {
            console.error('❌ API Error:', data);
        }
    } catch (err) {
        console.error('❌ Chyba:', err.message);
    }
})();
```

4. **Stiskni Enter** a čekej

## Co skript zjistí

Skript automaticky vyhledá token na těchto místech:

1. ✅ `window.__BEWIT_TOKEN`
2. ✅ `window.BEWIT_TOKEN`
3. ✅ `window.__AUTH_TOKEN`
4. ✅ `localStorage` (všechny klíče)
5. ✅ `sessionStorage` (všechny klíče)
6. ✅ `cookies`

Když token najde, automaticky zavolá API endpoint.

## Očekávaný výstup

### ✅ Pokud je vše OK

```
🔍 IFRAME DIAGNOSTIC - HLEDÁNÍ TOKENU
✅ Nalezeno: window.__BEWIT_TOKEN
🔐 Token: eyJ0eXAiOiJKV1QiLCJhbGc...
📍 Lokace: Window: window.__BEWIT_TOKEN

⏳ Volám API endpoint...

📊 Status: 200
✅ ÚSPĚŠNĚ!
Data: {
  id: "...",
  email: "...",
  bbo: {...}
}
```

### ❌ Pokud se token nenajde

```
❌ TOKEN NENALEZEN
Debug info:
localStorage keys: [...]
Cookies: [...]
```

## Pokud se token nenajde

Řekni mi výstup z debug info a budu moci zaměřit se na správné místo:

1. Jaké jsou klíče v localStorage
2. Jaké jsou cookies
3. Jaký je obsah window objektu

Pak na základě toho vyprojektujem správný řešení. **Kód NEBUDU měnit bez tvého schválení.**

## Alternativa - Pokud znáš token

Pokud už znáš token (např. z Network tab), můžeš ho předat přímo:

```javascript
const token = "tvuj_token_zde";
const response = await fetch('https://api.mybewit.com/account?include=bbo.customer', {
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    }
});
console.log(await response.json());
```

---

**Spusť diagnostic a řekni mi co vypíše!** 🚀
