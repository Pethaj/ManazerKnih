-- SQL script pro vytvoření tabulek pro metadata (štítky, kategorie, jazyky, typy publikací)
-- Spusťte tento script v Supabase SQL editoru

-- 1. Tabulka pro štítky
CREATE TABLE IF NOT EXISTS public.labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabulka pro kategorie
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabulka pro jazyky
CREATE TABLE IF NOT EXISTS public.languages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    code TEXT, -- ISO kód jazyka (cs, en, de, atd.)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabulka pro typy publikací
CREATE TABLE IF NOT EXISTS public.publication_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Vložení defaultních dat

-- Defaultní kategorie
INSERT INTO public.categories (name) VALUES 
    ('Aromaterapie'),
    ('Masáže'),
    ('Akupunktura'),
    ('Diagnostika')
ON CONFLICT (name) DO NOTHING;

-- Defaultní typy publikací
INSERT INTO public.publication_types (name, description) VALUES 
    ('public', 'Veřejně dostupné publikace'),
    ('students', 'Publikace pro studenty'),
    ('internal_bewit', 'Interní materiály Bewit')
ON CONFLICT (name) DO NOTHING;

-- Kompletní seznam světových jazyků s ISO kódy
INSERT INTO public.languages (name, code) VALUES 
    ('arabština', 'ar'),
    ('bengálština', 'bn'),
    ('bulharština', 'bg'),
    ('čeština', 'cs'),
    ('čínština', 'zh'),
    ('dánština', 'da'),
    ('holandština', 'nl'),
    ('angličtina', 'en'),
    ('estonština', 'et'),
    ('finština', 'fi'),
    ('francouzština', 'fr'),
    ('němčina', 'de'),
    ('řečtina', 'el'),
    ('hebrejština', 'he'),
    ('hindština', 'hi'),
    ('maďarština', 'hu'),
    ('islandština', 'is'),
    ('indonéština', 'id'),
    ('italština', 'it'),
    ('japonština', 'ja'),
    ('korejština', 'ko'),
    ('lotyština', 'lv'),
    ('litevština', 'lt'),
    ('norština', 'no'),
    ('polština', 'pl'),
    ('portugalština', 'pt'),
    ('rumunština', 'ro'),
    ('ruština', 'ru'),
    ('slovenština', 'sk'),
    ('slovinština', 'sl'),
    ('španělština', 'es'),
    ('švédština', 'sv'),
    ('thajština', 'th'),
    ('turečtina', 'tr'),
    ('ukrajinština', 'uk'),
    ('vietnamština', 'vi'),
    ('albánština', 'sq'),
    ('arménština', 'hy'),
    ('ázerbájdžánština', 'az'),
    ('baskičtina', 'eu'),
    ('běloruština', 'be'),
    ('bosenština', 'bs'),
    ('bretonština', 'br'),
    ('katalánština', 'ca'),
    ('chorvatština', 'hr'),
    ('irština', 'ga'),
    ('galicijština', 'gl'),
    ('gruzínština', 'ka'),
    ('hindština', 'hi'),
    ('kazaština', 'kk'),
    ('kyrgyzština', 'ky'),
    ('latinčina', 'la'),
    ('lucemburština', 'lb'),
    ('makedonština', 'mk'),
    ('maltština', 'mt'),
    ('moldavština', 'mo'),
    ('mongolština', 'mn'),
    ('nepálština', 'ne'),
    ('perština', 'fa'),
    ('sardínština', 'sc'),
    ('srbština', 'sr'),
    ('tádžičtina', 'tg'),
    ('tatarština', 'tt'),
    ('uzbečtina', 'uz'),
    ('velština', 'cy'),
    ('jidiš', 'yi')
ON CONFLICT (name) DO NOTHING;

-- 6. Vytvoření indexů pro lepší výkon
CREATE INDEX IF NOT EXISTS idx_labels_name ON public.labels(name);
CREATE INDEX IF NOT EXISTS idx_categories_name ON public.categories(name);
CREATE INDEX IF NOT EXISTS idx_languages_name ON public.languages(name);
CREATE INDEX IF NOT EXISTS idx_languages_code ON public.languages(code);
CREATE INDEX IF NOT EXISTS idx_publication_types_name ON public.publication_types(name);

-- 7. RLS (Row Level Security) - nastavte podle vašich potřeb
-- Pro začátek povolíme všem operace (přizpůsobte podle vašich security požadavků)

ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publication_types ENABLE ROW LEVEL SECURITY;

-- Povolení všech operací pro anonymní uživatele (přizpůsobte podle potřeby)
CREATE POLICY "Allow all operations on labels" ON public.labels FOR ALL USING (true);
CREATE POLICY "Allow all operations on categories" ON public.categories FOR ALL USING (true);
CREATE POLICY "Allow all operations on languages" ON public.languages FOR ALL USING (true);
CREATE POLICY "Allow all operations on publication_types" ON public.publication_types FOR ALL USING (true);

-- 8. Trigger pro automatické aktualizování updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_labels_updated_at BEFORE UPDATE ON public.labels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_languages_updated_at BEFORE UPDATE ON public.languages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_publication_types_updated_at BEFORE UPDATE ON public.publication_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
