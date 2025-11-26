#!/bin/bash

# Deploy script pro edge funkci update-chatbot-settings

echo "🚀 Deploying edge function: update-chatbot-settings"
echo ""

# Zkontroluj, zda je Supabase CLI nainstalované
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI není nainstalované"
    echo "Instaluj pomocí: npm install -g supabase"
    exit 1
fi

# Deploy funkce
echo "📦 Deploying function..."
npx supabase functions deploy update-chatbot-settings --project-ref modopafybeslbcqjxsve

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Edge funkce úspěšně deploynutá!"
    echo ""
    echo "URL: https://modopafybeslbcqjxsve.supabase.co/functions/v1/update-chatbot-settings"
    echo ""
    echo "🧪 Test funkce:"
    echo "curl -X POST https://modopafybeslbcqjxsve.supabase.co/functions/v1/update-chatbot-settings \\"
    echo "  -H 'Content-Type: application/json' \\"
    echo "  -d '{\"chatbot_id\":\"test_chat\",\"updates\":{\"product_button_recommendations\":true}}'"
    echo ""
else
    echo ""
    echo "❌ Deployment selhal!"
    echo ""
    echo "💡 Zkus ruční deployment:"
    echo "1. Přihlas se: npx supabase login"
    echo "2. Deploy: npx supabase functions deploy update-chatbot-settings"
    echo ""
    exit 1
fi

