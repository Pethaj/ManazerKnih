/**
 * Product Recommendation Button Component
 * Tlačítko pro produktové doporučení na základě kontextu konverzace
 * 
 * Použití:
 * <ProductRecommendationButton
 *   userQuery="poslední dotaz uživatele"
 *   botResponse="aktuální odpověď chatbota"
 *   sessionId="session-id"
 * />
 */

import React, { useState } from 'react';
import { ProductCarousel } from './ProductCarousel';
import { getButtonProductRecommendations, EnrichedProduct } from '../services/productButtonRecommendationService';
import GradientText from './ui/GradientText';
import './ProductRecommendationButton.css';

// Ikona pro tlačítko
const ProductIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
    <line x1="3" y1="6" x2="21" y2="6"/>
    <path d="M16 10a4 4 0 0 1-8 0"/>
  </svg>
);

interface ProductRecommendationButtonProps {
  userQuery: string;        // Poslední dotaz uživatele
  botResponse: string;      // Aktuální odpověď chatbota
  sessionId: string;        // Session ID pro kontext
  token?: string;           // 🆕 Token z externalUserInfo
  onProductsLoaded?: (products: EnrichedProduct[]) => void;  // Callback po načtení produktů
  className?: string;       // Custom CSS třídy
}

export const ProductRecommendationButton: React.FC<ProductRecommendationButtonProps> = ({
  userQuery,
  botResponse,
  sessionId,
  token,
  onProductsLoaded,
  className = ''
}) => {
  const [products, setProducts] = useState<EnrichedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCarousel, setShowCarousel] = useState(false);

  const handleRecommendClick = async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const result = await getButtonProductRecommendations({
        userQuery,
        botResponse,
        sessionId
      });

      setProducts(result.products);
      setShowCarousel(true);

      // Zavolej callback pokud existuje
      if (onProductsLoaded) {
        onProductsLoaded(result.products);
      }

    } catch (err) {
      setError('Nepodařilo se načíst produktová doporučení. Zkuste to prosím znovu.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`product-recommendation-button-container ${className}`} style={styles.container}>
      {/* Tlačítko */}
      {!showCarousel && (
        <button
          onClick={handleRecommendClick}
          disabled={isLoading}
          className="product-recommendation-button"
          style={styles.button}
        >
          {isLoading ? (
            <>
              <div style={styles.spinner}></div>
              <GradientText 
                colors={['#00d084', '#4079ff', '#00d084', '#4079ff', '#00d084']}
                animationSpeed={8}
                showBorder={false}
              >
                Načítám doporučení...
              </GradientText>
            </>
          ) : (
            <>
              <ProductIcon style={styles.icon} />
              <GradientText 
                colors={['#00d084', '#4079ff', '#00d084', '#4079ff', '#00d084']}
                animationSpeed={8}
                showBorder={false}
              >
                Doporuč produkty
              </GradientText>
            </>
          )}
        </button>
      )}

      {/* Error zpráva */}
      {error && (
        <div style={styles.error}>
          <span>❌ {error}</span>
          <button 
            onClick={() => setError(null)}
            style={styles.errorCloseButton}
          >
            ✕
          </button>
        </div>
      )}

      {/* Carousel s produkty */}
      {showCarousel && products.length > 0 && (
        <div style={styles.carouselContainer}>
          <ProductCarousel
            products={products.slice(0, 6).map(p => ({
              id: p.product_code,
              product_code: p.product_code,
              product_name: p.product_name,
              description: p.recommendation, // ⭐ Personalizované doporučení!
              product_url: p.url,
              image_url: p.image_url,
              price: p.price,
              currency: p.currency
            }))}
            title="Doporučené produkty na základě konverzace"
            showSimilarity={false}
            token={token}
          />
          
          {/* Tlačítko pro zavření carousel */}
          <button
            onClick={() => setShowCarousel(false)}
            style={styles.closeCarouselButton}
          >
            Zavřít doporučení
          </button>
        </div>
      )}
    </div>
  );
};

// Styly pro komponenty
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end', // Zarovná tlačítko doprava
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    backgroundColor: '#f8f9fa',
    color: '#2c3e50',
    border: '1px solid #e0e6ed',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
    marginTop: '12px',
  },
  icon: {
    flexShrink: 0,
    color: '#6c757d', // Šedá barva pro ikonu
  },
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid #007bff',
    borderTop: '2px solid transparent',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  error: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    backgroundColor: '#f8d7da',
    color: '#721c24',
    borderRadius: '8px',
    fontSize: '14px',
    marginTop: '12px',
    border: '1px solid #f5c6cb',
  },
  errorCloseButton: {
    background: 'none',
    border: 'none',
    color: '#721c24',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '0 8px',
  },
  carouselContainer: {
    marginTop: '16px',
    padding: '16px',
    backgroundColor: '#f8f9fa',
    borderRadius: '12px',
    border: '1px solid #e0e0e0',
  },
  closeCarouselButton: {
    display: 'block',
    margin: '12px auto 0',
    padding: '8px 16px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};

export default ProductRecommendationButton;

