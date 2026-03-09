# Test Account API - BBO Customer - Návod k Použití

## Co test dělá

Test zavolá API endpoint s Bearer tokenem a zaloguje odpověď:

```
https://api.mybewit.com/account?include=bbo.customer
```

**Header:**
```json
{
  "Authorization": "Bearer {tvuj_token}"
}
```

**Optional Parameter:**
- `bbo_id` (Integer) - ID BBO pro filtrování

## Spuštění

### 1. Bez BBO ID

```bash
API_TOKEN="tvuj_token" npx tsx test-account-api.ts
```

### 2. S BBO ID

```bash
API_TOKEN="tvuj_token" BBO_ID="123" npx tsx test-account-api.ts
```

### 3. Pomocí export

```bash
export API_TOKEN="tvuj_token"
export BBO_ID="123"
npx tsx test-account-api.ts
```

## Příklady

```bash
# Jednoduchý test
API_TOKEN="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiO" npx tsx test-account-api.ts

# S BBO ID
API_TOKEN="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiO" BBO_ID="456" npx tsx test-account-api.ts
```

## Výstup testu

```
╔═══════════════════════════════════════════╗
║   TEST ACCOUNT API - BBO CUSTOMER       ║
╚═══════════════════════════════════════════╝

🌐 API URL: https://api.mybewit.com/account?include=bbo.customer&bbo_id=123
🔐 Token: eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
📍 BBO ID: 123

⏳ Odesílám požadavek...

📊 HTTP Status: 200 OK

📋 Response Headers:
   content-type: application/json
   ...

✅ Úspěšná odpověď!

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

## Troubleshooting

### Chyba: "Token není nastavený"
```bash
API_TOKEN="tvuj_token" npx tsx test-account-api.ts
```

### Chyba 401 - Unauthorized
- Token je neplatný nebo vypršel
- Zkontroluj správnost tokenu

### Chyba 403 - Forbidden
- Uživatel nemá oprávnění pro `bbo.customer` include
- Zkontroluj roli uživatele

### Chyba 404 - Not Found
- BBO ID neexistuje
- Zkontroluj, že je správný BBO_ID

### Network Error
- Zkontroluj připojení na `https://api.mybewit.com`
- Zkontroluj internetové připojení

## API Specifikace

| Field | Type | Description |
|-------|------|-------------|
| Endpoint | GET | `/account?include=bbo.customer` |
| Authorization | Bearer | Access token v headeru |
| bbo_id | Integer | Optional - ID BBO pro filtrování |

---

Happy testing! 🚀
