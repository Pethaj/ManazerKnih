#!/bin/bash

# =====================================================
# Deploy opravy HTML entit pro Feed 2
# =====================================================

set -e  # Exit on error

echo "🚀 Začínám deployment opravy Feed 2..."
echo ""

# Barvy pro výstup
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# =====================================================
# KROK 1: Deploy Edge Function
# =====================================================

echo "📦 KROK 1/3: Deploying Edge Function sync-feed-2..."
echo ""

if npx supabase functions deploy sync-feed-2; then
    echo ""
    echo -e "${GREEN}✅ Edge Function úspěšně nasazena${NC}"
    echo ""
else
    echo ""
    echo -e "${RED}❌ Chyba při nasazování Edge Function${NC}"
    exit 1
fi

# =====================================================
# KROK 2: Vyčištění dat
# =====================================================

echo "🧹 KROK 2/3: Čištění starých dat..."
echo ""
echo -e "${YELLOW}⚠️  Tento krok vymaže všechna stávající data z product_feed_2 a související embeddings${NC}"
echo ""
read -p "Pokračovat? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Mazání embeddings pro feed_2..."
    npx supabase db execute "DELETE FROM product_embeddings WHERE feed_source = 'feed_2';" 2>/dev/null || echo "Poznámka: Tabulka product_embeddings možná neexistuje"
    
    echo "Mazání produktů z feed_2..."
    npx supabase db execute "DELETE FROM product_feed_2;" 2>/dev/null || echo "Poznámka: Tabulka product_feed_2 možná neexistuje"
    
    echo ""
    echo -e "${GREEN}✅ Data vyčištěna${NC}"
    echo ""
else
    echo ""
    echo -e "${YELLOW}⏭️  Přeskakuji čištění dat${NC}"
    echo ""
fi

# =====================================================
# KROK 3: Spuštění synchronizace
# =====================================================

echo "🔄 KROK 3/3: Spouštění synchronizace..."
echo ""

# Zde byste potřebovali SUPABASE_URL a ANON_KEY
# Můžete je načíst z .env nebo je zadat ručně

if [ -f .env ]; then
    source .env
fi

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
    echo -e "${YELLOW}⚠️  SUPABASE_URL nebo SUPABASE_ANON_KEY nejsou nastaveny${NC}"
    echo ""
    echo "Pro manuální spuštění synchronizace použijte:"
    echo ""
    echo "curl -X POST \"https://YOUR_PROJECT.supabase.co/functions/v1/sync-feed-2\" \\"
    echo "  -H \"Authorization: Bearer YOUR_ANON_KEY\" \\"
    echo "  -H \"Content-Type: application/json\""
    echo ""
    echo -e "${YELLOW}Nebo počkejte na automatický cron job (běží každou hodinu)${NC}"
    echo ""
else
    echo "Spouštím synchronizaci..."
    echo ""
    
    RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/sync-feed-2" \
      -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
      -H "Content-Type: application/json")
    
    echo "Odpověď ze serveru:"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    echo ""
    
    if echo "$RESPONSE" | grep -q '"ok":true'; then
        echo -e "${GREEN}✅ Synchronizace úspěšně spuštěna${NC}"
    else
        echo -e "${RED}⚠️  Synchronizace možná selhala, zkontrolujte výše uvedenou odpověď${NC}"
    fi
    echo ""
fi

# =====================================================
# Souhrn
# =====================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Deployment dokončen!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Co dál:"
echo ""
echo "1. Počkejte 2-5 minut na dokončení synchronizace"
echo ""
echo "2. Ověřte produkt 2233:"
echo "   SELECT product_code, product_name FROM product_feed_2 WHERE product_code = '2233';"
echo ""
echo "3. Zkontrolujte, že nejsou HTML entity:"
echo "   SELECT COUNT(*) FROM product_feed_2 WHERE product_name LIKE '%&#%';"
echo ""
echo "4. Zkontrolujte embeddings (po 5-10 minutách):"
echo "   SELECT COUNT(*) FROM product_embeddings WHERE feed_source = 'feed_2';"
echo ""
echo "5. Otestujte vyhledávání v chatbotu"
echo ""
echo -e "${GREEN}🎉 Hotovo!${NC}"
echo ""

