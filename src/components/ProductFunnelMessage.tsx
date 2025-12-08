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
}

// ============================================================================
// KOMPONENTA
// ============================================================================

export const ProductFunnelMessage: React.FC<ProductFunnelMessageProps> = ({
  funnelText,
  selectedProducts,
  symptomList = []
}) => {
  console.log('%c🎯 ProductFunnelMessage render', 'color: #3B82F6; font-weight: bold;');
  console.log('   Products:', selectedProducts.length);
  console.log('   Products data:', selectedProducts);

  // Max 2 produkty
  const topProducts = selectedProducts.slice(0, 2);

  const getImageUrl = (product: FunnelProduct): string => {
    if (product.thumbnail) return product.thumbnail;
    // Fallback - prázdný string, zobrazí se placeholder emoji
    return '';
  };

  const handleBuyClick = (e: React.MouseEvent, product: FunnelProduct) => {
    e.stopPropagation();
    if (product.url) {
      window.open(product.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="funnel-message-wrapper">
      {/* Text - stejné formátování jako běžný chat */}
      <div className="funnel-text-content markdown-content">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw, rehypeSanitize]}
          components={{
            h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-4 mb-2" {...props} />,
            h2: ({node, ...props}) => <h2 className="text-xl font-bold mt-3 mb-2" {...props} />,
            h3: ({node, ...props}) => <h3 className="text-lg font-bold mt-2 mb-1" {...props} />,
            p: ({node, ...props}) => <p className="my-2 leading-relaxed" {...props} />,
            strong: ({node, ...props}) => <strong className="font-bold" {...props} />,
            em: ({node, ...props}) => <em className="italic" {...props} />,
            ul: ({node, ...props}) => <ul className="list-disc list-inside my-2 space-y-1" {...props} />,
            ol: ({node, ...props}) => <ol className="list-decimal list-inside my-2 space-y-1" {...props} />,
            li: ({node, ...props}) => <li className="ml-4" {...props} />,
            a: ({node, ...props}) => <a className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
            hr: ({node, ...props}) => <hr className="my-4 border-slate-200" {...props} />,
          }}
        >
          {funnelText || ''}
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
                  🛒 Koupit
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
          background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
          color: white;
          font-weight: 600;
          font-size: 14px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .funnel-buy-button:hover {
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
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
