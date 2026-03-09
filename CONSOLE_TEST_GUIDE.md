# Test Account API - CONSOLE VERZE

## Nejrychlejší způsob (přímo v aplikaci)

### Postup:

1. **Otevři aplikaci** - jdi na http://localhost:5173
2. **Přihlaš se** - zadej login
3. **Otevři DevTools** - stiskni `F12` (nebo `Cmd+Option+I` na Macu)
4. **Jdi na Console tab** (viz obrázek níže)
5. **Zkopíruj a vlož** tento kód:

```javascript
(async () => {
    console.log('%c🚀 SPOUŠTĚNÍ TESTU ACCOUNT API', 'color: blue; font-size: 16px; font-weight: bold;');
    
    // 1. Načti token z localStorage
    const sessionStr = localStorage.getItem('app_user_session');
    if (!sessionStr) {
        console.error('%c❌ Session nenalezena! Nejsi přihlášen.', 'color: red; font-weight: bold;');
        return;
    }
    
    const session = JSON.parse(sessionStr);
    const token = session.token;
    const email = session.email;
    
    console.log(`%c✅ Session nalezena`, 'color: green; font-weight: bold;');
    console.log(`📧 Email: ${email}`);
    console.log(`🔐 Token: ${token.substring(0, 35)}...`);
    
    // 2. Příprava API call
    const apiUrl = 'https://api.mybewit.com/account?include=bbo.customer';
    console.log(`\n🌐 API URL: ${apiUrl}`);
    console.log('%c⏳ Odesílám požadavek...', 'color: orange;');
    
    try {
        // 3. Volej API
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        console.log(`\n📊 HTTP Status: ${response.status} ${response.statusText}`);
        
        // 4. Výsledky
        const data = await response.json();
        
        if (!response.ok) {
            console.error('%c❌ API vrátila chybu', 'color: red; font-weight: bold;');
            console.error('Chyba data:');
            console.table(data);
            return;
        }

        console.log('%c✅ Úspěšná odpověď!', 'color: green; font-weight: bold;');
        console.log('\n📦 Vrácená data:');
        console.table(data);
        console.log('Kompletní data:', data);

    } catch (err) {
        console.error('%c❌ Chyba při volání API:', 'color: red; font-weight: bold;', err);
    }
    
    console.log('\n%c✅ Test dokončen', 'color: green; font-weight: bold; font-size: 14px;');
})();
```

6. **Stiskni Enter** a čekej na výsledky

## Očekávaný výstup

```
🚀 SPOUŠTĚNÍ TESTU ACCOUNT API
✅ Session nalezena
📧 Email: petr.hajduk@bewit.team
🔐 Token: abc123def456ghij789klm...

🌐 API URL: https://api.mybewit.com/account?include=bbo.customer
⏳ Odesílám požadavek...

📊 HTTP Status: 200 OK

📦 Vrácená data:
{
  "id": "...",
  "email": "...",
  "bbo": {
    "id": 123,
    "customer": {...}
  }
}

✅ Test dokončen
```

## Alternativa - S BBO ID

Pokud chceš filtrovat podle BBO ID, uprav řádek:

```javascript
const apiUrl = 'https://api.mybewit.com/account?include=bbo.customer&bbo_id=123';
```

## Troubleshooting

### ❌ "Session nenalezena! Nejsi přihlášen."
- Musíš být přihlášen v aplikaci
- Zkontroluj, že jsi na http://localhost:5173
- Zkus se odhlásit a znovu přihlásit

### ❌ "API vrátila chybu 401"
- Token je neplatný nebo vypršel
- Zkus se odhlásit a znovu přihlásit

### ❌ "API vrátila chybu 403"
- Nemáš oprávnění pro `bbo.customer`
- Zkontroluj svou roli v databázi

### ❌ Network error
- Zkontroluj, že `https://api.mybewit.com` je dostupná
- Zkontroluj internetové připojení
- Zkontroluj firewall

## Kde vidím výsledky?

Console je spodní část DevTools - mělo by to vypadat takto:

```
[DevTools] Console Tab
> (máš zde výstup testu)
```

---

**Tip:** Pokud chceš kód znovu spustit, prostě ho zkopíruj znovu a vlož do Console a stiskni Enter. 🚀
