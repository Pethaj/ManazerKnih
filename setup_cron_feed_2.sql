-- ================================================================
-- NASTAVENÍ DENNÍHO CRON JOBU PRO PRODUCT FEED 2
-- Automatická synchronizace každý den ve 2:00 ráno
-- ================================================================

-- Poznámka: Tento skript vyžaduje pg_cron extension
-- Pro aktivaci v Supabase: Database > Extensions > pg_cron

-- ================================================================
-- 1. OVĚŘENÍ EXISTENCE pg_cron EXTENSION
-- ================================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    RAISE NOTICE '⚠️ VAROVÁNÍ: pg_cron extension není nainstalována!';
    RAISE NOTICE '📝 Pro aktivaci:';
    RAISE NOTICE '   1. Jděte do Supabase Dashboard';
    RAISE NOTICE '   2. Database > Extensions';
    RAISE NOTICE '   3. Vyhledejte "pg_cron" a povolte ji';
  ELSE
    RAISE NOTICE '✅ pg_cron extension je aktivní';
  END IF;
END $$;

-- ================================================================
-- 2. ODSTRANĚNÍ STARÝCH CRON JOBŮ PRO FEED 2 (POKUD EXISTUJÍ)
-- ================================================================
DO $$ 
DECLARE
  job_record RECORD;
BEGIN
  FOR job_record IN 
    SELECT jobid, jobname 
    FROM cron.job 
    WHERE jobname LIKE '%feed_2%' OR jobname LIKE '%sync-feed-2%'
  LOOP
    PERFORM cron.unschedule(job_record.jobid);
    RAISE NOTICE 'Odstraněn starý cron job: % (ID: %)', job_record.jobname, job_record.jobid;
  END LOOP;
END $$;

-- ================================================================
-- 3. VYTVOŘENÍ NOVÉHO CRON JOBU PRO FEED 2
-- ================================================================

-- Denní synchronizace ve 2:00 ráno (UTC)
SELECT cron.schedule(
  'sync-product-feed-2-daily',           -- Job name
  '0 2 * * *',                          -- Cron expression: každý den ve 2:00
  $$
  SELECT
    net.http_post(
      url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-feed-2',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);

-- ================================================================
-- 4. ALTERNATIVNÍ VARIANTA - POMOCÍ INVOKE (POKUD JE DOSTUPNÉ)
-- ================================================================

/*
-- Tato varianta používá supabase.functions.invoke
SELECT cron.schedule(
  'sync-product-feed-2-daily',
  '0 2 * * *',
  $$
  SELECT invoke_edge_function('sync-feed-2', '{}'::jsonb);
  $$
);
*/

-- ================================================================
-- 5. INSTRUKCE PRO MANUÁLNÍ NASTAVENÍ
-- ================================================================

/*
DŮLEŽITÉ: PŘED SPUŠTĚNÍM TOHOTO SKRIPTU:

1. Nahraďte YOUR_PROJECT_REF skutečným Supabase project ref:
   - Najdete v: Project Settings > API > Project URL
   - Formát: https://abcdefghijklmnop.supabase.co

2. Nahraďte YOUR_ANON_KEY skutečným anon key:
   - Najdete v: Project Settings > API > anon public key
   
3. Nebo použijte service_role_key pro větší oprávnění:
   - Project Settings > API > service_role key (SECRET!)

ALTERNATIVA - NASTAVENÍ PŘES SUPABASE DASHBOARD:

1. Jděte do: Database > Cron Jobs
2. Klikněte na "Create a new cron job"
3. Nastavte:
   - Name: sync-product-feed-2-daily
   - Schedule: 0 2 * * * (každý den ve 2:00 UTC)
   - Command: 
     SELECT
       net.http_post(
         url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-feed-2',
         headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
         body:='{}'::jsonb
       );
4. Klikněte "Save"

TESTOVÁNÍ CRON JOBU:

-- Zobrazit všechny cron joby
SELECT * FROM cron.job ORDER BY jobid DESC;

-- Zobrazit historii běhu
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'sync-product-feed-2-daily')
ORDER BY start_time DESC 
LIMIT 10;

-- Manuální spuštění pro test
SELECT cron.schedule(
  'test-feed-2-sync',
  '* * * * *',  -- Každou minutu (POUZE PRO TEST!)
  $$
  SELECT net.http_post(
    url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-feed-2',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_KEY"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);

-- Po testu nezapomeňte odstranit testovací job:
-- SELECT cron.unschedule('test-feed-2-sync');

TROUBLESHOOTING:

Pokud cron job nefunguje:
1. Zkontrolujte, že Edge Function sync-feed-2 je nasazená
2. Ověřte, že URL a Authorization token jsou správné
3. Zkontrolujte logy: SELECT * FROM cron.job_run_details ORDER BY start_time DESC;
4. Ověřte, že pg_net extension je povolená (pro http_post)
*/

-- ================================================================
-- 6. POVOLENÍ pg_net EXTENSION (POKUD NENÍ)
-- ================================================================
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ================================================================
-- 7. VÝPIS VŠECH CRON JOBŮ
-- ================================================================
DO $$ 
DECLARE
  job_record RECORD;
BEGIN
  RAISE NOTICE '📋 Seznam všech cron jobů:';
  FOR job_record IN 
    SELECT jobid, jobname, schedule, command, active
    FROM cron.job 
    ORDER BY jobid DESC
  LOOP
    RAISE NOTICE '  [%] % - Schedule: % (Active: %)', 
      job_record.jobid, 
      job_record.jobname, 
      job_record.schedule,
      job_record.active;
  END LOOP;
END $$;

-- ================================================================
-- HOTOVO
-- ================================================================
DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Setup cron jobu pro Feed 2 připraven!';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  DŮLEŽITÉ: Před aktivací upravte:';
  RAISE NOTICE '   1. YOUR_PROJECT_REF v cron.schedule příkazu';
  RAISE NOTICE '   2. YOUR_ANON_KEY nebo YOUR_SERVICE_ROLE_KEY';
  RAISE NOTICE '';
  RAISE NOTICE '📖 Viz komentáře výše pro detailní instrukce';
  RAISE NOTICE '';
END $$;





