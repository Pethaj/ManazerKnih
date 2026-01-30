-- ============================================
-- MESSAGE LIMITS - UŽITEČNÉ SQL DOTAZY
-- ============================================

-- 📊 MONITORING A PŘEHLEDY
-- ============================================

-- 1. Zobraz všechny limity s využitím
SELECT 
  CASE 
    WHEN ml.chatbot_id IS NULL THEN '🌍 GLOBÁLNÍ'
    ELSE '🤖 ' || COALESCE(cs.chatbot_name, ml.chatbot_id)
  END as chatbot,
  ml.daily_limit as "Limit",
  ml.current_count as "Aktuální",
  CASE 
    WHEN ml.daily_limit IS NULL THEN '∞ (neomezeno)'
    ELSE ROUND((ml.current_count::float / ml.daily_limit) * 100, 1) || '%'
  END as "Využití",
  ml.reset_at as "Reset v",
  CASE 
    WHEN ml.daily_limit IS NOT NULL AND ml.current_count >= ml.daily_limit THEN '🔴 LIMIT DOSAŽEN'
    WHEN ml.daily_limit IS NOT NULL AND ml.current_count >= ml.daily_limit * 0.8 THEN '🟡 80%+ využito'
    WHEN ml.daily_limit IS NOT NULL AND ml.current_count >= ml.daily_limit * 0.5 THEN '🟢 50%+ využito'
    ELSE '✅ OK'
  END as "Status"
FROM message_limits ml
LEFT JOIN chatbot_settings cs ON cs.chatbot_id = ml.chatbot_id
ORDER BY ml.chatbot_id NULLS FIRST;

-- 2. Chatboty s nejvyšším využitím
SELECT 
  COALESCE(cs.chatbot_name, ml.chatbot_id) as chatbot,
  ml.current_count as zpravy_dnes,
  ml.daily_limit as limit,
  ROUND((ml.current_count::float / ml.daily_limit) * 100, 1) as procenta
FROM message_limits ml
LEFT JOIN chatbot_settings cs ON cs.chatbot_id = ml.chatbot_id
WHERE ml.daily_limit IS NOT NULL
  AND ml.chatbot_id IS NOT NULL
ORDER BY (ml.current_count::float / ml.daily_limit) DESC
LIMIT 10;

-- 3. Alerting - Chatboty nad 80% limitu
SELECT 
  COALESCE(cs.chatbot_name, ml.chatbot_id) as chatbot,
  ml.current_count,
  ml.daily_limit,
  ROUND((ml.current_count::float / ml.daily_limit) * 100, 1) as procenta,
  ml.reset_at
FROM message_limits ml
LEFT JOIN chatbot_settings cs ON cs.chatbot_id = ml.chatbot_id
WHERE ml.daily_limit IS NOT NULL
  AND ml.chatbot_id IS NOT NULL
  AND ml.current_count > ml.daily_limit * 0.8
ORDER BY (ml.current_count::float / ml.daily_limit) DESC;

-- 4. Statistika globálního limitu
SELECT 
  daily_limit as "Globální limit",
  current_count as "Aktuální počet",
  daily_limit - current_count as "Zbývá",
  CASE 
    WHEN daily_limit IS NULL THEN '∞'
    ELSE ROUND((current_count::float / daily_limit) * 100, 1) || '%'
  END as "Využití",
  reset_at as "Reset v",
  AGE(reset_at, NOW()) as "Zbývá času"
FROM message_limits
WHERE chatbot_id IS NULL;

-- ============================================
-- 🔧 SPRÁVA LIMITŮ
-- ============================================

-- 5. Nastavení globálního limitu
UPDATE message_limits
SET 
  daily_limit = 100000,  -- Změň na požadovanou hodnotu (NULL = bez limitu)
  updated_at = NOW()
WHERE chatbot_id IS NULL;

-- 6. Nastavení limitu pro konkrétní chatbot
INSERT INTO message_limits (chatbot_id, daily_limit, current_count)
VALUES ('tvuj-chatbot-id', 5000, 0)
ON CONFLICT (chatbot_id) 
DO UPDATE SET 
  daily_limit = EXCLUDED.daily_limit,
  updated_at = NOW();

-- 7. Vypnutí limitu pro chatbot (neomezeno)
UPDATE message_limits
SET 
  daily_limit = NULL,
  updated_at = NOW()
WHERE chatbot_id = 'tvuj-chatbot-id';

-- 8. Smazání limitu pro chatbot
DELETE FROM message_limits
WHERE chatbot_id = 'tvuj-chatbot-id';

-- ============================================
-- 🔄 RESET A ÚDRŽBA
-- ============================================

-- 9. Manuální reset všech čítačů
SELECT reset_all_message_limits();

