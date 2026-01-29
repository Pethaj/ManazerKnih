/**
 * Manual Funnel Button Component
 * ============================================================================
 * 🎯 MANUÁLNÍ FUNNEL SPOUŠTĚČ PRO WANY CHAT
 * ============================================================================
 * 
 * Tlačítko, které se zobrazí místo žlutého calloutu, když je zapnutý
 * manuální funnel spouštěč. Uživatel může ručně zadat symptomy a
 * spustit doporučení produktů.
 */

import React, { useState } from 'react';
import GradientText from './ui/GradientText';
import { ProductFunnelMessage, FunnelProduct } from './ProductFunnelMessage';
import { enrichFunnelProductsFromDatabase, RecommendedProduct } from '../services/intentRoutingService';

// ============================================================================
// INTERFACES
// ============================================================================

interface ManualFunnelButtonProps {
  /** Produkty doporučené v konverzaci (z Product Pills) */
  recommendedProducts: RecommendedProduct[];
  /** Session ID pro kontext */
  sessionId: string;
  /** Metadata pro webhook */
  metadata: {
    categories: string[];
    labels: string[];
    publication_types: string[];
  };
  /** Historie konverzace */
  chatHistory: Array<{
    id: string;
    role: string;
    text: string;
  }>;
  /** Callback po úspěšném získání odpovědi */
  onFunnelResponse?: (text: string, products: FunnelProduct[]) => void;
  /** Custom CSS třídy */
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MANUAL_FUNNEL_WEBHOOK_URL = 'https://n8n.srv980546.hstgr.cloud/webhook/8eda4352-19ca-48fe-8325-855ecf554fc3/chat';

// ============================================================================
// KOMPONENTA
// ============================================================================

export const ManualFunnelButton: React.FC<ManualFunnelButtonProps> = ({
  recommendedProducts,
  sessionId,
  metadata,
  chatHistory,
  onFunnelResponse,
  className = ''
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [symptomsText, setSymptomsText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [funnelResult, setFunnelResult] = useState<{
    text: string;
    products: FunnelProduct[];
  } | null>(null);

  // Odeslání formuláře
  const handleSubmit = async () => {
    // Parsujeme symptomy z textu (rozdělíme podle řádků nebo čárek)
    const symptomsArray = symptomsText
      .split(/[\n,]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    if (symptomsArray.length === 0) {
      setError('Zadejte alespoň jeden symptom nebo problém.');
      return;
    }

    if (recommendedProducts.length === 0) {
      setError('Nejsou k dispozici žádné produkty pro doporučení.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('%c╔═══════════════════════════════════════════════════════════════════╗', 'background: #3B82F6; color: white; font-weight: bold;');
      console.log('%c║         🎯 MANUÁLNÍ FUNNEL SPOUŠTĚČ - START                       ║', 'background: #3B82F6; color: white; font-weight: bold;');
      console.log('%c╚═══════════════════════════════════════════════════════════════════╝', 'background: #3B82F6; color: white; font-weight: bold;');

      console.log('%c📋 Symptomy zadané uživatelem:', 'color: #3B82F6; font-weight: bold;');
      symptomsArray.forEach((s, i) => console.log(`   ${i + 1}. ${s}`));

      console.log('%c📦 Dostupné produkty:', 'color: #8B5CF6; font-weight: bold;');
      recommendedProducts.forEach((p, i) => console.log(`   ${i + 1}. ${p.product_name}`));

      // Sestavení seznamu produktů pro chatInput
      const productList = recommendedProducts.map(p => {
        if (p.description) {
          return `${p.product_name} (${p.description})`;
        }
        return p.product_name;
      });
      const uniqueProductNames = [...new Set(productList)];
      const productNamesString = uniqueProductNames.join(', ');
      const symptomsList = symptomsArray.join(', ');

      // Sestavení chatInput ve formátu pro N8N
      const chatInput = `⚠️ OMEZENÍ: Pracuj POUZE s těmito vybranými produkty, NEDOPORUČUJ žádné jiné!

Vybrané produkty (POUZE TYTO): ${productNamesString}

Symptomy zákazníka: ${symptomsList}

ÚKOL: Z výše uvedených ${recommendedProducts.length} produktů (${productNamesString}) vyber 2 nejlepší pro dané symptomy.
- Detailně rozepiš proč jsou vhodné
- Uveď jak je používat
- NEDOPORUČUJ žádné jiné produkty mimo tento seznam!`;

      // Payload pro webhook
      const payload = {
        sessionId: sessionId,
        action: "sendMessage",
        chatInput: chatInput,
        chatHistory: chatHistory.map(msg => ({
          id: msg.id,
          role: msg.role,
          text: msg.text.replace(/<<<PRODUCT:[^>]+>>>/g, '').trim()
        })),
        metadata: metadata
      };

      console.log('%c📡 Odesílám do N8N webhook:', 'color: #EF4444; font-weight: bold;');
      console.log('   URL:', MANUAL_FUNNEL_WEBHOOK_URL);
      console.log('%c📝 chatInput:', 'color: #EF4444;');
      console.log(chatInput);

      // Volání webhooku
      const response = await fetch(MANUAL_FUNNEL_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Webhook error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('%c📥 N8N response:', 'color: #10B981; font-weight: bold;', data);

      // Zpracování odpovědi
      let responsePayload = Array.isArray(data) ? data[0] : data;
      if (responsePayload?.json) responsePayload = responsePayload.json;

      // Extrahujeme text - preferujeme markdown formát
      let botText = responsePayload?.output || responsePayload?.text || responsePayload?.response || responsePayload?.html || 'Nepodařilo se získat odpověď.';
      
      // 🔧 NOVÁ LOGIKA: Parsování JSON z botText pokud obsahuje selectedProductCodes
      let selectedProductCodes: string[] = [];
      let actualRecommendationText = botText;
      
      // Pokud botText vypadá jako JSON s selectedProductCodes, parsujeme ho
      if (typeof botText === 'string' && botText.trim().startsWith('{') && botText.includes('selectedProductCodes')) {
        try {
          const jsonData = JSON.parse(botText);
          selectedProductCodes = jsonData.selectedProductCodes || [];
          actualRecommendationText = jsonData.recommendation || botText;
          console.log('%c✅ Parsován JSON z N8N:', 'color: #10B981;');
          console.log('   selectedProductCodes:', selectedProductCodes);
          console.log('   recommendation text length:', actualRecommendationText.length);
        } catch (e) {
          console.warn('%c⚠️ Nepodařilo se parsovat JSON z botText:', 'color: orange;', e);
        }
      }
      
      // Pokud je HTML, může obsahovat markdown - zkusíme extrahovat
      if (typeof actualRecommendationText === 'string' && actualRecommendationText.includes('<') && actualRecommendationText.includes('>')) {
        // Zkusíme odstranit HTML tagy a zachovat čistý markdown/text
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = actualRecommendationText;
        const extractedText = tempDiv.textContent || tempDiv.innerText || actualRecommendationText;
        actualRecommendationText = extractedText;
      }
      
      console.log('%c📝 Extrahovaný text (preview):', 'color: #8B5CF6;', actualRecommendationText.substring(0, 200));

      // Obohacení produktů z databáze
      console.log('%c🔄 Obohacuji produkty z databáze...', 'color: #8B5CF6;');
      
      // 🔧 OPRAVA: Použijeme selectedProductCodes z N8N odpovědi místo prvních 2 z recommendedProducts
      let productsToEnrich: RecommendedProduct[] = [];
      
      if (selectedProductCodes.length > 0) {
        // N8N vrátil konkrétní product codes - najdeme je v recommendedProducts
        console.log('   🎯 Filtrujeme produkty podle selectedProductCodes:', selectedProductCodes);
        productsToEnrich = recommendedProducts.filter(p => {
          // Matchujeme podle substring v product_name nebo přesný product_code
          // Např: "Nobapa" matchne "Nobapa esenciální olej"
          const nameMatch = selectedProductCodes.some(code => 
            p.product_name.toLowerCase().includes(code.toLowerCase())
          );
          const codeMatch = selectedProductCodes.includes(p.product_code);
          
          if (nameMatch || codeMatch) {
            console.log(`   ✅ Match: ${p.product_name} (code: ${p.product_code})`);
            return true;
          }
          return false;
        });
        
        if (productsToEnrich.length === 0) {
          console.warn('   ⚠️ Žádné produkty neodpovídají selectedProductCodes:', selectedProductCodes);
          console.warn('   📦 Dostupné produkty:', recommendedProducts.map(p => p.product_name));
          console.warn('   🔄 Fallback: použiji první 2 produkty');
          productsToEnrich = recommendedProducts.slice(0, 2);
        } else {
          console.log('   ✅ Nalezeno produktů:', productsToEnrich.length);
          productsToEnrich.forEach(p => console.log(`      - ${p.product_name}`));
        }
      } else {
        // Fallback: použijeme první 2 produkty
        console.log('   ⚠️ Žádné selectedProductCodes, použiji první 2 produkty');
        productsToEnrich = recommendedProducts.slice(0, 2);
      }
      
      const enrichedProducts = await enrichFunnelProductsFromDatabase(productsToEnrich);

      const funnelProducts: FunnelProduct[] = enrichedProducts.map(p => ({
        product_code: p.product_code,
        product_name: p.product_name,
        description: p.description,
        description_short: p.description,
        price: p.price,
        currency: p.currency || 'CZK',
        url: p.url || `https://bewit.love/produkt/${p.product_code}`,
        thumbnail: p.thumbnail
      }));

      console.log('%c✅ Funnel dokončen!', 'color: #10B981; font-weight: bold;');
      console.log('   Produkty:', funnelProducts.map(p => p.product_name));

      setFunnelResult({
        text: actualRecommendationText,  // Používáme zpracovaný text místo původního botText
        products: funnelProducts
      });

      // Callback
      if (onFunnelResponse) {
        onFunnelResponse(actualRecommendationText, funnelProducts);  // Používáme zpracovaný text
      }
      
      // Zavřeme formulář a vyčistíme
      setIsFormOpen(false);
      setSymptomsText('');

    } catch (err) {
      console.error('%c❌ Chyba manuálního funnelu:', 'color: #EF4444;', err);
      setError(err instanceof Error ? err.message : 'Nepodařilo se zpracovat požadavek.');
    } finally {
      setIsLoading(false);
    }
  };

  // Pokud máme výsledek, zobrazíme ProductFunnelMessage
  if (funnelResult) {
    return (
      <div className={className}>
        <ProductFunnelMessage
          funnelText={funnelResult.text}
          selectedProducts={funnelResult.products}
          symptomList={symptomsText.split(/[\n,]+/).map(s => s.trim()).filter(s => s.length > 0)}
          sessionId={sessionId}
        />
      </div>
    );
  }

  return (
    <div className={`manual-funnel-container ${className}`}>
      {/* Tlačítko pro otevření formuláře */}
      {!isFormOpen && (
        <button
          onClick={() => setIsFormOpen(true)}
          className="manual-funnel-trigger-button"
        >
          <span className="manual-funnel-text">
            ✨ Doporučit produkty přesně na míru mým potížím
          </span>
        </button>
      )}

      {/* Formulář pro zadání symptomů */}
      {isFormOpen && (
        <div className="manual-funnel-form">
          <div className="manual-funnel-form-header">
            <h4>Popište své symptomy nebo potíže</h4>
            <button 
              onClick={() => setIsFormOpen(false)}
              className="manual-funnel-close-btn"
              title="Zavřít"
            >
              ✕
            </button>
          </div>

          <p className="manual-funnel-form-desc">
            Napište své symptomy nebo potíže, které vás trápí. Každý symptom oddělte čárkou nebo napište na nový řádek. Na základě těchto informací vám doporučíme nejvhodnější produkty.
          </p>

          <textarea
            value={symptomsText}
            onChange={(e) => setSymptomsText(e.target.value)}
            placeholder="Např.: bolest hlavy, únava, nespavost..."
            className="manual-funnel-textarea"
            disabled={isLoading}
            rows={4}
          />

          {error && (
            <div className="manual-funnel-error">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="manual-funnel-submit-btn"
          >
            {isLoading ? (
              <>
                <div className="manual-funnel-spinner"></div>
                <GradientText 
                  colors={['#00d084', '#4079ff', '#00d084', '#4079ff', '#00d084']}
                  animationSpeed={8}
                  showBorder={false}
                >
                  Zpracovávám...
                </GradientText>
              </>
            ) : (
              <GradientText 
                colors={['#00d084', '#4079ff', '#00d084', '#4079ff', '#00d084']}
                animationSpeed={8}
                showBorder={false}
              >
                💬 Doporuč mi produkty
              </GradientText>
            )}
          </button>
        </div>
      )}

      {/* Styly */}
      <style>{`
        .manual-funnel-container {
          margin-top: 16px;
        }

        .manual-funnel-trigger-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 14px 20px;
          background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
          border: 2px solid #2563EB;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          width: 100%;
          text-align: center;
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
        }

        .manual-funnel-trigger-button:hover {
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(59, 130, 246, 0.35);
          border-color: #1D4ED8;
        }

        .manual-funnel-text {
          font-size: 15px;
          font-weight: 600;
          color: #ffffff;
          letter-spacing: 0.01em;
        }

        .manual-funnel-form {
          background: #ffffff;
          border: 2px solid #3B82F6;
          border-radius: 12px;
          padding: 20px;
          animation: slideDown 0.3s ease;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .manual-funnel-form-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .manual-funnel-form-header h4 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
        }

        .manual-funnel-close-btn {
          background: none;
          border: none;
          font-size: 18px;
          color: #64748b;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .manual-funnel-close-btn:hover {
          background: #f1f5f9;
          color: #1e293b;
        }

        .manual-funnel-form-desc {
          font-size: 13px;
          color: #64748b;
          margin-bottom: 16px;
          line-height: 1.5;
        }

        .manual-funnel-textarea {
          width: 100%;
          padding: 12px 14px;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          font-size: 14px;
          font-family: inherit;
          line-height: 1.6;
          transition: all 0.2s;
          resize: vertical;
          min-height: 100px;
          margin-bottom: 16px;
        }

        .manual-funnel-textarea:focus {
          outline: none;
          border-color: #3B82F6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .manual-funnel-textarea:disabled {
          background: #f8fafc;
          color: #94a3b8;
          cursor: not-allowed;
        }

        .manual-funnel-textarea::placeholder {
          color: #94a3b8;
        }

        .manual-funnel-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 10px 12px;
          border-radius: 6px;
          font-size: 13px;
          margin-bottom: 16px;
        }

        .manual-funnel-submit-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 14px 20px;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 15px;
          font-weight: 600;
        }

        .manual-funnel-submit-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          border-color: #3B82F6;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
        }

        .manual-funnel-submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .manual-funnel-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid #3B82F6;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default ManualFunnelButton;
