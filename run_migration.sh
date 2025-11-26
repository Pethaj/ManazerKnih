#!/bin/bash

# Script pro spuštění SQL migrace
# Přidá sloupec product_button_recommendations do chatbot_settings

echo "🚀 Spouštím migraci: add_product_button_recommendations.sql"
echo ""

# Zkontroluj, zda existuje soubor
if [ ! -f "add_product_button_recommendations.sql" ]; then
    echo "❌ Chyba: Soubor add_product_button_recommendations.sql nenalezen!"
    exit 1
fi

echo "📋 Obsah migrace:"
echo "- Přidání sloupce product_button_recommendations"
echo "- Nastavení výchozí hodnoty false"
echo "- Aktualizace existujících záznamů"
echo ""

# Připojení k Supabase
# POZOR: Nahraď těmito údaji své skutečné connection string
SUPABASE_HOST="db.modopafybeslbcqjxsve.supabase.co"
SUPABASE_DB="postgres"
SUPABASE_USER="postgres"

echo "🔗 Připojuji se k Supabase..."
echo "Host: $SUPABASE_HOST"
echo ""

# Spusť migraci
psql -h "$SUPABASE_HOST" -U "$SUPABASE_USER" -d "$SUPABASE_DB" < add_product_button_recommendations.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migrace úspěšně provedena!"
    echo ""
    echo "📝 Co dál:"
    echo "1. Refresh stránky v prohlížeči"
    echo "2. Zkus znovu uložit nastavení chatbota"
    echo ""
else
    echo ""
    echo "❌ Chyba při provádění migrace!"
    echo ""
    echo "💡 Tip: Použij raději Supabase SQL Editor"
    echo "   1. Otevři https://supabase.com/dashboard"
    echo "   2. Vyber projekt"
    echo "   3. SQL Editor"
    echo "   4. Zkopíruj obsah add_product_button_recommendations.sql"
    echo "   5. Spusť (Run)"
    echo ""
    exit 1
fi

