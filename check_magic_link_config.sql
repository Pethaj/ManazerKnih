-- Kontrola konfigurace Magic Link v Supabase
-- Spusťte tento SQL v Supabase SQL Editor pro diagnostiku

-- 1. Zkontrolovat auth config nastavení
SELECT 
    name,
    value
FROM auth.config
WHERE name IN (
    'SITE_URL',
    'REDIRECT_URLS',
    'MAILER_AUTOCONFIRM',
    'DISABLE_SIGNUP'
)
ORDER BY name;

-- Očekávané hodnoty:
-- SITE_URL: http://localhost:3000 (nebo vaše produkční URL)
-- REDIRECT_URLS: mělo by obsahovat http://localhost:3000
-- MAILER_AUTOCONFIRM: false (posílat confirmation emaily)
-- DISABLE_SIGNUP: true (zakázat volnou registraci)

-- 2. Zkontrolovat uživatele a jejich email_confirmed_at
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at,
    last_sign_in_at,
    confirmation_sent_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- email_confirmed_at by mělo být vyplněno u všech uživatelů
-- Pokud je NULL, uživatel ještě nepotvrdil email

-- 3. Zkontrolovat aktivní session tokeny
SELECT 
    u.email,
    s.id as session_id,
    s.created_at,
    s.not_after as expires_at,
    CASE 
        WHEN s.not_after > NOW() THEN '✅ Platná'
        ELSE '❌ Expirovaná'
    END as status
FROM auth.sessions s
JOIN auth.users u ON s.user_id = u.id
WHERE s.not_after > NOW() - INTERVAL '7 days'
ORDER BY s.created_at DESC
LIMIT 10;

-- 4. Zkontrolovat user_profiles
SELECT 
    up.id,
    up.email,
    up.role,
    u.email_confirmed_at,
    CASE 
        WHEN u.email_confirmed_at IS NULL THEN '⚠️ Email nepotvrzený'
        ELSE '✅ Email potvrzený'
    END as email_status
FROM user_profiles up
LEFT JOIN auth.users u ON up.id = u.id
ORDER BY up.created_at DESC;

-- Všichni uživatelé by měli mít email_confirmed_at vyplněný

-- 5. Zkontrolovat auth flow events (poslední magic link requesty)
SELECT 
    created_at,
    factor_id,
    ip_address,
    user_agent
FROM auth.flow_state
WHERE created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC
LIMIT 10;

-- Pokud nevidíte žádné záznamy, magic link requesty se nelogují
-- nebo nebyly odeslány v posledním dni

-- 6. OPRAVA: Potvrdit všechny uživatele (pokud jsou nepotvrzení)
-- POZOR: Spusťte pouze pokud víte, že všichni uživatelé jsou validní!
/*
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;
*/

-- 7. OPRAVA: Znovu odeslat confirmation email konkrétnímu uživateli
-- (Bohužel toto není možné přes SQL - musí se udělat přes API nebo Dashboard)

-- Poznámky:
-- - Magic link používá OTP (One-Time Password) systém
-- - Token je platný typicky 1 hodinu
-- - Po použití tokenu se automaticky vytvoří session
-- - Session je platná typicky 7 dní (refresh token 30 dní)

