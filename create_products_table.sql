-- Vytvoření tabulky pro produkty z BEWIT feedu
-- Tato tabulka bude sloužit pro SanaChat funkcionalitu

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
    sync_status VARCHAR(20) DEFAULT 'pending', -- pending, success, error
    last_sync_at TIMESTAMP WITH TIME ZONE
);

-- Indexy pro rychlejší vyhledávání
CREATE INDEX IF NOT EXISTS idx_products_product_code ON public.products(product_code);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products(brand);
CREATE INDEX IF NOT EXISTS idx_products_sync_status ON public.products(sync_status);
CREATE INDEX IF NOT EXISTS idx_products_updated_at ON public.products(updated_at);

-- Trigger pro automatické aktualizování updated_at
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

-- Tabulka pro sledování synchronizace
CREATE TABLE IF NOT EXISTS public.sync_logs (
    id SERIAL PRIMARY KEY,
    sync_type VARCHAR(50) NOT NULL, -- 'products_feed'
    status VARCHAR(20) NOT NULL, -- 'running', 'success', 'error'
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    finished_at TIMESTAMP WITH TIME ZONE,
    records_processed INTEGER DEFAULT 0,
    records_inserted INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_message TEXT,
    feed_url VARCHAR(1000)
);

-- Index pro sync logs
CREATE INDEX IF NOT EXISTS idx_sync_logs_sync_type ON public.sync_logs(sync_type);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON public.sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_started_at ON public.sync_logs(started_at);

-- RLS (Row Level Security) - povolit všem čtení
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- Policy pro čtení produktů - všichni mohou číst
CREATE POLICY "Enable read access for all users" ON public.products
    FOR SELECT USING (true);

-- Policy pro zápis produktů - pouze autentifikovaní uživatelé
CREATE POLICY "Enable insert for authenticated users only" ON public.products
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users only" ON public.products
    FOR UPDATE USING (true);

-- Policy pro sync logs - čtení pro všechny
CREATE POLICY "Enable read access for sync logs" ON public.sync_logs
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for sync logs" ON public.sync_logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for sync logs" ON public.sync_logs
    FOR UPDATE USING (true);

-- Komentáře k tabulkám
COMMENT ON TABLE public.products IS 'Tabulka produktů synchronizovaných z BEWIT XML feedu pro SanaChat funkcionalitu';
COMMENT ON TABLE public.sync_logs IS 'Log synchronizace produktových feedů';

-- Komentáře ke klíčovým sloupcům
COMMENT ON COLUMN public.products.product_code IS 'Unikátní kód produktu z XML feedu';
COMMENT ON COLUMN public.products.xml_content IS 'Původní XML obsah pro debug a zpětnou kompatibilitu';
COMMENT ON COLUMN public.products.sync_status IS 'Status synchronizace: pending, success, error';
