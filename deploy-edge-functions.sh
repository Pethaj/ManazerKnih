#!/bin/bash

# 🚀 Skript pro nasazení Supabase Edge Functions
# Automatizuje celý proces nasazení včetně ověření

set -e  # Ukončit při chybě

echo "🔒 === Nasazení Edge Functions pro zabezpečenou aplikaci ==="
echo ""

# Barvy pro výstup
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Kontrola Supabase CLI
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI není nainstalován!${NC}"
    echo "Instalace: npm install -g supabase"
    exit 1
fi

echo -e "${GREEN}✓ Supabase CLI nalezen${NC}"
echo ""

# Kontrola přihlášení
echo "🔐 Kontroluji přihlášení do Supabase..."
if ! supabase projects list &> /dev/null; then
    echo -e "${YELLOW}⚠️  Nejste přihlášeni${NC}"
    echo "Přihlašuji..."
    supabase login
fi

echo -e "${GREEN}✓ Přihlášen do Supabase${NC}"
echo ""

# Propojení s projektem
PROJECT_ID="modopafybeslbcqjxsve"
echo "🔗 Propojuji s projektem $PROJECT_ID..."
supabase link --project-ref $PROJECT_ID

echo -e "${GREEN}✓ Projekt propojen${NC}"
echo ""

# Kontrola secrets
echo "🔑 Kontroluji nastavené secrets..."
SECRETS=$(supabase secrets list 2>&1)

if echo "$SECRETS" | grep -q "OPENAI_API_KEY"; then
    echo -e "${GREEN}✓ OPENAI_API_KEY nastaven${NC}"
else
    echo -e "${RED}❌ OPENAI_API_KEY CHYBÍ!${NC}"
    echo "Nastavte: supabase secrets set OPENAI_API_KEY=\"sk-...\""
    exit 1
fi

if echo "$SECRETS" | grep -q "CLOUDCONVERT_API_KEY"; then
    echo -e "${GREEN}✓ CLOUDCONVERT_API_KEY nastaven${NC}"
else
    echo -e "${YELLOW}⚠️  CLOUDCONVERT_API_KEY chybí${NC}"
    read -p "Chcete pokračovat bez CloudConvert? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

if echo "$SECRETS" | grep -q "ILOVEPDF_SECRET_KEY"; then
    echo -e "${GREEN}✓ ILOVEPDF_SECRET_KEY nastaven${NC}"
else
    echo -e "${YELLOW}⚠️  ILOVEPDF_SECRET_KEY chybí${NC}"
    read -p "Chcete pokračovat bez iLovePDF? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

if echo "$SECRETS" | grep -q "ILOVEPDF_PUBLIC_KEY"; then
    echo -e "${GREEN}✓ ILOVEPDF_PUBLIC_KEY nastaven${NC}"
else
    echo -e "${YELLOW}⚠️  ILOVEPDF_PUBLIC_KEY chybí${NC}"
fi

echo ""

# Deploy edge funkcí
echo "📦 Nasazuji Edge Functions..."
echo ""

echo "1️⃣  Nasazuji openai-proxy..."
if supabase functions deploy openai-proxy; then
    echo -e "${GREEN}✓ openai-proxy nasazena${NC}"
else
    echo -e "${RED}❌ openai-proxy selhala${NC}"
    exit 1
fi

echo ""
echo "2️⃣  Nasazuji cloudconvert-proxy..."
if supabase functions deploy cloudconvert-proxy; then
    echo -e "${GREEN}✓ cloudconvert-proxy nasazena${NC}"
else
    echo -e "${RED}❌ cloudconvert-proxy selhala${NC}"
    exit 1
fi

echo ""
echo "3️⃣  Nasazuji ilovepdf-proxy..."
if supabase functions deploy ilovepdf-proxy; then
    echo -e "${GREEN}✓ ilovepdf-proxy nasazena${NC}"
else
    echo -e "${RED}❌ ilovepdf-proxy selhala${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 === Všechny Edge Functions byly úspěšně nasazeny! ===${NC}"
echo ""

# Výpis nasazených funkcí
echo "📋 Seznam nasazených funkcí:"
supabase functions list

echo ""
echo -e "${GREEN}✅ Nasazení dokončeno!${NC}"
echo ""
echo "📖 Další kroky:"
echo "  1. Otevřete aplikaci a otestujte funkčnost"
echo "  2. Sledujte logy: supabase functions logs"
echo "  3. Zkontrolujte SECURITY_SETUP.md pro detaily"
echo ""

