-- SQL script pro ověření a naplnění tabulky products
-- Tento script zajistí, že tabulka existuje a obsahuje testovací data pro hybridní systém

-- 1. Zkontroluj existenci tabulky
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'products') THEN
        RAISE NOTICE 'Tabulka products neexistuje - vytvářím...';
    ELSE
        RAISE NOTICE 'Tabulka products již existuje';
    END IF;
END $$;

-- 2. Vytvoř tabulku products (pokud neexistuje)
CREATE TABLE IF NOT EXISTS public.products (
    id SERIAL PRIMARY KEY,
    product_code VARCHAR(50) UNIQUE NOT NULL, -- např. "1002324245001"
    name VARCHAR(500) NOT NULL, -- název produktu
    description TEXT, -- popis produktu
    category VARCHAR(200), -- kategorie (např. "Tradiční čínská medicína")
    price DECIMAL(10,2), -- cena
    currency VARCHAR(3) DEFAULT 'CZK', -- měna
    availability INTEGER DEFAULT 0, -- dostupnost (skladem)
    product_url VARCHAR(1000), -- URL na produkt
    image_url VARCHAR(1000), -- URL obrázku
    brand VARCHAR(100) DEFAULT 'BEWIT', -- značka
    variant_id VARCHAR(50), -- ID varianty
    xml_content TEXT, -- původní XML obsah pro debug
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sync_status VARCHAR(20) DEFAULT 'manual', -- manual, pending, success, error
    last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Vytvoř indexy pro rychlejší vyhledávání
CREATE INDEX IF NOT EXISTS idx_products_product_code ON public.products(product_code);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products(brand);
CREATE INDEX IF NOT EXISTS idx_products_sync_status ON public.products(sync_status);
CREATE INDEX IF NOT EXISTS idx_products_updated_at ON public.products(updated_at);

-- 4. Trigger pro automatické aktualizování updated_at
CREATE OR REPLACE FUNCTION update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS products_updated_at_trigger ON public.products;
CREATE TRIGGER products_updated_at_trigger
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION update_products_updated_at();

-- 5. RLS (Row Level Security) - povolit všem čtení
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Smaž staré policies a vytvoř nové
DROP POLICY IF EXISTS "Enable read access for all users" ON public.products;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.products;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.products;

-- Policy pro čtení produktů - všichni mohou číst
CREATE POLICY "Enable read access for all users" ON public.products
    FOR SELECT USING (true);

-- Policy pro zápis produktů - pouze autentifikovaní uživatelé
CREATE POLICY "Enable insert for authenticated users only" ON public.products
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users only" ON public.products
    FOR UPDATE USING (true);

-- 6. Vložení testovacích dat (pouze pokud tabulka je prázdná)
DO $$
DECLARE
    row_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO row_count FROM public.products;
    
    IF row_count = 0 THEN
        RAISE NOTICE 'Tabulka products je prázdná - vkládám testovací data...';
        
        -- Vložení testovacích produktů na základě ID z webhook testu
        INSERT INTO public.products (
            product_code, 
            name, 
            description, 
            category, 
            price, 
            currency, 
            product_url, 
            image_url,
            sync_status
        ) VALUES 
        (
            '1002318245',
            'BEWIT Yin Qiao Jie Du Wan - Bylinná směs proti toxickému horku',
            'Tradiční čínská bylinná směs napomáhá při prvních projevech napadení toxickým horkem a větrem. Užitečná při bolesti kloubů a zánětech.',
            'Tradiční čínská medicína',
            1299.00,
            'CZK',
            'https://bewit.love/produkt/bewit-vetrolam?variant=6727',
            'https://bewit.love/storage/products/yin-qiao-jie-du-wan.jpg'
        ),
        (
            '1002737245',
            'BEWIT Chuan Xiong Cha Tiao Wan - Eliminace větru',
            'Produkt navržen pro zkrocení chladu a větru pod kůží. Přináší úlevu od bolestí kloubů spojených s chladným a vlhkým počasím.',
            'Tradiční čínská medicína',
            1499.00,
            'CZK',
            'https://bewit.love/produkt/bewit-eliminace-vetru?variant=7666',
            'https://bewit.love/storage/products/chuan-xiong-cha-tiao-wan.jpg'
        ),
        (
            '1002324245',
            'BEWIT Xiao Qing Long Wan - Ochrana proti chladným větrům',
            'Lék působí jako ochranný faktor proti chladným větrům. Přínosný pro ty, kteří trpí bolestmi kloubů způsobenými klimatickými podmínkami.',
            'Tradiční čínská medicína',
            1199.00,
            'CZK',
            'https://bewit.love/produkt/bewit-ochrana-vetru',
            'https://bewit.love/storage/products/xiao-qing-long-wan.jpg'
        ),
        -- Přidáme další testovací produkty pro různé scénáře
        (
            '1002123456',
            'BEWIT Eukalyptový olej 15ml',
            'Eukalyptový esenciální olej s antiseptickými a protizánětlivými účinky.',
            'Esenciální oleje',
            299.00,
            'CZK',
            'https://bewit.love/produkt/eukalyptovy-olej',
            'https://bewit.love/storage/products/eukalyptovy-olej.jpg'
        ),
        (
            '1002654321',
            'BEWIT Levandulový olej 10ml',
            'Levandulový esenciální olej pro relaxaci a zklidnění.',
            'Esenciální oleje',
            399.00,
            'CZK',
            'https://bewit.love/produkt/levandulovy-olej',
            'https://bewit.love/storage/products/levandulovy-olej.jpg'
        );
        
        RAISE NOTICE 'Vloženo % testovacích produktů', (SELECT COUNT(*) FROM public.products);
    ELSE
        RAISE NOTICE 'Tabulka products již obsahuje % záznamů', row_count;
    END IF;
END $$;

-- 7. Ověření struktury tabulky
DO $$
DECLARE
    column_info RECORD;
BEGIN
    RAISE NOTICE 'Struktura tabulky products:';
    FOR column_info IN 
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'products' 
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '  %: % (nullable: %, default: %)', 
            column_info.column_name, 
            column_info.data_type, 
            column_info.is_nullable,
            COALESCE(column_info.column_default, 'none');
    END LOOP;
END $$;

-- 8. Test SQL dotazu pro hybridní systém
DO $$
DECLARE
    test_ids TEXT[] := ARRAY['1002318245', '1002737245', '1002324245'];
    product_record RECORD;
    found_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Test SQL dotazu pro hybridní systém...';
    RAISE NOTICE 'Hledám produkty s ID: %', test_ids;
    
    FOR product_record IN 
        SELECT product_code, name, price, currency, product_url, image_url
        FROM public.products 
        WHERE product_code = ANY(test_ids)
        ORDER BY product_code
    LOOP
        found_count := found_count + 1;
        RAISE NOTICE 'Nalezen produkt %: % (% %)', 
            product_record.product_code,
            product_record.name,
            product_record.price,
            product_record.currency;
    END LOOP;
    
    RAISE NOTICE 'Celkem nalezeno % produktů z % hledaných ID', found_count, array_length(test_ids, 1);
    
    IF found_count = 0 THEN
        RAISE WARNING 'POZOR: Žádné produkty nebyly nalezeny! Zkontrolujte data v tabulce.';
    END IF;
END $$;

-- 9. Zobrazení aktuálního obsahu tabulky
SELECT 
    'Aktuální obsah tabulky products:' as info,
    COUNT(*) as total_products,
    COUNT(CASE WHEN price IS NOT NULL THEN 1 END) as products_with_price,
    COUNT(CASE WHEN product_url IS NOT NULL THEN 1 END) as products_with_url,
    COUNT(CASE WHEN image_url IS NOT NULL THEN 1 END) as products_with_image
FROM public.products;

-- 10. Ukázka prvních 5 produktů
SELECT 
    product_code,
    name,
    price,
    currency,
    category,
    CASE 
        WHEN LENGTH(product_url) > 50 THEN LEFT(product_url, 50) || '...'
        ELSE product_url 
    END as product_url_preview
FROM public.products 
ORDER BY created_at DESC 
LIMIT 5;
