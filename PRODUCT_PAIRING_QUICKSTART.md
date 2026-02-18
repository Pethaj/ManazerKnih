# 🚀 Quick Start - Párování kombinací produktů

## Krok 1: Spusť migraci databáze

### Přes Supabase Dashboard (doporučeno)
1. Otevři [Supabase Dashboard](https://supabase.com/dashboard)
2. Vyber projekt → SQL Editor
3. Zkopíruj obsah souboru `supabase/migrations/20260218_product_pairing_leceni.sql`
4. Vlož do editoru a klikni **RUN**

✅ Migrace vytvoří:
- Tabulku `leceni`
- SQL funkci `match_product_combinations`
- Přidá sloupec `enable_product_pairing` do `chatbot_settings`
- Příkladové data (ID 1)

## Krok 2: Ověř product_code

⚠️ **DŮLEŽITÉ:** Příkladová data používají placeholder kódy. Musíš je nahradit skutečnými kódy z databáze.

### Najdi správné kódy
```sql
-- Esenciální oleje
SELECT product_code, product_name 
FROM product_feed_2 
WHERE product_name ILIKE '%nohepa%' 
   OR product_name ILIKE '%best friend%'
   OR product_name ILIKE '%nopa%';

-- Prawtein
SELECT product_code, product_name 
FROM product_feed_2 
WHERE product_name ILIKE '%frankincense%'
  AND category = 'Prawtein';

-- TČM
SELECT product_code, product_name 
FROM product_feed_2 
WHERE product_name ILIKE '%004%'
   OR product_name ILIKE '%eliminace větru%';
```

### Aktualizuj data
```sql
UPDATE leceni 
SET 
  eo_1 = 'SKUTECNY_KOD_NOHEPA',
  eo_2 = 'SKUTECNY_KOD_BESTFRIEND',
  eo_3 = 'SKUTECNY_KOD_NOPA',
  prawtein = 'SKUTECNY_KOD_FRANKINCENSE',
  tcm_wan = 'SKUTECNY_KOD_004'
WHERE id = 1;
```

## Krok 3: Aktivuj v Admin UI

1. Otevři aplikaci
2. Naviguj: **Správa chatbotů** → Vyber chatbot → **Upravit**
3. Sekce **"Produktový funnel"**
4. Zaškrtni: ✅ **"🔗 Párování kombinací produktů"**
5. Klikni **Uložit**

## Krok 4: Testuj

### Test 1: SQL funkce
```sql
SELECT * FROM match_product_combinations(
  ARRAY['SKUTECNY_KOD_NOHEPA']::TEXT[]
);
```

**Očekávaný výsledek:**
- 2 řádky (Prawtein + TČM)
- `aloe_recommended = true`
- `merkaba_recommended = false`

### Test 2: V chatbotu
1. Otevři chatbot
2. Zadej dotaz, který vrátí NOHEPA produkt
3. Zkontroluj "Související produkty BEWIT":
   - ✅ Původní produkt (NOHEPA)
   - ✅ Napárovaný Prawtein
   - ✅ Napárovaný TČM
   - ✅ Indikátor: 💧 Aloe doporučeno

## Hotovo! 🎉

Nyní můžeš přidávat další kombinace:

```sql
INSERT INTO leceni (
  nazev, 
  eo_1, eo_2, eo_3,
  prawtein, tcm_wan,
  aloe, merkaba,
  poznamka
) VALUES (
  'Název kombinace',
  'EO_CODE_1', 'EO_CODE_2', 'EO_CODE_3',
  'PRAWTEIN_CODE', 'TCM_CODE',
  true, false,
  'Poznámka'
);
```

## Řešení problémů

**Nepáruje se?**
→ Zkontroluj, že product_code v `leceni` odpovídají kódům v `product_feed_2`

**Nezobrazují se indikátory?**
→ Zkontroluj console log: mělo by být `💧 Aloe doporučeno: true`

**SQL chyba?**
→ Zkontroluj, že migrace proběhla úspěšně: `SELECT * FROM leceni;`

---

📖 **Kompletní dokumentace:** `PRODUCT_PAIRING_IMPLEMENTATION.md`
