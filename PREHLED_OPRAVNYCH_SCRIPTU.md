# Přehled opravných scriptů pro Chatbot Settings

## 📁 Vytvořené soubory

### 🎯 Hlavní dokumentace
| Soubor | Účel | Pro koho |
|--------|------|----------|
| `OPRAVA_CHATBOT_ULOZENI.md` | **Rychlý návod** - 4 kroky k řešení | ⭐ Začněte zde! |
| `CHATBOT_SETTINGS_TROUBLESHOOTING.md` | Detailní troubleshooting a diagnostika | Pro pokročilé |
| `PREHLED_OPRAVNYCH_SCRIPTU.md` | Tento soubor - přehled všech nástrojů | Reference |

### 🔧 SQL Scripty

#### ⭐ Doporučený script
| Soubor | Popis | Kdy použít |
|--------|-------|-----------|
| **`fix_all_chatbot_issues.sql`** | **Kompletní oprava všeho najednou** | Vždy jako první! |

Tento script:
- ✅ Vytvoří tabulku pokud neexistuje
- ✅ Vytvoří chybějící chatboty
- ✅ Opraví RLS politiky
- ✅ Vytvoří indexy a triggery
- ✅ Ověří výsledek

#### 🎯 Specifické scripty
| Soubor | Popis | Kdy použít |
|--------|-------|-----------|
| `check_chatbot_settings.sql` | Diagnostika stavu databáze | Zjistit co je špatně |
| `fix_chatbot_settings.sql` | Vytvoří chybějící chatboty | Chyba: "Chatbot nebyl nalezen" |
| `fix_rls_policies.sql` | Opraví RLS politiky | Chyba: "UPDATE selhal - oprávnění" |
| `create_chatbot_settings_table.sql` | Kompletní inicializace (původní) | První setup |

### 🔨 Upravený kód

| Soubor | Změny |
|--------|-------|
| `src/services/chatbotSettingsService.ts` | • Kontrola existence před UPDATE<br>• Detailní logování<br>• Lepší error handling<br>• Diagnostika RLS problémů |
| `src/components/ChatbotManagement.tsx` | • Potvrzovací zprávy<br>• Informativní error messages<br>• Návod jak opravit v UI<br>• Alert notifikace |

---

## 🚀 Rychlý start

### Pro 99% případů (doporučeno):
```sql
-- 1. Otevřete Supabase SQL Editor
-- 2. Spusťte tento jediný script:
fix_all_chatbot_issues.sql
-- 3. Obnovte aplikaci a zkuste uložit
```

### Pokud chcete postupovat krok po kroku:
```sql
-- 1. Nejprve diagnostika:
check_chatbot_settings.sql

-- 2. Pak podle výsledku spusťte:
fix_chatbot_settings.sql  -- pokud chybí chatboti
fix_rls_policies.sql      -- pokud problém s oprávněními
```

---

## 🔍 Jak poznat problém podle chybové zprávy

| Chybová zpráva | Problém | Řešení |
|---------------|---------|--------|
| "Chatbot s ID 'xxx' nebyl nalezen v databázi" | Chybí záznam | `fix_chatbot_settings.sql` |
| "UPDATE selhal - pravděpodobně nemáte oprávnění" | RLS problém | `fix_rls_policies.sql` |
| "PGRST116: The result contains 0 rows" | Buď chybí záznam NEBO RLS | `fix_all_chatbot_issues.sql` |
| "✅ Chatbot existuje" ale UPDATE selhává | Určitě RLS problém | `fix_rls_policies.sql` |

---

## 📊 Diagnostika v konzoli prohlížeče

Po úpravách kódu vidíte v Developer Console (F12) tyto logové zprávy:

### ✅ Úspěšný průběh:
```
🔍 Aktualizuji chatbota s ID: "sana_chat"
✅ Chatbot existuje, provádím UPDATE
✅ UPDATE proběhl úspěšně, vráceno řádků: 1
💾 Ukládám nastavení pro chatbota sana_chat
✅ Nastavení úspěšně uloženo
```

### ❌ Chybějící záznam:
```
🔍 Aktualizuji chatbota s ID: "sana_chat"
❌ Chatbot s ID "sana_chat" nebyl nalezen v databázi
```
→ Spusťte `fix_chatbot_settings.sql`

### ❌ RLS problém:
```
🔍 Aktualizuji chatbota s ID: "sana_chat"
✅ Chatbot existuje, provádím UPDATE
❌ UPDATE nevrátil žádný řádek - pravděpodobně problém s RLS
```
→ Spusťte `fix_rls_policies.sql`

---

## 🎓 Vysvětlení problémů

### Co je PGRST116?
- Supabase PostgREST error kód
- Znamená: "Očekával jsem 1 řádek, dostal jsem 0"
- Nastává když UPDATE/SELECT nenajde žádný řádek

### Co je RLS (Row Level Security)?
- Bezpečnostní systém Supabase
- Kontroluje kdo má přístup k jakým záznamům
- Vyžaduje správné politiky pro SELECT/INSERT/UPDATE/DELETE

### Proč chatbot "existuje" ale UPDATE selhává?
- SELECT politika umožňuje číst (proto "existuje")
- Ale UPDATE politika není nastavena → UPDATE selže
- Řešení: Správné RLS politiky v `fix_rls_policies.sql`

---

## 💡 Tipy

### Tip 1: Vždy kontrolujte přihlášení
RLS politiky vyžadují přihlášeného uživatele!
```javascript
// V konzoli (F12):
const { data: { user } } = await supabase.auth.getUser()
console.log('Přihlášen jako:', user?.email)
```

### Tip 2: Sledujte Network tab
- F12 → Network → filtr "chatbot_settings"
- PATCH požadavek by měl mít header `Authorization: Bearer ...`
- HTTP 200 = úspěch
- HTTP 406 = problém (RLS nebo chybějící záznam)

### Tip 3: Spusťte fix_all_chatbot_issues.sql preventivně
I když vše funguje, tento script zajistí že:
- Máte správnou strukturu tabulky
- Všichni výchozí chatboti existují  
- RLS politiky jsou správně nastavené
- Indexy pro rychlost jsou vytvořené

---

## 📞 Potřebujete pomoc?

1. **Přečtěte si:** `OPRAVA_CHATBOT_ULOZENI.md`
2. **Diagnostika:** Spusťte `check_chatbot_settings.sql`
3. **Quick fix:** Spusťte `fix_all_chatbot_issues.sql`
4. **Stále nefunguje?** Přečtěte `CHATBOT_SETTINGS_TROUBLESHOOTING.md`
5. **Zkontrolujte konzoli:** F12 → Console → hledejte 🔍 ✅ ❌ emoji

---

## ✨ Co bylo vylepšeno

### Před opravou:
- ❌ Kryptická chyba "PGRST116"
- ❌ Žádné návody jak opravit
- ❌ Žádné logování pro diagnostiku
- ❌ Žádné potvrzení po uložení

### Po opravě:
- ✅ Jasné error zprávy
- ✅ Návod jak opravit přímo v UI
- ✅ Detailní logování v konzoli
- ✅ Alert notifikace po úspěchu
- ✅ Automatické SQL scripty
- ✅ Kompletní dokumentace

---

**Poslední aktualizace:** Listopad 2025  
**Verze:** 2.0 (s RLS opravami)

