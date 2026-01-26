# ⚡ Quick Start - Iframe s uživatelskými daty

## 🎯 Co bylo opraveno?

Iframe widget nyní **správně odesílá informace o přihlášeném uživateli** do N8N.

---

## 📦 Payload do N8N

### PŘED (chybějící user data):

```json
{
  "sessionId": "...",
  "action": "sendMessage",
  "chatInput": "...",
  "metadata": { ... }
}
```

### PO (s user daty): ✅

```json
{
  "sessionId": "...",
  "action": "sendMessage",
  "chatInput": "...",
  "metadata": { ... },
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "Jan",
    "lastName": "Novák",
    "role": "user"
  }
}
```

---

## 🧪 Jak testovat?

### 1. Spustit dev server

```bash
npm run dev
```

### 2. Přihlásit se v hlavní aplikaci

```
http://localhost:5173
```

Použijte magický odkaz pro přihlášení.

### 3. Otevřít testovací stránku

```
http://localhost:5173/test-iframe-user-data.html
```

### 4. Zkontrolovat přihlášení

Klikněte na tlačítko **"🔍 Zkontrolovat přihlášení"**

### 5. Otevřít widget a poslat zprávu

Klikněte na **"🚀 Otevřít widget"** a napište zkušební zprávu.

### 6. Zkontrolovat log

V logu by se mělo zobrazit:

```
✅ Payload obsahuje informace o uživateli!
```

---

## 💡 Použití v N8N

### Personalizace

```javascript
const userName = $json.user?.firstName || 'uživateli';
return `Dobrý den ${userName}, ...`;
```

### Filtrování podle uživatele

```sql
WHERE user_id = $json.user.id
```

### Kontrola přítomnosti

```javascript
if ($json.user) {
  // Přihlášený uživatel
} else {
  // Anonymní návštěvník
}
```

---

## 📁 Změněné soubory

- ✅ `src/components/WidgetChat/WidgetChatContainer.tsx`

---

## ✅ Hotovo!

Iframe widget nyní správně sbírá a odesílá informace o uživateli.
