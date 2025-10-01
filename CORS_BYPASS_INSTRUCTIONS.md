# 🔧 CORS Bypass pro vývoj GroupDocs Conversion

## ⚠️ VAROVÁNÍ
Tato řešení jsou POUZE pro vývoj a testování. V produkci VŽDY použijte backend proxy!

## Možnost 1: Chrome s vypnutým CORS (Nejjednodušší)

### Windows:
```bash
chrome.exe --user-data-dir="C:/chrome-dev-session" --disable-web-security --disable-features=VizDisplayCompositor
```

### macOS:
```bash
open -n -a /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --args --user-data-dir="/tmp/chrome_dev_test" --disable-web-security
```

### Linux:
```bash
google-chrome --user-data-dir="/tmp/chrome_dev_test" --disable-web-security
```

## Možnost 2: CORS Proxy služba

Použijte veřejný CORS proxy (pouze pro testování):

```typescript
// V groupdocsConversionService.ts změňte:
static readonly API_BASE_URL = 'https://cors-anywhere.herokuapp.com/https://api.groupdocs.cloud/v2.0';
```

**Poznámka:** cors-anywhere má omezení a není vhodný pro produkci.

## Možnost 3: Browser Extension

Nainstalujte CORS rozšíření pro Chrome:
- "CORS Unblock" nebo "Disable CORS"
- Zapněte pouze při testování API

## Možnost 4: Firefox Developer Edition

Firefox má méně striktní CORS policy pro localhost:
1. Otevřete `about:config`
2. Nastavte `security.fileuri.strict_origin_policy = false`
3. Restart prohlížeče

## 🚀 Doporučené řešení pro produkci

Vytvořte backend endpoint:

```javascript
// Node.js Express server
app.post('/api/groupdocs/convert', async (req, res) => {
  try {
    // Upload file to GroupDocs
    const uploadResponse = await fetch('https://api.groupdocs.cloud/v2.0/storage/file/' + fileName, {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': file.mimetype
      },
      body: file.buffer
    });

    // Convert file
    const convertResponse = await fetch('https://api.groupdocs.cloud/v2.0/conversion', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        FilePath: fileName,
        Format: 'pdf'
      })
    });

    // Download and return converted file
    const convertedFile = await fetch(downloadUrl, {
      headers: { 'Authorization': 'Bearer ' + token }
    });

    res.setHeader('Content-Type', 'application/pdf');
    convertedFile.body.pipe(res);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## 📝 Poznámky

1. **Bezpečnost**: API klíče by nikdy neměly být v frontend kódu
2. **Rate limiting**: GroupDocs má limity na počet požadavků
3. **Velikost souborů**: Velké soubory mohou způsobit timeout
4. **Error handling**: Implementujte proper retry logiku

## 🔄 Aktuální implementace

Pro okamžité testování použijte Chrome s vypnutým CORS:

```bash
# macOS - otevřete nový terminál a spusťte:
open -n -a /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --args --user-data-dir="/tmp/chrome_dev_test" --disable-web-security
```

Pak otevřete aplikaci v tomto Chrome okně.
