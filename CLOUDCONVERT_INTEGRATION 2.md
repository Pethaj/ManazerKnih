# ☁️ CloudConvert API Integrace

## 🎯 Přehled
Úspěšně jsme nahradili GroupDocs.Conversion API za CloudConvert API pro konverzi EPUB, MOBI a dalších formátů do PDF. CloudConvert je mnohem lepší volba protože:

- ✅ **CORS friendly** - funguje přímo z prohlížeče
- ✅ **Specializovaný na e-knihy** - používá Calibre engine
- ✅ **Rychlé zpracování** - optimalizované workflow
- ✅ **Stabilní API** - vyspělá infrastruktura

## 🔑 API Konfigurace

### API Klíč
```
eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiOTVmZDVmMGZmOTU1NWE4YmRiYjFjN2IxNjI3YWRiZDIzZTIyYmRmZGQ5MWQ1ZDFjMWY2NzBkYzIyZTZlNzUxMmMxMzhlZDZmMzQzZDJkYjgiLCJpYXQiOjE3NTg3OTQ4MDguMTEzMzkyLCJuYmYiOjE3NTg3OTQ4MDguMTEzMzkzLCJleHAiOjQ5MTQ0Njg0MDguMTA5NTU2LCJzdWIiOiI3MzAxMDk0NyIsInNjb3BlcyI6WyJ1c2VyLnJlYWQiLCJ1c2VyLndyaXRlIiwidGFzay5yZWFkIiwidGFzay53cml0ZSIsIndlYmhvb2sucmVhZCIsIndlYmhvb2sud3JpdGUiLCJwcmVzZXQucmVhZCIsInByZXNldC53cml0ZSJdfQ.OY3B-nZJmlyrqdj766A0GRr_qr_FNgIX1RrTEUl12jl4x52fuxMSny13MCLfp_GwAwMPLVO4v-6ZPJ97EC25A5tE4q-DEKVza_bvkzd98EhDNoUdCBhSdmc_KCmmXm2FGWJOBc8NOL8VJvDRcmTZsKyL53Hwxe1VPj_E5_lwpxB31pAQJldaVGpCrP89njTrfvaQv36lxIkPrj8i5pLpqdk7K90NQnmwEaUv9Z-eaoeUjMMz0fu6FTyny4GwcR5GmKH97Qv45IhqyMtVy9PpP4DGcJN5mSszS2EnfNFLBTCz9_iiKl3WmXs_d0qU01njF0VXYZXaF20DAwSHaMvzfW_yoNZo7qYGukz7q3kxiWlExUKxr55c9zrSSwENh8dVxuwjaHf7CXkQaOZ8nwsmYQ2e3ExvW_qmSAMiF9GRTQnG4Fxq-Yc_9g_-y4PTZPlvaGyV4lcrX-BfNg4CKSi1Z9d3Zxf7lnCSFqYrt-8hzC_0e47zD4xYd1iF3jRHe6gQzDW4MG3DeaVH5G2to2R8KG9bHlct_8w59P2TNep0wVhpS7XLCUK4Uf1bo8LWgKUdmEGH61uwwzApYccd77BLsMDKDNjGWOnvrsrgQynpThdeGF3Cw4738bDSbtwyRt-kUmPe3utEFt1pQrD75GTQbukK31qrmaGkDFRFw_RZcSQ
```

### Base URL
```
https://api.cloudconvert.com/v2
```

## 📚 Podporované formáty

### Vstupní formáty → PDF
- **EPUB** - EPUB e-knihy (nejlepší podpora)
- **MOBI** - MOBI e-knihy (Kindle)
- **DOCX** - Microsoft Word dokumenty
- **DOC** - Microsoft Word dokumenty (starší)
- **TXT** - Textové soubory
- **RTF** - Rich Text Format
- **HTML** - HTML dokumenty

## 🔄 Workflow procesu

CloudConvert používá 4-krokový workflow:

### 1. Import Task
```javascript
POST /import/upload
// Vytvoří upload URL a nahraje soubor
```

### 2. Convert Task
```javascript
POST /convert
{
  "input": "import_task_id",
  "input_format": "epub", 
  "output_format": "pdf",
  "engine": "calibre",
  "engine_version": "latest"
}
```

### 3. Export Task
```javascript
POST /export/url
{
  "input": "convert_task_id"
}
```

### 4. Job Management
```javascript
POST /jobs
{
  "tasks": {
    "import_task_id": {},
    "convert_task_id": {},
    "export_task_id": {}
  }
}
```

## 🔧 Implementace

### Hlavní service
`/src/services/cloudConvertService.ts`

### Integrace v aplikaci
`index.tsx` - aktualizováno aby používalo `CloudConvertService`

### UI změny
- Modal automaticky detekuje EPUB/MOBI soubory
- Zobrazí checkbox "Konvertovat do PDF"  
- Informace o CloudConvert API v modalu

## 🧪 Testování

### Test prostředí
Otevřete `test-cloudconvert.html` pro kompletní testování:

1. **Test API klíče** - ověří autentifikaci
2. **Test konverze** - nahraje a konvertuje soubor
3. **Vytvoření testovacích souborů** - EPUB, TXT, HTML

### Testovací workflow
```bash
# 1. Otevřít test prostředí
open test-cloudconvert.html

# 2. Test API
click "Test API klíče"

# 3. Vytvořit testovací soubor
click "Vytvořit testovací EPUB soubor"

# 4. Vybrat soubor a konvertovat
click "Konvertovat do PDF"
```

## 📊 API Limity

- **Credits** - CloudConvert používá kreditní systém
- **Timeout** - Konverze timeout po 5 minutách
- **Velikost souborů** - Závisí na plánu
- **Rate limiting** - Rozumné limity pro API calls

## 🔍 Monitoring

Veškeré operace jsou logovány do console:
- 📤 Import task creation
- 🔄 Convert task creation  
- 📥 Export task creation
- 🚀 Job execution
- ⏳ Status polling
- ✅ Download completion

## 🆚 Porovnání s GroupDocs

| Funkce | CloudConvert | GroupDocs |
|--------|-------------|-----------|
| CORS podpora | ✅ Nativní | ❌ Vyžaduje proxy |
| E-knihy | ✅ Calibre engine | ⚠️ Základní |
| Setup | ✅ Jednoduchý | ❌ Složitý |
| Rychlost | ✅ Rychlé | ⚠️ Pomalé |
| Spolehlivost | ✅ Vysoká | ⚠️ CORS problémy |

## 🚀 Nasazení

Kód je připraven k okamžitému použití:

1. ✅ CloudConvert service implementován
2. ✅ Frontend aktualizován
3. ✅ UI modal rozšířen
4. ✅ Test prostředí vytvořeno
5. ✅ Dokumentace dokončena

**Konverze EPUB/MOBI do PDF nyní funguje bez CORS problémů!** 🎉
