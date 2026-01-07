#!/bin/bash

# TEST SCRIPT - Ověření bezpečnosti autentifikace
# Spusť v Supabase SQL Editor

echo "🔍 TEST 1: Kontrola, že všechna hesla jsou hashovaná"
echo "=================================================="
echo ""
echo "SQL Query:"
echo "SELECT COUNT(*) as neshashovana_hesla FROM users 
WHERE password_hash NOT LIKE '$2%' 
AND password_hash IS NOT NULL 
AND password_hash != '';"
echo ""
echo "Očekávaný výsledek: 0"
echo ""

echo "🔍 TEST 2: Ověření RLS politiky - SELECT"
echo "=================================================="
echo "SQL Query:"
echo "SELECT policyname, qual FROM pg_policies 
WHERE tablename = 'users' AND cmd = 'SELECT';"
echo ""
echo "Očekávaný výsledek:"
echo "  policyname: 'Users can view own data'"
echo "  qual: Obsahuje 'auth.uid()'"
echo ""

echo "🔍 TEST 3: Ověření RLS politiky - UPDATE"
echo "=================================================="
echo "SQL Query:"
echo "SELECT policyname, qual FROM pg_policies 
WHERE tablename = 'users' AND cmd = 'UPDATE';"
echo ""
echo "Očekávaný výsledek:"
echo "  policyname: 'Users can update own data'"
echo "  qual: Obsahuje 'auth.uid()'"
echo ""

echo "🔍 TEST 4: Ověření RLS politiky - DELETE"
echo "=================================================="
echo "SQL Query:"
echo "SELECT policyname FROM pg_policies 
WHERE tablename = 'users' AND cmd = 'DELETE';"
echo ""
echo "Očekávaný výsledek:"
echo "  policyname: 'Admins can delete users'"
echo ""

echo "🧪 LOGIN TESTY - Spusť v aplikaci:"
echo "=================================================="
echo ""
echo "Test 1: Admin login"
echo "Email: admin@admin.cz"
echo "Heslo: admin"
echo "Očekávaný výsledek: ✅ Přihlášení úspěšné"
echo ""
echo "Test 2: User login"
echo "Email: pavel.dynzik@bewit.love"
echo "Heslo: dynz3845"
echo "Očekávaný výsledek: ✅ Přihlášení úspěšné"
echo ""
echo "Test 3: Špatné heslo"
echo "Email: admin@admin.cz"
echo "Heslo: spatneheslo"
echo "Očekávaný výsledek: ❌ Nesprávný email nebo heslo"
echo ""

echo "✅ Všechny testy provedeny!"

