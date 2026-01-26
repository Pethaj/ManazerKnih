# 🔧 N8N - Práce s uživatelskými daty z iframe

Návod jak zpracovat user data v N8N workflow.

---

## 📥 Příchozí data z iframe widgetu

```json
{
  "sessionId": "c1cf2db8fabcf74e5318d0b65c2c720a",
  "action": "sendMessage",
  "chatInput": "jake jsou wany na bolest hlavy?",
  "chatHistory": [],
  "intent": "chat",
  "metadata": {
    "categories": ["TČM", "Wany"],
    "publication_types": ["internal_bewit", "public"]
  },
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "jan.novak@example.com",
    "firstName": "Jan",
    "lastName": "Novák",
    "role": "user"
  }
}
```

---

## 💡 N8N Workflow příklady

### 1. Personalizovaná odpověď

**Node:** Code (JavaScript)

```javascript
// Získáme jméno uživatele nebo použijeme fallback
const firstName = $json.user?.firstName || 'uživateli';
const lastName = $json.user?.lastName || '';
const fullName = `${firstName} ${lastName}`.trim();

// Personalizovaná odpověď
const response = `Dobrý den ${fullName},

Na základě vašeho dotazu jsem pro vás vybral následující wany:

1. Wan Ji Huang - bolest hlavy, migréna
2. Wan Tou Tong - tlak v hlavě, únava
3. Wan Xue Fu - zlepšení prokrvení mozku

Přejete si více informací o některém z produktů?`;

return {
  json: {
    text: response,
    user: $json.user // Předáme dál pro logování
  }
};
```

---

### 2. Kontrola přihlášení

**Node:** Switch (Route podle přihlášení)

```javascript
// IF Node - Route 1: Přihlášený uživatel
$json.user !== undefined && $json.user !== null

// IF Node - Route 2: Anonymní návštěvník
$json.user === undefined || $json.user === null
```

**Pak:**
- Route 1 → Detailní odpověď s personalizací
- Route 2 → Obecná odpověď + nabídka registrace

---

### 3. Uložení do databáze s user ID

**Node:** Supabase (Insert)

```javascript
// Table: chat_history
{
  "user_id": "{{ $json.user?.id || null }}",
  "session_id": "{{ $json.sessionId }}",
  "query": "{{ $json.chatInput }}",
  "response": "{{ $json.response }}",
  "created_at": "{{ new Date().toISOString() }}"
}
```

---

### 4. Filtrování podle role uživatele

**Node:** Code (JavaScript)

```javascript
const userRole = $json.user?.role || 'guest';

let response;

switch (userRole) {
  case 'admin':
    // Administrátoři vidí interní poznámky
    response = {
      text: 'Wan Ji Huang (Kód: WJH001, Sklad: 45ks) - vhodný pro...',
      showInternalNotes: true
    };
    break;
    
  case 'premium':
    // Premium uživatelé vidí detailní informace
    response = {
      text: 'Wan Ji Huang - kompletní složení, dávkování, kontraindikace...',
      showDetailedInfo: true
    };
    break;
    
  case 'user':
  default:
    // Standardní uživatelé vidí základní info
    response = {
      text: 'Wan Ji Huang - doporučujeme při bolestech hlavy...',
      showBasicInfo: true
    };
}

return { json: response };
```

---

### 5. Email notifikace při dotazu

**Node:** Send Email (Gmail)

```javascript
// To
admin@bewit.cz

// Subject
Nový dotaz od {{ $json.user?.firstName || "anonymního uživatele" }}

// Body
Dobrý den,

Uživatel {{ $json.user?.firstName }} {{ $json.user?.lastName }}
Email: {{ $json.user?.email || "N/A" }}
ID: {{ $json.user?.id || "anonymní" }}

Položil dotaz:
{{ $json.chatInput }}

Session ID: {{ $json.sessionId }}
Kategorie: {{ $json.metadata.categories.join(", ") }}

---
Automatická notifikace z BEWIT Intelligence
```

---

### 6. Analytics tracking

**Node:** HTTP Request (POST)

```javascript
// URL: https://your-analytics.com/api/track

// Body:
{
  "event": "chat_message",
  "properties": {
    "user_id": "{{ $json.user?.id || 'anonymous' }}",
    "user_email": "{{ $json.user?.email || 'N/A' }}",
    "session_id": "{{ $json.sessionId }}",
    "query": "{{ $json.chatInput }}",
    "categories": {{ JSON.stringify($json.metadata.categories) }},
    "timestamp": "{{ new Date().toISOString() }}"
  }
}
```

---

### 7. Doporučení podle historie uživatele

**Node:** Supabase (Query)

