# 🤖 Průvodce správou chatbotů v MedBase

## Přehled

Systém správy chatbotů v MedBase umožňuje centralizovanou konfiguraci a správu různých AI asistentů a jejich funkcí. Všechny chatboty sdílejí společné funkce, které lze individuálně zapínat/vypínat nebo synchronizovat mezi všemi chatboty.

## Jak otevřít správu chatbotů

1. V hlavní aplikaci MedBase klikněte na tlačítko **"🤖 Správa chatbotů"** v horní liště
2. Otevře se modální okno se správou všech chatbotů

## Dostupné chatboty

### 1. Sana MedBase
- **Popis:** AI asistent pro správu a vyhledávání v knihovně lékařské literatury
- **Umístění:** Integrovaný přímo v MedBase aplikaci
- **Výchozí funkce:** Filtrace obsahu (zapnuto)

### 2. Sana Kancelář  
- **Popis:** AI asistent pro kancelářské prostředí a webové stránky
- **Umístění:** https://bewit.love/sana-chat
- **Výchozí funkce:** Produktový feed (zapnuto)

## Dostupné funkce

### 🔍 Filtrace obsahu
- **Účel:** Filtrování podle kategorií, štítků a typů publikací
- **Použití:** Umožňuje chatbotům přesnější odpovědi na základě vybraných kritérií
- **Konfigurace:** Bez dodatečného nastavení

### 🛒 Produktový feed
- **Účel:** Synchronizace a správa produktových feedů z bewit.love
- **Použití:** Umožňuje chatbotům poskytovat informace o produktech BEWIT
- **Konfigurace:** Pokročilé nastavení synchronizace, sledování logů

## Ovládání funkcí

### Individuální ovládání
1. **Rozbalení nastavení:** Klikněte na ⚙️ u konkrétního chatbota
2. **Zapnutí/vypnutí:** Použijte přepínač 🔘/⚪ u konkrétní funkce
3. **Konfigurace:** Klikněte na ⚙️ u funkce s dostupnou konfigurací
4. **Synchronizace:** Klikněte na 🔄 pro aplikování současného nastavení na všechny chatboty

### Globální ovládání
V sekci "Globální nastavení" můžete:
- **Zapnout všude:** Aktivuje funkci u všech chatbotů najednou
- **Vypnout všude:** Deaktivuje funkci u všech chatbotů najednou
- **Sledovat status:** Vidět u kolika chatbotů je funkce aktivní

## Správa produktového feedu

### Přístup ke konfiguraci
1. Rozbalte nastavení u jakéhokoli chatbota
2. U funkce "Produktový feed" klikněte na ⚙️
3. Otevře se pokročilá konfigurace

### Dostupné akce
- **🔄 Spustit synchronizaci:** Manuální synchronizace produktů z bewit.love
- **📋 Zobrazit feed:** Otevření původního XML feedu
- **📊 Statistiky:** Počet produktů v databázi, poslední synchronizace
- **📈 Logy:** Historie synchronizací s detaily úspěšnosti

### Automatická synchronizace
- **Frekvence:** Jednou denně (doporučeno v 6:00 ráno)
- **Nastavení:** Postupujte podle návodu v `setup_automatic_sync.md`
- **Monitoring:** Sledování úspěšnosti přes sync logs

## Databázové tabulky

### Produkty (`products`)
- **Účel:** Úložiště synchronizovaných produktů z BEWIT feedu
- **Struktura:** Kód produktu, název, cena, kategorie, URL obrázku, atd.
- **Vytvoření:** Spusťte SQL skript `create_products_table.sql`

### Sync logy (`sync_logs`)
- **Účel:** Sledování historie synchronizací
- **Informace:** Čas, status, počet zpracovaných záznamů, chyby

## Nejčastější úkoly

### Přidání nové funkce
1. Definujte funkci v `availableFunctions` v `ChatbotManagement.tsx`
2. Přidejte ikonu a popis
3. Implementujte komponentu pro konfiguraci (pokud potřeba)
4. Funkce se automaticky zobrazí u všech chatbotů

### Synchronizace nastavení
1. Nastavte funkci u jednoho chatbota podle potřeby
2. Klikněte na 🔄 u dané funkce
3. Nastavení se aplikuje na všechny ostatní chatboty

### Řešení problémů se synchronizací
1. Zkontrolujte sync logy v konfiguraci produktového feedu
2. Ověřte dostupnost XML feedu na bewit.love
3. Zkuste manuální synchronizaci
4. Zkontrolujte chybové zprávy v konzoli

## Bezpečnost a oprávnění

- **Přístup:** Správa chatbotů je dostupná všem uživatelům MedBase
- **Synchronizace:** Používá veřejný ANON klíč pro čtení
- **Automatizace:** Pro produkční automatickou synchronizace doporučujeme service role klíč

## Budoucí rozšíření

Systém je navržen pro snadné přidávání nových funkcí:
- **Integrované platby**
- **Email notifikace**
- **Kalendářové funkce**
- **CRM integrace**
- **Analytics a reporting**

## Technické poznámky

- **Framework:** React + TypeScript
- **Databáze:** Supabase (PostgreSQL)
- **Synchronizace:** XML parsing s CORS proxy
- **Styling:** Inline styles pro jednoduchost
- **State management:** Local React state

## Kontakt a podpora

Pro technické problémy nebo požadavky na nové funkce kontaktujte vývojový tým nebo vytvořte issue v projektu.

---

*Posledně aktualizováno: Září 2025*