-- 10. Reset konkrétního chatbota
UPDATE message_limits
SET 
  current_count = 0,
  reset_at = (date_trunc('day', timezone('Europe/Prague', NOW())) + INTERVAL '1 day'),
  updated_at = NOW()
WHERE chatbot_id = 'tvuj-chatbot-id';

-- 11. Reset globálního limitu
UPDATE message_limits
SET 
  current_count = 0,
  reset_at = (date_trunc('day', timezone('Europe/Prague', NOW())) + INTERVAL '1 day'),
  updated_at = NOW()
WHERE chatbot_id IS NULL;

-- 12. Manuální inkrementace (pro testování)
SELECT increment_message_count(
  (SELECT id FROM message_limits WHERE chatbot_id = 'tvuj-chatbot-id')
);

-- ============================================
-- 🧪 TESTOVÁNÍ
-- ============================================

-- 13. Vytvoření testovacího limitu
INSERT INTO message_limits (chatbot_id, daily_limit, current_count)
VALUES ('test-chatbot', 10, 0)
ON CONFLICT (chatbot_id) DO NOTHING;

-- 14. Simulace použití (10x inkrementace)
DO $$
DECLARE
  limit_id UUID;
BEGIN
  SELECT id INTO limit_id FROM message_limits WHERE chatbot_id = 'test-chatbot';
  
  FOR i IN 1..10 LOOP
    PERFORM increment_message_count(limit_id);
    RAISE NOTICE 'Increment %: current_count = %', i, (SELECT current_count FROM message_limits WHERE id = limit_id);
  END LOOP;
END $$;

-- 15. Ověření testu
SELECT 
  chatbot_id,
  daily_limit,
  current_count,
  CASE 
    WHEN current_count >= daily_limit THEN '🔴 LIMIT DOSAŽEN'
    ELSE '✅ OK'
  END as status
FROM message_limits
WHERE chatbot_id = 'test-chatbot';

-- 16. Cleanup test dat
DELETE FROM message_limits WHERE chatbot_id = 'test-chatbot';

-- ============================================
-- 📅 CRON JOB MONITORING
-- ============================================

-- 17. Zkontroluj jestli cron job existuje
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  database,
  username
FROM cron.job
WHERE jobname = 'reset-message-limits-daily';

-- 18. Historie běhů cron jobu (posledních 20)
SELECT 
  jobid,
  runid,
  start_time,
  end_time,
  status,
  return_message,
  EXTRACT(EPOCH FROM (end_time - start_time)) as duration_seconds
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'reset-message-limits-daily')
ORDER BY start_time DESC
LIMIT 20;

-- 19. Statistika úspěšnosti cron jobu
SELECT 
  status,
  COUNT(*) as pocet,
  ROUND(COUNT(*)::numeric / (SELECT COUNT(*) FROM cron.job_run_details WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'reset-message-limits-daily')) * 100, 1) as procenta
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'reset-message-limits-daily')
GROUP BY status;

-- 20. Poslední běh cron jobu
SELECT 
  start_time as "Začátek",
  end_time as "Konec",
  status as "Status",
  return_message as "Zpráva",
  EXTRACT(EPOCH FROM (end_time - start_time)) as "Trvání (s)"
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'reset-message-limits-daily')
ORDER BY start_time DESC
LIMIT 1;

-- ============================================
-- 🔍 DEBUGGING A TROUBLESHOOTING
-- ============================================

-- 21. Najdi chatboty bez nastavených limitů
SELECT 
  cs.chatbot_id,
  cs.chatbot_name,
  ml.id as limit_record_id
FROM chatbot_settings cs
LEFT JOIN message_limits ml ON ml.chatbot_id = cs.chatbot_id
WHERE ml.id IS NULL;

-- 22. Najdi limity bez chatbotů (sirotci)
SELECT 
  ml.chatbot_id,
  ml.daily_limit,
  ml.current_count
FROM message_limits ml
LEFT JOIN chatbot_settings cs ON cs.chatbot_id = ml.chatbot_id
WHERE ml.chatbot_id IS NOT NULL
  AND cs.id IS NULL;

-- 23. Zkontroluj konzistenci dat
SELECT 
  COUNT(*) as total_limits,
  COUNT(CASE WHEN chatbot_id IS NULL THEN 1 END) as global_limits,
  COUNT(CASE WHEN chatbot_id IS NOT NULL THEN 1 END) as chatbot_limits,
  COUNT(CASE WHEN daily_limit IS NULL THEN 1 END) as unlimited,
  COUNT(CASE WHEN current_count >= daily_limit THEN 1 END) as exceeded
FROM message_limits;

-- 24. Zobraz všechny záznamy (raw data)
SELECT * FROM message_limits
ORDER BY chatbot_id NULLS FIRST, created_at DESC;

-- 25. Audit log (poslední změny)
SELECT 
  chatbot_id,
  daily_limit,
  current_count,
  created_at,
  updated_at,
  AGE(NOW(), updated_at) as "Čas od poslední změny"
