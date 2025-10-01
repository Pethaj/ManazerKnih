# 🛠️ Řešení problému s carousel - chybí cena, název, obrázek, odkaz

## 🔍 Diagnóza problému

Produkty se zobrazují v carouselu, ale **chybí jim informace z Supabase**:
- ❌ Cena se nezobrazuje
- ❌ Název se nezobrazuje  
- ❌ Obrázek se nezobrazuje
- ❌ Odkaz nefunguje

**Příčina:** Tabulka `products` v Supabase buď **neexistuje**, nebo **neobsahuje data** pro ID produktů z webhooku.

## 🚀 Řešení krok za krokem

### KROK 1: Diagnostika problému

**Otevřete:** `direct-supabase-test.html` v prohlížeči

1. **Klikněte na "Test Hybridních ID"**
2. **Podívejte se na výsledek:**
   - ✅ **Pokud najde produkty** → Jděte na KROK 3
   - ❌ **Pokud nenajde produkty** → Pokračujte KROKEM 2

### KROK 2: Vytvoření a naplnění tabulky

**Varianta A: Přes Supabase Dashboard (DOPORUČENO)**

1. Přejděte na [Supabase Dashboard](https://supabase.com/dashboard)
2. Otevřete váš projekt
3. Klikněte na **SQL Editor** (levé menu)
4. **Vytvořte nový dotaz**
5. **Zkopírujte a spusťte** obsah souboru `verify_and_populate_products_table.sql`
6. Klikněte **RUN**

**Varianta B: Přes testovací rozhraní**

1. V `direct-supabase-test.html`
2. Klikněte na **"Inicializovat Tabulku"**
3. Pokud selže → použijte Variantu A

### KROK 3: Ověření dat

**Spusťte test v `direct-supabase-test.html`:**

1. **"Test Hybridních ID"** - měl by najít 3 produkty
2. **"Spustit Diagnostiku"** - kompletní přehled

**Očekávaný výsledek:**
```
✅ SUPABASE DOTAZ ÚSPĚŠNÝ!
Hledaná ID: 1002318245, 1002737245, 1002324245
Nalezeno produktů: 3

1. PRODUKT:
   Product Code: 1002318245
   Název: BEWIT Yin Qiao Jie Du Wan - Bylinná směs proti toxickému horku
   Cena: 1299 CZK
   URL: Má URL
   Obrázek: Má obrázek
```

### KROK 4: Test v aplikaci

1. **Otevřete aplikaci** (SanaChat)
2. **Zapněte pouze "produktová doporučení"** (vypněte databázi knih)
3. **Zadejte dotaz:** "Doporuč mi něco na bolesti kloubů"
4. **Otevřete Browser Console** (F12 → Console)
5. **Sledujte logy** - měli byste vidět:

```
🚀 SPOUŠTÍM HYBRIDNÍ VYHLEDÁVÁNÍ PRODUKTŮ
📡 KROK 1: Získávám doporučení z webhooku...
✅ Webhook vrátil 3 doporučení
🗄️ KROK 2: Vyhledávám produkty v Supabase...
✅ Supabase vrátil 3 produktů
🔗 KROK 3: Kombinuji webhook a Supabase data...
✅ HYBRIDNÍ VYHLEDÁVÁNÍ ÚSPĚŠNĚ DOKONČENO!
```

## 🔧 Troubleshooting

### Problém: "Tabulka products neexistuje"

**Řešení:**
```sql
-- Spusťte v Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS public.products (
    id SERIAL PRIMARY KEY,
    product_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    category VARCHAR(200),
    price DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'CZK',
    product_url VARCHAR(1000),
    image_url VARCHAR(1000),
    -- další sloupce viz verify_and_populate_products_table.sql
);
```

### Problém: "Tabulka je prázdná"

**Řešení:**
```sql
-- Vložte testovací data:
INSERT INTO public.products (product_code, name, price, currency, product_url, image_url) VALUES 
('1002318245', 'BEWIT Test Produkt 1', 1299.00, 'CZK', 'https://bewit.love/produkt/test1', 'https://bewit.love/image1.jpg'),
('1002737245', 'BEWIT Test Produkt 2', 1499.00, 'CZK', 'https://bewit.love/produkt/test2', 'https://bewit.love/image2.jpg'),
('1002324245', 'BEWIT Test Produkt 3', 1199.00, 'CZK', 'https://bewit.love/produkt/test3', 'https://bewit.love/image3.jpg');
```

### Problém: "Permission denied" / RLS

**Řešení:**
```sql
-- Nastavte správné Row Level Security policies:
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.products
    FOR SELECT USING (true);
```

### Problém: "Failed to fetch"

**Možné příčiny:**
1. **CORS blokování** - zkuste jiný prohlížeč
2. **Špatné Supabase credentials** - zkontrolujte URL a klíče
3. **Síťový problém** - zkontrolujte internetové připojení

## 📊 SQL dotazy pro manuální testování

**Test existence tabulky:**
```sql
SELECT COUNT(*) FROM public.products;
```

**Test konkrétních ID:**
```sql
SELECT product_code, name, price, currency, product_url, image_url 
FROM public.products 
WHERE product_code IN ('1002318245', '1002737245', '1002324245');
```

**Přidání nových produktů:**
```sql
INSERT INTO public.products (product_code, name, price, currency, product_url, image_url) 
VALUES ('NEW_ID', 'Nový produkt', 999.00, 'CZK', 'https://example.com', 'https://example.com/image.jpg');
```

## ✅ Očekávaný výsledek

Po dokončení všech kroků by měl carousel zobrazovat:

🖼️ **Obrázky produktů** (z `image_url`)  
💰 **Ceny produktů** (z `price` + `currency`)  
📝 **Názvy produktů** (z `name`)  
🔗 **Funkční odkazy** (z `product_url`)  
📋 **AI doporučení** (z webhooku)

## 🆘 Pokud nic nefunguje

1. **Zkontrolujte Supabase Dashboard** → Tables → Ověřte existenci tabulky `products`
2. **Zkontrolujte Browser Console** → Hledejte error zprávy
3. **Spusťte `test_products_sql.sql`** v Supabase SQL Editor
4. **Kontaktujte podporu** s výstupem z diagnostiky

---

**💡 Tip:** Všechny diagnostické nástroje najdete v souborech:
- `direct-supabase-test.html` - Interaktivní testování
- `verify_and_populate_products_table.sql` - Kompletní setup
- `test_products_sql.sql` - SQL diagnostika
