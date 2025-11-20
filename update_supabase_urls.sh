#!/bin/bash

# 🔧 Skript pro aktualizaci Supabase URL konfigurace
# Tento skript aktualizuje Site URL a Redirect URLs v Supabase projektu

# DŮLEŽITÉ: Nastavte tyto proměnné
PROJECT_REF="modopafybeslbcqjxsve"
SUPABASE_ACCESS_TOKEN="your-access-token-here"  # Získejte z https://supabase.com/dashboard/account/tokens

# URL konfigurace
SITE_URL="http://localhost:5173"  # Změňte pro produkci
REDIRECT_URLS='["http://localhost:5173/**", "http://localhost:5173/reset-password"]'

echo "🔧 Aktualizuji URL konfiguraci pro projekt: $PROJECT_REF"
echo "📍 Site URL: $SITE_URL"
echo "🔀 Redirect URLs: $REDIRECT_URLS"

# Kontrola tokenu
if [ "$SUPABASE_ACCESS_TOKEN" = "your-access-token-here" ]; then
    echo ""
    echo "❌ CHYBA: Musíte nastavit SUPABASE_ACCESS_TOKEN"
    echo ""
    echo "Jak získat token:"
    echo "1. Jděte na https://supabase.com/dashboard/account/tokens"
    echo "2. Vytvořte nový token"
    echo "3. Nastavte ho v tomto skriptu"
    echo ""
    exit 1
fi

# Aktualizace konfigurace
echo ""
echo "📡 Odesílám požadavek..."

response=$(curl -s -w "\n%{http_code}" -X PATCH \
  "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"SITE_URL\": \"$SITE_URL\",
    \"URI_ALLOW_LIST\": \"$REDIRECT_URLS\"
  }")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
    echo "✅ Konfigurace úspěšně aktualizována!"
    echo ""
    echo "📋 Odpověď:"
    echo "$body" | jq '.'
else
    echo "❌ Chyba při aktualizaci (HTTP $http_code)"
    echo ""
    echo "📋 Odpověď:"
    echo "$body" | jq '.'
    exit 1
fi

echo ""
echo "✨ Hotovo! Nyní můžete testovat reset hesla."
echo ""
echo "📝 Další kroky:"
echo "1. Zkontrolujte email template v Dashboard"
echo "2. Otestujte reset hesla flow"
echo "3. Zkontrolujte Console (F12) pro případné chyby"


