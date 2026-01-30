#!/bin/bash

# Test Message Limits Edge Functions
# Rychlý test funkcionalit

echo "🧪 TEST MESSAGE LIMITS SYSTÉMU"
echo "================================"
echo ""

# Konfigurace
PROJECT_URL="https://modopafybeslbcqjxsve.supabase.co"
ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY}"
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"

# Barvy pro output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check message limit (check action)
echo "📝 Test 1: Kontrola limitu (check)"
echo "-----------------------------------"

response=$(curl -s -w "\n%{http_code}" -X POST \
  "$PROJECT_URL/functions/v1/check-message-limit" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d '{
    "chatbot_id": "test-chatbot-1",
    "action": "check"
  }')

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" -eq 200 ]; then
  echo -e "${GREEN}✅ Test 1 PASSED${NC}"
  echo "Response:"
  echo "$body" | jq '.'
else
  echo -e "${RED}❌ Test 1 FAILED${NC}"
  echo "HTTP Code: $http_code"
  echo "Response: $body"
fi

echo ""
echo ""

# Test 2: Increment message count
echo "📈 Test 2: Inkrementace čítače (increment)"
echo "-------------------------------------------"

response=$(curl -s -w "\n%{http_code}" -X POST \
  "$PROJECT_URL/functions/v1/check-message-limit" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d '{
    "chatbot_id": "test-chatbot-1",
    "action": "increment"
  }')

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" -eq 200 ]; then
  echo -e "${GREEN}✅ Test 2 PASSED${NC}"
  echo "Response:"
  echo "$body" | jq '.'
else
  echo -e "${RED}❌ Test 2 FAILED${NC}"
  echo "HTTP Code: $http_code"
  echo "Response: $body"
fi

echo ""
echo ""

# Test 3: Reset cron (vyžaduje Service Role Key)
echo "🔄 Test 3: Reset čítačů (cron)"
echo "-------------------------------"

if [ -z "$SERVICE_KEY" ]; then
  echo -e "${YELLOW}⚠️  Test 3 SKIPPED - SERVICE_KEY není nastaven${NC}"
  echo "Pro test resetu nastav proměnnou SUPABASE_SERVICE_ROLE_KEY"
else
  response=$(curl -s -w "\n%{http_code}" -X POST \
    "$PROJECT_URL/functions/v1/reset-message-limits-cron" \
    -H "Authorization: Bearer $SERVICE_KEY")

  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  if [ "$http_code" -eq 200 ]; then
    echo -e "${GREEN}✅ Test 3 PASSED${NC}"
    echo "Response:"
    echo "$body" | jq '.'
  else
    echo -e "${RED}❌ Test 3 FAILED${NC}"
    echo "HTTP Code: $http_code"
    echo "Response: $body"
  fi
fi

echo ""
echo ""
echo "================================"
echo "🏁 TESTY DOKONČENY"
echo "================================"
echo ""
echo "📋 Další kroky:"
echo "1. Zkontroluj databázi: SELECT * FROM message_limits;"
echo "2. Nastav limity v admin panelu"
echo "3. Integruj do chat API"
echo ""
