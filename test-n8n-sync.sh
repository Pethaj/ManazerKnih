#!/bin/bash

# =====================================================
# TEST SKRIPT PRO N8N SYNCHRONIZACI PRODUKTŮ
# =====================================================

echo "🚀 Testujem HTTP synchronizaci pro n8n..."
echo "🕒 Čas: $(date)"
echo "="

# Základní curl test
echo "📡 Spouštím synchronizaci..."

response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZG9wYWZ5YmVzbGJjcWp4c3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNTM0MjEsImV4cCI6MjA3MDgyOTQyMX0.8gxL0b9flTUyoltiEIJx8Djuiyx16rySlffHkd_nm1U" \
  -H "Content-Type: application/json" \
  -H "X-Triggered-By: n8n-test-script" \
  -d '{"source": "n8n_test", "trigger_time": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' \
  https://modopafybeslbcqjxsve.supabase.co/functions/v1/sync-products)

# Parsování odpovědi
body=$(echo $response | sed -E 's/HTTPSTATUS\:[0-9]{3}$//')
status=$(echo $response | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')

echo "📊 HTTP Status: $status"
echo "📄 Odpověď:"
echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
echo "="

if [ $status -eq 200 ]; then
  echo "✅ Test úspěšný!"
  
  # Parsování JSON odpovědi pro detaily
  if command -v jq >/dev/null 2>&1; then
    processed=$(echo "$body" | jq -r '.processed // "N/A"')
    inserted=$(echo "$body" | jq -r '.inserted // "N/A"')
    updated=$(echo "$body" | jq -r '.updated // "N/A"')
    failed=$(echo "$body" | jq -r '.failed // "N/A"')
    
    echo "📈 Statistiky:"
    echo "   Zpracováno: $processed"
    echo "   Nových: $inserted"
    echo "   Aktualizováno: $updated"
    echo "   Chyb: $failed"
  fi
  
  echo ""
  echo "🎯 Pro n8n použijte tento curl:"
  echo "curl -X POST \\"
  echo "  -H \"Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZG9wYWZ5YmVzbGJjcWp4c3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNTM0MjEsImV4cCI6MjA3MDgyOTQyMX0.8gxL0b9flTUyoltiEIJx8Djuiyx16rySlffHkd_nm1U\" \\"
  echo "  -H \"Content-Type: application/json\" \\"
  echo "  -H \"X-Triggered-By: n8n-workflow\" \\"
  echo "  -d '{\"source\": \"n8n_auto\", \"trigger_time\": \"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'\"}' \\"
  echo "  https://modopafybeslbcqjxsve.supabase.co/functions/v1/sync-products"
  
  exit 0
else
  echo "❌ Test selhal (HTTP $status)"
  echo "🔍 Chyba: $body"
  exit 1
fi
