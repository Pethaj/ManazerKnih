/**
 * Product Funnel Message Component
 * ============================================================================
 * 🎯 SPECIÁLNÍ UI PRO PRODUKTOVÝ FUNNEL (Wany Chat)
 * ============================================================================
 * 
 * Modrý rámeček s textem ve formátování jako běžný chat.
 * Dole 2 produktové dlaždice s obrázkem a tlačítkem "Koupit".
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { openBewitProductLink } from '../services/productLinkService';

// ============================================================================
// INTERFACES
// ============================================================================

export interface FunnelProduct {
  product_code: string;
  product_name: string;
  description?: string;
  description_short?: string;
  description_long?: string;
  price?: number;
  currency?: string;
  url?: string;
  thumbnail?: string;
  category?: string;
}

interface ProductFunnelMessageProps {
  funnelText: string;
  selectedProducts: FunnelProduct[];
  symptomList?: string[];
  token?: string;  // 🆕 Token z externalUserInfo
}

// ============================================================================
// KOMPONENTA
// ============================================================================

export const ProductFunnelMessage: React.FC<ProductFunnelMessageProps> = ({
  funnelText,
  selectedProducts,
  symptomList = [],
  token
}) => {
  // Max 2 produkty
  const topProducts = selectedProducts.slice(0, 2);

  const getImageUrl = (product: FunnelProduct): string => {
    // 1. Priorita: thumbnail z product_feed_2 databáze
    if (product.thumbnail && product.thumbnail.length > 0) {
      return product.thumbnail;
    }
    
    // 2. Fallback: zkusíme odvodit z URL produktu
    if (product.url && product.url.includes('bewit.love')) {
      // Zkusíme standardní BEWIT pattern pro obrázky
      const fallbackUrl = product.url.replace('/produkt/', '/media/products/') + '/image.jpg';
      return fallbackUrl;
    }
    
    // 3. Žádný obrázek - zobrazí se placeholder emoji
    return '';
  };

  const handleBuyClick = (e: React.MouseEvent, product: FunnelProduct) => {
    e.stopPropagation();
    if (product.url) {
      // 🔗 Otevřeme URL s tokenem (pokud existuje)
      openBewitProductLink(product.url, token, '_blank');
    }
  };

  // Převést escape sekvence \n na skutečné odřádkování
  const processedText = funnelText
    ? funnelText.replace(/\\n/g, '\n')  // \n jako text → skutečný newline
    : '';

  return (
    <div className="funnel-message-wrapper">
      {/* Text - stejné formátování jako běžný chat */}
      <div className="funnel-text-content">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw, rehypeSanitize]}
        >
          {processedText}
        </ReactMarkdown>
      </div>

      {/* Produktové dlaždice - 2 vedle sebe */}
      {topProducts.length > 0 && (
        <div className="funnel-products-grid">
          {topProducts.map((product, idx) => (
            <div key={product.product_code || idx} className="funnel-product-tile">
              {/* Obrázek produktu */}
              <div className="funnel-product-image-container">
                {getImageUrl(product) ? (
                  <img
                    src={getImageUrl(product)}
                    alt={product.product_name}
                    className="funnel-product-image"
                    onError={(e) => {
                      // Při chybě skryjeme obrázek a zobrazí se placeholder
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <span className="funnel-product-placeholder">📦</span>
                )}
              </div>

              {/* Info o produktu */}
              <div className="funnel-product-info">
                <h4 className="funnel-product-name">{product.product_name}</h4>
                
                {product.price && (
                  <p className="funnel-product-price">
                    {product.price.toLocaleString('cs-CZ')} {product.currency || 'Kč'}
                  </p>
                )}

                {/* Tlačítko Koupit */}
                <button
                  className="funnel-buy-button"
                  onClick={(e) => handleBuyClick(e, product)}
                  disabled={!product.url}
                >
                  Koupit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Styles */}
      <style>{`
        .funnel-message-wrapper {
          background: #ffffff;
          border: 2px solid #3B82F6;
          border-radius: 16px;
          padding: 16px 20px;
          max-width: 100%;
        }

        .funnel-text-content {
          color: #1e293b;
          line-height: 1.7;
          font-size: 14px;
        }

        /* Markdown formátování - stejné jako v běžném chatu */
        .funnel-text-content h1 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
        }

        .funnel-text-content h2 {
          font-size: 1.25rem;
          font-weight: 700;
          margin-top: 0.75rem;
          margin-bottom: 0.5rem;
        }

        .funnel-text-content h3 {
          font-size: 1.125rem;
          font-weight: 700;
          margin-top: 0.5rem;
          margin-bottom: 0.25rem;
        }

        .funnel-text-content h4 {
          font-size: 1rem;
          font-weight: 700;
          margin-top: 0.5rem;
          margin-bottom: 0.25rem;
        }

        .funnel-text-content p {
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
          line-height: 1.7;
        }

        .funnel-text-content strong {
          font-weight: 700;
        }

        .funnel-text-content em {
          font-style: italic;
        }

        .funnel-text-content ul {
          list-style-type: disc;
          list-style-position: inside;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
          padding-left: 1rem;
        }

        .funnel-text-content ol {
          list-style-type: decimal;
          list-style-position: inside;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
          padding-left: 1rem;
        }

        .funnel-text-content li {
          margin-left: 1rem;
          margin-top: 0.25rem;
          margin-bottom: 0.25rem;
        }

        .funnel-text-content a {
          color: #3B82F6;
          text-decoration: none;
        }

        .funnel-text-content a:hover {
          text-decoration: underline;
        }

        .funnel-text-content hr {
          margin-top: 1rem;
          margin-bottom: 1rem;
          border-color: #e2e8f0;
        }

        .funnel-text-content code {
          background-color: #f1f5f9;
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          font-family: monospace;
          font-size: 0.875rem;
        }

        .funnel-text-content pre {
          background-color: #f1f5f9;
          padding: 0.75rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .funnel-text-content pre code {
          background-color: transparent;
          padding: 0;
        }

        .funnel-text-content blockquote {
          border-left: 4px solid #3B82F6;
          padding-left: 1rem;
          margin-left: 0;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
          color: #64748b;
        }

        /* Produktové dlaždice */
        .funnel-products-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid #e2e8f0;
        }

        .funnel-product-tile {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .funnel-product-tile:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .funnel-product-image-container {
          width: 100%;
          height: 160px;
          overflow: hidden;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .funnel-product-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .funnel-product-placeholder {
          font-size: 48px;
          color: #94a3b8;
        }

        .funnel-product-info {
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex: 1;
        }

        .funnel-product-name {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: #1e293b;
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .funnel-product-price {
          margin: 0;
          font-size: 16px;
          font-weight: 700;
          color: #16a34a;
        }

        .funnel-buy-button {
          margin-top: auto;
          width: 100%;
          padding: 10px 16px;
          background: #28a745;
          color: white;
          font-weight: 600;
          font-size: 14px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .funnel-buy-button:hover {
          background: #218838;
          transform: scale(1.02);
        }

        .funnel-buy-button:disabled {
          background: #94a3b8;
          cursor: not-allowed;
          transform: none;
        }

        /* Responsive - na mobilu pod sebou */
        @media (max-width: 560px) {
          .funnel-products-grid {
            grid-template-columns: 1fr;
          }

          .funnel-product-image-container {
            height: 140px;
          }
        }
      `}</style>
    </div>
  );
};

export default ProductFunnelMessage;
