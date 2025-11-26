# Oprava problému s ukládáním nastavení chatbota

## Rychlá oprava ⚡

Pokud se vám nezobrazuje zpráva "✅ Nastavení úspěšně uloženo" a místo toho vidíte chybu, následujte tyto kroky:

### 1. Otevřete Supabase SQL Editor
1. Přihlaste se do [Supabase Dashboard](https://app.supabase.com)
2. Vyberte váš projekt
3. V levém menu klikněte na **SQL Editor**

### 2. Spusťte opravný script

#### ⭐ DOPORUČENO: Opravit vše najednou
Nejrychlejší řešení - vyřeší všechny problémy:
1. Zkopírujte celý obsah `fix_all_chatbot_issues.sql`
2. Vložte ho do SQL Editoru
3. Klikněte na **RUN**

#### 🎯 NEBO: Cílená oprava podle chyby

**A) Chyba: "Chatbot nebyl nalezen v databázi"**  
→ Spusťte: `fix_chatbot_settings.sql`

**B) Chyba: "UPDATE selhal - pravděpodobně nemáte oprávnění"**  
→ Spusťte: `fix_rls_policies.sql`

**C) Nejste si jistí co je špatně?**  
→ Spusťte diagnostiku: `check_chatbot_settings.sql`

### 3. Ověřte výsledek

Po spuštění `fix_all_chatbot_issues.sql` byste měli vidět:

**Sekce 1: Chatboti v databázi**
```
chatbot_id    | chatbot_name    | is_active
--------------|-----------------|----------
sana_chat     | Sana Chat       | true
product_chat  | Product Chat    | true
test_chat     | Testovací Chat  | true
```

**Sekce 2: RLS Politiky**
```
policyname                              | operace
----------------------------------------|--------
Allow delete for authenticated users    | DELETE
Allow insert for authenticated users    | INSERT
Allow read access to chatbot_settings   | SELECT
Allow update for authenticated users    | UPDATE
```

**Sekce 3: Závěrečná zpráva**
```
✅ HOTOVO! Obnovte aplikaci a zkuste uložit nastavení chatbota.
```

### 4. Obnovte aplikaci
1. Vraťte se do aplikace
2. Obnovte stránku (F5)
3. Otevřete Správu chatbotů
4. Proveďte změnu a klikněte na **Uložit nastavení**
5. Měli byste vidět: ✅ "Nastavení chatbota bylo úspěšně uloženo!"

---

## 🆘 Pokud stále nefunguje

### Nejste přihlášeni?
RLS politiky vyžadují přihlášeného uživatele! Zkontrolujte:
```javascript
// V konzoli prohlížeče (F12):
const { data: { user } } = await supabase.auth.getUser()
console.log('Uživatel:', user)
```
Pokud vidíte `null` → **přihlaste se do aplikace**!

## Co se změnilo?

### Vylepšení v kódu:
1. ✅ Lepší error handling - kontrola existence záznamu před UPDATE
2. ✅ Detailní logování v konzoli pro diagnostiku
3. ✅ Informativní chybové zprávy s návodem jak opravit
4. ✅ Potvrzovací zpráva po úspěšném uložení

### Nové diagnostické nástroje:
- `check_chatbot_settings.sql` - Kontrola stavu databáze
- `fix_chatbot_settings.sql` - Automatická oprava chybějících záznamů
- `CHATBOT_SETTINGS_TROUBLESHOOTING.md` - Detailní průvodce řešením problémů

## Časté problémy a jejich řešení

### ❌ "Chatbot nebyl nalezen v databázi"
**Příčina:** Záznam pro chatbota neexistuje v tabulce  
**Řešení:** Spusťte `fix_chatbot_settings.sql`

### ❌ "UPDATE selhal - pravděpodobně nemáte oprávnění"
**Příčina:** RLS (Row Level Security) politiky blokují UPDATE operace  
**Řešení:** Spusťte `fix_rls_policies.sql`

### ❌ "PGRST116: The result contains 0 rows"
**Možné příčiny:**
1. Záznam neexistuje → spusťte `fix_chatbot_settings.sql`
2. RLS blokuje přístup → spusťte `fix_rls_policies.sql`

### ❌ V konzoli vidím "✅ Chatbot existuje" ale UPDATE selhává
**Příčina:** Máte oprávnění číst, ale ne zapisovat (RLS problém)  
**Řešení:** Spusťte `fix_rls_policies.sql`

### ⚠️ Změny se ukládají, ale neprojeví se v chatu
**Řešení:** Přihlaste se znovu do aplikace (session refresh)

### ℹ️ Tlačítko "Uložit nastavení" se nezobrazuje
**Vysvětlení:** Je to normální - zobrazí se pouze když provedete změnu

## Potřebujete pomoc?

Více informací najdete v:
- `CHATBOT_SETTINGS_TROUBLESHOOTING.md` - Detailní troubleshooting
- Konzole prohlížeče (F12) - Sledujte logy pro diagnostiku

