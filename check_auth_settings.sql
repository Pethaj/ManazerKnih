-- 🔍 SQL dotazy pro kontrolu Auth nastavení v Supabase
-- Spusťte v Supabase Dashboard → SQL Editor

-- 1. Zkontrolovat auth konfiguraci
SELECT 
    'Auth Settings' as check_type,
    *
FROM auth.config;

-- 2. Zkontrolovat email rate limits
SELECT 
    'Email Rate Limits' as info,
    COUNT(*) as email_count_last_hour
FROM auth.audit_log_entries
WHERE 
    action = 'user_recovery_requested'
    AND created_at > NOW() - INTERVAL '1 hour';

-- 3. Zkontrolovat poslední recovery requests
SELECT 
    'Recent Recovery Requests' as info,
    id,
    email,
    created_at,
    raw_user_meta_data
FROM auth.users
WHERE 
    recovery_sent_at IS NOT NULL
    AND recovery_sent_at > NOW() - INTERVAL '24 hours'
ORDER BY recovery_sent_at DESC
LIMIT 10;

-- 4. Zkontrolovat audit log pro recovery
SELECT 
    'Recovery Audit Log' as info,
    id,
    payload->>'action' as action,
    payload->>'actor_username' as username,
    created_at,
    ip_address
FROM auth.audit_log_entries
WHERE 
    payload->>'action' IN ('user_recovery_requested', 'user_recovery_verified')
ORDER BY created_at DESC
LIMIT 20;

-- 5. Zkontrolovat failed attempts
SELECT 
    'Failed Recovery Attempts' as info,
    COUNT(*) as failed_count,
    MAX(created_at) as last_failure
FROM auth.audit_log_entries
WHERE 
    payload->>'action' = 'user_recovery_requested'
    AND payload->>'error' IS NOT NULL
    AND created_at > NOW() - INTERVAL '24 hours';

-- POZNÁMKY:
-- - Pokud vidíte mnoho failed attempts, zkontrolujte email template
-- - Pokud recovery_sent_at je NULL, email nebyl odeslán
-- - Zkontrolujte ip_address pro suspicious activity


