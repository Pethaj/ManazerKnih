-- SQL test script pro ověření funkcionaliy produktových dotazů
-- Simuluje přesně to, co dělá hybridní systém

-- Test 1: Základní existence tabulky
SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'products') 
        THEN '✅ Tabulka products existuje'
        ELSE '❌ Tabulka products NEEXISTUJE!'
    END as table_check;

-- Test 2: Počet záznamů v tabulce
SELECT 
    COUNT(*) as total_records,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Tabulka obsahuje data'
        ELSE '❌ Tabulka je PRÁZDNÁ!'
    END as data_check
FROM public.products;

-- Test 3: Test konkrétních ID z webhook testu
WITH test_ids AS (
    SELECT unnest(ARRAY['1002318245', '1002737245', '1002324245']) as test_id
),
found_products AS (
    SELECT 
        t.test_id,
        p.product_code,
        p.name,
        p.price,
        p.currency,
        p.product_url,
        p.image_url,
        CASE WHEN p.product_code IS NOT NULL THEN '✅ Nalezen' ELSE '❌ Nenalezen' END as status
    FROM test_ids t
    LEFT JOIN public.products p ON p.product_code = t.test_id
)
SELECT 
    test_id as "Hledané ID",
    status as "Status",
    COALESCE(name, 'N/A') as "Název produktu",
    COALESCE(price::text, 'N/A') as "Cena",
    COALESCE(currency, 'N/A') as "Měna",
    CASE 
        WHEN product_url IS NOT NULL THEN '✅ Má URL'
        ELSE '❌ Chybí URL'
    END as "URL Status",
    CASE 
        WHEN image_url IS NOT NULL THEN '✅ Má obrázek'
        ELSE '❌ Chybí obrázek'
    END as "Image Status"
FROM found_products
ORDER BY test_id;

-- Test 4: Simulace přesného dotazu z hybridProductService
-- Toto je přesně to, co dělá Supabase dotaz
SELECT 
    'Simulace Supabase dotazu:' as info,
    COUNT(*) as found_count
FROM public.products 
WHERE product_code IN ('1002318245', '1002737245', '1002324245');

-- Test 5: Detailní výsledky pro každé ID
SELECT 
    product_code as "Product Code",
    name as "Název",
    description as "Popis", 
    category as "Kategorie",
    price as "Cena",
    currency as "Měna",
    product_url as "URL produktu",
    image_url as "URL obrázku",
    brand as "Značka",
    created_at as "Vytvořeno"
FROM public.products 
WHERE product_code IN ('1002318245', '1002737245', '1002324245')
ORDER BY product_code;

-- Test 6: Kontrola kompletnosti dat
SELECT 
    product_code,
    CASE WHEN name IS NOT NULL AND name != '' THEN '✅' ELSE '❌' END as has_name,
    CASE WHEN price IS NOT NULL THEN '✅' ELSE '❌' END as has_price,
    CASE WHEN currency IS NOT NULL AND currency != '' THEN '✅' ELSE '❌' END as has_currency,
    CASE WHEN product_url IS NOT NULL AND product_url != '' THEN '✅' ELSE '❌' END as has_url,
    CASE WHEN image_url IS NOT NULL AND image_url != '' THEN '✅' ELSE '❌' END as has_image,
    CASE WHEN category IS NOT NULL AND category != '' THEN '✅' ELSE '❌' END as has_category
FROM public.products 
WHERE product_code IN ('1002318245', '1002737245', '1002324245')
ORDER BY product_code;

-- Test 7: Vyhodnocení kvality dat
WITH data_quality AS (
    SELECT 
        product_code,
        (CASE WHEN name IS NOT NULL AND name != '' THEN 1 ELSE 0 END +
         CASE WHEN price IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN currency IS NOT NULL AND currency != '' THEN 1 ELSE 0 END +
         CASE WHEN product_url IS NOT NULL AND product_url != '' THEN 1 ELSE 0 END +
         CASE WHEN image_url IS NOT NULL AND image_url != '' THEN 1 ELSE 0 END +
         CASE WHEN category IS NOT NULL AND category != '' THEN 1 ELSE 0 END) as completeness_score
    FROM public.products 
    WHERE product_code IN ('1002318245', '1002737245', '1002324245')
)
SELECT 
    product_code as "Product Code",
    completeness_score as "Kompletnost (0-6)",
    CASE 
        WHEN completeness_score = 6 THEN '🟢 Perfektní'
        WHEN completeness_score >= 4 THEN '🟡 Dobrá'
        WHEN completeness_score >= 2 THEN '🟠 Částečná'
        ELSE '🔴 Nedostačující'
    END as "Hodnocení kvality"
FROM data_quality
ORDER BY completeness_score DESC, product_code;

-- Test 8: Problematické záznamy
SELECT 
    'Problematické záznamy (chybí důležité informace):' as warning
WHERE EXISTS (
    SELECT 1 FROM public.products 
    WHERE product_code IN ('1002318245', '1002737245', '1002324245')
    AND (name IS NULL OR name = '' OR price IS NULL OR product_url IS NULL OR product_url = '')
);

SELECT 
    product_code,
    CASE WHEN name IS NULL OR name = '' THEN 'Chybí název' END as missing_name,
    CASE WHEN price IS NULL THEN 'Chybí cena' END as missing_price,
    CASE WHEN product_url IS NULL OR product_url = '' THEN 'Chybí URL' END as missing_url,
    CASE WHEN image_url IS NULL OR image_url = '' THEN 'Chybí obrázek' END as missing_image
FROM public.products 
WHERE product_code IN ('1002318245', '1002737245', '1002324245')
AND (name IS NULL OR name = '' OR price IS NULL OR product_url IS NULL OR product_url = '' OR image_url IS NULL OR image_url = '');

-- Test 9: Doporučení pro opravu
SELECT 
    'DOPORUČENÍ PRO OPRAVU:' as recommendation,
    CASE 
        WHEN NOT EXISTS (SELECT FROM public.products WHERE product_code IN ('1002318245', '1002737245', '1002324245')) THEN
            'Spusťte verify_and_populate_products_table.sql pro vložení testovacích dat'
        WHEN EXISTS (SELECT FROM public.products WHERE product_code IN ('1002318245', '1002737245', '1002324245') AND (name IS NULL OR price IS NULL)) THEN
            'Doplňte chybějící data (názvy, ceny) do existujících záznamů'
        ELSE
            'Data vypadají kompletně - problém může být v aplikační logice'
    END as action_needed;