```sql
-- Načteme historii dotazů uživatele
SELECT * FROM chat_history
WHERE user_id = '{{ $json.user?.id }}'
ORDER BY created_at DESC
LIMIT 10
```

**Pak: Code node**

```javascript
// Analyzujeme historii
const history = $items[0].json;
const previousQueries = history.map(h => h.query);

// Detekujeme opakující se témata
const hasHeadacheTopic = previousQueries.some(q => 
  q.toLowerCase().includes('hlav') || 
  q.toLowerCase().includes('migrén')
);

let response;

if (hasHeadacheTopic) {
  response = `Vidím, že vás často trápí bolesti hlavy. 
  Kromě našich wan bych doporučil také:
  - Akupunkturu pro dlouhodobou úlevu
  - Knihu "TČM a bolesti hlavy" z naší databáze
  
  Přejete si více informací?`;
} else {
  response = `Pro bolesti hlavy doporučuji...`;
}

return { json: { text: response } };
```

---

### 8. Rate limiting podle uživatele

**Node:** Code (JavaScript)

```javascript
// Kontrola počtu dotazů za hodinu
const userId = $json.user?.id || $json.sessionId;
const now = Date.now();
const oneHourAgo = now - (60 * 60 * 1000);

// Načteme z cache/databáze
const userRequests = await getRequestCount(userId, oneHourAgo);

// Limity podle role
const limits = {
  admin: 1000,
  premium: 100,
  user: 50,
  guest: 10
};

const userRole = $json.user?.role || 'guest';
const limit = limits[userRole];

if (userRequests >= limit) {
  return {
    json: {
      text: `Dosáhli jste limitu ${limit} dotazů za hodinu. 
            ${userRole === 'guest' ? 'Přihlaste se pro vyšší limit.' : ''}`,
      rateLimited: true
    }
  };
}

// Pokračujeme normálně
return { json: $json };
```

---

### 9. Uložení preference uživatele

**Node:** Supabase (Upsert)

```javascript
// Table: user_preferences
{
  "user_id": "{{ $json.user?.id }}",
  "preferred_categories": {{ JSON.stringify($json.metadata.categories) }},
  "preferred_language": "cs",
  "last_active": "{{ new Date().toISOString() }}",
  "total_queries": "{{ $json.totalQueries + 1 }}"
}
```

---

### 10. Debug - Log user data

**Node:** Code (JavaScript)

```javascript
// Pro debugging v N8N
console.log('=== USER DATA DEBUG ===');
console.log('User ID:', $json.user?.id || 'N/A');
console.log('Email:', $json.user?.email || 'N/A');
console.log('Name:', $json.user?.firstName, $json.user?.lastName);
console.log('Role:', $json.user?.role || 'guest');
console.log('Session ID:', $json.sessionId);
console.log('Query:', $json.chatInput);
console.log('======================');

return { json: $json };
```

---

## 🔒 Bezpečnostní tipy

### 1. Vždy kontrolujte přítomnost user dat

```javascript
// ✅ Dobrý přístup
const userId = $json.user?.id || 'anonymous';

// ❌ Špatný přístup (může vyhodit chybu)
const userId = $json.user.id;
```

### 2. Validace user ID

```javascript
// Kontrola UUID formátu
const isValidUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

if ($json.user?.id && !isValidUUID($json.user.id)) {
  throw new Error('Invalid user ID format');
}
```

### 3. Sanitizace emailu

```javascript
const sanitizeEmail = (email) => {
  return email?.toLowerCase().trim();
};

const userEmail = sanitizeEmail($json.user?.email);
```

---

## 📊 Užitečné N8N výrazy

```javascript
// Kontrola přihlášení
{{ $json.user ? 'Přihlášen' : 'Anonymní' }}

// Celé jméno
{{ $json.user?.firstName }} {{ $json.user?.lastName }}

// Email nebo fallback
{{ $json.user?.email || 'Nepřihlášen' }}

// Je admin?
{{ $json.user?.role === 'admin' }}

// Je premium?
{{ $json.user?.role === 'premium' }}
```

---

## ✅ Best Practices

1. **Vždy používejte optional chaining** (`?.`) pro přístup k user datům
2. **Poskytněte fallback hodnoty** pro anonymní uživatele
3. **Logujte user aktivity** pro analytics
4. **Personalizujte odpovědi** podle jména a role
5. **Respektujte rate limity** podle typu uživatele
6. **Ukládejte preference** pro lepší UX
7. **Validujte formát** user ID a emailu

---

**Poznámka:** Všechny příklady jsou připravené k použití v N8N workflow. Stačí je zkopírovat do Code nebo jiných příslušných nodů.