FROM message_limits
ORDER BY updated_at DESC;

-- ============================================
-- 📈 REPORTY
-- ============================================

-- 26. Denní report využití
SELECT 
  DATE(updated_at) as datum,
  COUNT(*) as pocet_chatbotu,
  SUM(current_count) as celkem_zprav,
  AVG(current_count) as prumer_zprav,
  MAX(current_count) as max_zprav
FROM message_limits
WHERE chatbot_id IS NOT NULL
GROUP BY DATE(updated_at)
ORDER BY datum DESC
LIMIT 7;

-- 27. Top 10 nejaktivnějších chatbotů (dnes)
SELECT 
  COALESCE(cs.chatbot_name, ml.chatbot_id) as chatbot,
  ml.current_count as zpravy_dnes,
  ml.daily_limit as limit,
  CASE 
    WHEN ml.daily_limit IS NOT NULL 
    THEN ROUND((ml.current_count::float / ml.daily_limit) * 100, 1)
    ELSE NULL
  END as procenta_vyuziti
FROM message_limits ml
LEFT JOIN chatbot_settings cs ON cs.chatbot_id = ml.chatbot_id
WHERE ml.chatbot_id IS NOT NULL
ORDER BY ml.current_count DESC
LIMIT 10;

-- ============================================
-- 🛠️ UTILITY FUNKCE
-- ============================================

-- 28. Bulk nastavení limitů pro všechny chatboty
DO $$
DECLARE
  bot RECORD;
BEGIN
  FOR bot IN SELECT chatbot_id FROM chatbot_settings
  LOOP
    INSERT INTO message_limits (chatbot_id, daily_limit, current_count)
    VALUES (bot.chatbot_id, 5000, 0)  -- Defaultní limit 5000
    ON CONFLICT (chatbot_id) DO NOTHING;
  END LOOP;
END $$;

-- 29. Smazání všech limitů (kromě globálního)
DELETE FROM message_limits WHERE chatbot_id IS NOT NULL;

-- 30. Reset všeho (POZOR - smaže vše!)
TRUNCATE message_limits CASCADE;
-- Po truncate znovu vlož globální limit:
INSERT INTO message_limits (chatbot_id, daily_limit, current_count)
VALUES (NULL, NULL, 0);

-- ============================================
-- 💡 UŽITEČNÉ POHLEDY (VIEW)
-- ============================================

-- 31. Vytvoř view pro snadnější monitoring
CREATE OR REPLACE VIEW v_message_limits_dashboard AS
SELECT 
  ml.id,
  CASE 
    WHEN ml.chatbot_id IS NULL THEN '🌍 GLOBÁLNÍ'
    ELSE '🤖 ' || COALESCE(cs.chatbot_name, ml.chatbot_id)
  END as chatbot_display,
  ml.chatbot_id,
  ml.daily_limit,
  ml.current_count,
  CASE 
    WHEN ml.daily_limit IS NULL THEN NULL
    ELSE ROUND((ml.current_count::float / ml.daily_limit) * 100, 1)
  END as usage_percentage,
  CASE 
    WHEN ml.daily_limit IS NOT NULL AND ml.current_count >= ml.daily_limit THEN 'EXCEEDED'
    WHEN ml.daily_limit IS NOT NULL AND ml.current_count >= ml.daily_limit * 0.8 THEN 'WARNING'
    WHEN ml.daily_limit IS NOT NULL AND ml.current_count >= ml.daily_limit * 0.5 THEN 'MODERATE'
    WHEN ml.daily_limit IS NULL THEN 'UNLIMITED'
    ELSE 'OK'
  END as status,
  ml.reset_at,
  AGE(ml.reset_at, NOW()) as time_until_reset,
  ml.updated_at
FROM message_limits ml
LEFT JOIN chatbot_settings cs ON cs.chatbot_id = ml.chatbot_id;

-- Použití view:
-- SELECT * FROM v_message_limits_dashboard ORDER BY chatbot_id NULLS FIRST;

-- ============================================
-- 📝 POZNÁMKY
-- ============================================

/*
Časté operace:

1. Nastavit globální limit na 100k:
   UPDATE message_limits SET daily_limit = 100000 WHERE chatbot_id IS NULL;

2. Nastavit limit pro chatbot:
   INSERT INTO message_limits (chatbot_id, daily_limit) 
   VALUES ('bot-id', 5000) ON CONFLICT (chatbot_id) DO UPDATE SET daily_limit = EXCLUDED.daily_limit;

3. Reset všech limitů:
   SELECT reset_all_message_limits();

4. Monitoring dashboard:
   SELECT * FROM v_message_limits_dashboard;

5. Alerting (chatboty nad 80%):
   SELECT * FROM v_message_limits_dashboard WHERE status = 'WARNING' OR status = 'EXCEEDED';
*/
