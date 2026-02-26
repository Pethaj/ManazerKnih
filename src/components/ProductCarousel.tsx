/**
 * Product Carousel Component
 * Zobrazuje produktová doporučení ve formě horizontálního carouselu
 */

import React, { useState, useEffect } from 'react';
import { ProductRecommendation } from '../services/productSearchService';
import { openBewitProductLink } from '../services/productLinkService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ProductCarouselProps {
  products: ProductRecommendation[];
  title?: string;
  showSimilarity?: boolean;
  token?: string;  // 🆕 Token z externalUserInfo
}

export const ProductCarousel: React.FC<ProductCarouselProps> = ({ 
  products, 
  title = "🛍️ Doporučené produkty",
  showSimilarity = false,
  token
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<ProductRecommendation | null>(null);

  if (!products || products.length === 0) {
    return null;
  }

  // Responsivní počet produktů podle šířky obrazovky
  const getItemsPerPage = () => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 768) return 1;        // Mobil: 1 produkt
      if (window.innerWidth < 1200) return 2;       // Tablet: 2 produkty  
      return 3;                                     // Desktop: 3 produkty
    }
    return 3;
  };

  const [itemsPerPage, setItemsPerPage] = useState(getItemsPerPage);

  // Poslouchej změny velikosti okna
  useEffect(() => {
    const handleResize = () => {
      setItemsPerPage(getItemsPerPage());
      // Přepočítej index aby nebyl mimo rozsah
      const newMaxIndex = Math.ceil(products.length / getItemsPerPage()) - 1;
      if (currentIndex > newMaxIndex) {
        setCurrentIndex(newMaxIndex);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [currentIndex, products.length]);

  const totalPages = Math.ceil(products.length / itemsPerPage);
  const canGoNext = currentIndex < totalPages - 1;
  const canGoPrev = currentIndex > 0;

  const nextPage = () => {
    if (canGoNext) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const prevPage = () => {
    if (canGoPrev) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const getCurrentPageProducts = () => {
    const startIndex = currentIndex * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return products.slice(startIndex, endIndex);
  };

  const formatPrice = (price: number | null, currency: string) => {
    if (!price) return 'Cena na dotaz';
    return `${price.toLocaleString('cs-CZ')} ${currency}`;
  };

  const handleBuyClick = (e: React.MouseEvent, product: ProductRecommendation) => {
    e.stopPropagation(); // Zabrání otevření modalu
    if (product.product_url) {
      // 🔗 Otevřeme URL s tokenem (pokud existuje)
      openBewitProductLink(product.product_url, token, '_blank');
    }
  };

  const handleProductClick = (product: ProductRecommendation) => {
    setSelectedProduct(product);
  };

  const closeModal = () => {
    setSelectedProduct(null);
  };

  const getImageUrl = (product: ProductRecommendation) => {
    // Fallback obrázek pro produkty bez obrázku
    if (!product.image_url) {
      return `data:image/svg+xml;base64,${btoa(`
        <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
          <rect width="200" height="200" fill="#f8f9fa"/>
          <text x="100" y="100" text-anchor="middle" dy=".3em" font-family="Arial, sans-serif" font-size="14" fill="#666">
            ${product.product_name.substring(0, 20)}
          </text>
        </svg>
      `)}`;
    }
    return product.image_url;
  };

  const currentPageProducts = getCurrentPageProducts();

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h4 style={styles.title}>{title}</h4>
        {products.length > itemsPerPage && (
          <div style={styles.controls}>
            <span style={styles.counter}>
              {currentIndex + 1} / {totalPages} stran
            </span>
          </div>
        )}
      </div>

      {/* Nový layout s šipkami mimo kontejner */}
      <div style={styles.outerCarouselWrapper}>
        {/* Levá navigační šipka - mimo kontejner */}
        {products.length > itemsPerPage && (
          <button 
            style={{...styles.navigationArrow, ...styles.leftArrow}} 
            onClick={prevPage}
            disabled={!canGoPrev}
            title="Předchozí produkty"
          >
            ‹
          </button>
        )}

        {/* Kontejner produktů */}
        <div style={styles.productsWrapper}>
          <div style={{...styles.productsContainer, gridTemplateColumns: `repeat(${itemsPerPage}, 1fr)`}}>
            {getCurrentPageProducts().map((product, index) => (
            <div 
              key={product.product_code} 
              style={styles.productCard}
              onClick={() => handleProductClick(product)}
            >
              <div style={styles.imageContainer}>
                <img
                  src={getImageUrl(product)}
                  alt={product.product_name}
                  style={styles.productImage}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = getImageUrl({ ...product, image_url: null });
                  }}
                />
              </div>

              <div style={styles.productInfo}>
                <h5 style={styles.productName} title={product.product_name}>
                  {product.product_name}
                </h5>
                
                
                {product.description && (
                  <div style={styles.description}>
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({node, ...props}) => <span {...props} />,
                        strong: ({node, ...props}) => <strong style={{fontWeight: 'bold'}} {...props} />,
                        em: ({node, ...props}) => <em style={{fontStyle: 'italic'}} {...props} />,
                      }}
                    >
                      {product.description.length > 60 
                        ? `${product.description.substring(0, 60)}...` 
                        : product.description}
                    </ReactMarkdown>
                  </div>
                )}
                
                <div style={styles.priceContainer}>
                  <span style={styles.price}>
                    {formatPrice(product.price, product.currency)}
                  </span>
                </div>
                
                <button
                  style={styles.buyButton}
                  onClick={(e) => handleBuyClick(e, product)}
                  disabled={!product.product_url}
                  title={product.product_url ? 'Koupit produkt' : 'Odkaz není dostupný'}
                >
                  Koupit
                </button>
              </div>
            </div>
          ))}
          </div>
        </div>

        {/* Pravá navigační šipka - mimo kontejner */}
        {products.length > itemsPerPage && (
          <button 
            style={{...styles.navigationArrow, ...styles.rightArrow}} 
            onClick={nextPage}
            disabled={!canGoNext}
            title="Další produkty"
          >
            ›
          </button>
        )}
      </div>

      {/* Indikátor stránek */}
      {products.length > itemsPerPage && (
        <div style={styles.pageIndicators}>
          {Array.from({ length: totalPages }, (_, index) => (
            <button
              key={index}
              style={{
                ...styles.pageIndicator,
                ...(index === currentIndex ? styles.activePageIndicator : {})
              }}
              onClick={() => setCurrentIndex(index)}
            />
          ))}
        </div>
      )}

      {/* Modal s detailem produktu */}
      {selectedProduct && (
        <div style={styles.modalOverlay} onClick={closeModal}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>{selectedProduct.product_name}</h3>
              <button style={styles.modalCloseButton} onClick={closeModal}>
                ✕
              </button>
            </div>
            
            <div style={styles.modalBody}>
              <div style={styles.modalImageContainer}>
                <img
                  src={getImageUrl(selectedProduct)}
                  alt={selectedProduct.product_name}
                  style={styles.modalImage}
                />
              </div>
              
              <div style={styles.modalInfo}>
                {selectedProduct.description && (
                  <p style={styles.modalDescription}>{selectedProduct.description}</p>
                )}
                
                <div style={styles.modalPrice}>
                  {formatPrice(selectedProduct.price, selectedProduct.currency)}
                </div>
                
                <button
                  style={{...styles.buyButton, ...styles.modalBuyButton}}
                  onClick={(e) => handleBuyClick(e, selectedProduct)}
                  disabled={!selectedProduct.product_url}
                >
                  Koupit produkt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Styly
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    margin: '16px 0',
    padding: '16px',
    backgroundColor: '#f8f9fa',
    borderRadius: '12px',
    border: '1px solid #e9ecef',
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },

  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600',
    color: '#333',
  },

  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  navButton: {
    background: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '50%',
    width: '32px',
    height: '32px',
    cursor: 'pointer',
    fontSize: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },

  counter: {
    fontSize: '12px',
    color: '#666',
    minWidth: '50px',
    textAlign: 'center' as const,
  },

  carousel: {
    overflow: 'hidden',
    position: 'relative',
    borderRadius: '8px',
  },


  productCard: {
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #e9ecef',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.2s, box-shadow 0.2s',
    height: '100%',
    cursor: 'pointer',
  },

  imageContainer: {
    position: 'relative',
    width: '100%',
    height: '200px',
    overflow: 'hidden',
  },

  productImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },

  similarityBadge: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    backgroundColor: '#28a745',
    color: 'white',
    fontSize: '10px',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: '500',
  },

  productInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '16px',
  },

  productName: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600',
    color: '#333',
    lineHeight: '1.3',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as any,
  },

  category: {
    fontSize: '12px',
    color: '#007bff',
    backgroundColor: '#e3f2fd',
    padding: '2px 8px',
    borderRadius: '12px',
    alignSelf: 'flex-start',
    fontWeight: '500',
  },

  description: {
    margin: 0,
    fontSize: '13px',
    color: '#666',
    lineHeight: '1.4',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical' as any,
  },

  priceContainer: {
    marginTop: 'auto',
  },

  price: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#28a745',
  },

  buyButton: {
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
    alignSelf: 'flex-start',
  },

  dots: {
    display: 'flex',
    justifyContent: 'center',
    gap: '6px',
    marginTop: '12px',
  },

  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: '#ddd',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },

  dotActive: {
    backgroundColor: '#007bff',
  },

  // Nové styly pro šipky mimo kontejner
  outerCarouselWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    position: 'relative',
    width: '100%',
  },

  productsWrapper: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: '8px',
  },

  productsContainer: {
    display: 'grid',
    gap: '16px',
    flex: 1,
    maxWidth: '100%',
    // gridTemplateColumns se nastavuje dynamicky v komponetě
  },

  navigationArrow: {
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    fontSize: '20px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    flexShrink: 0,
    zIndex: 2,
    boxShadow: '0 2px 8px rgba(0, 123, 255, 0.3)',
  },

  leftArrow: {
    // Žádný extra margin - gap v outerCarouselWrapper to řeší
  },

  rightArrow: {
    // Žádný extra margin - gap v outerCarouselWrapper to řeší
  },

  pageIndicators: {
    display: 'flex',
    justifyContent: 'center',
    gap: '8px',
    marginTop: '16px',
  },

  pageIndicator: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: '#ddd',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },

  activePageIndicator: {
    backgroundColor: '#007bff',
    transform: 'scale(1.2)',
  },

  // Modal styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },

  modalContent: {
    backgroundColor: 'white',
    borderRadius: '12px',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
  },

  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 20px 0 20px',
    borderBottom: '1px solid #e9ecef',
    marginBottom: '20px',
  },

  modalTitle: {
    margin: 0,
    fontSize: '24px',
    fontWeight: '600',
    color: '#333',
  },

  modalCloseButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#999',
    padding: '0',
    width: '30px',
    height: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalBody: {
    padding: '0 20px 20px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },

  modalImageContainer: {
    display: 'flex',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    padding: '20px',
  },

  modalImage: {
    maxWidth: '300px',
    maxHeight: '300px',
    width: '100%',
    height: 'auto',
    objectFit: 'contain',
    borderRadius: '8px',
  },

  modalInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },

  modalCategory: {
    fontSize: '14px',
    color: '#007bff',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },

  modalDescription: {
    fontSize: '16px',
    lineHeight: '1.5',
    color: '#555',
    margin: 0,
  },

  modalPrice: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#28a745',
  },

  modalSimilarity: {
    fontSize: '14px',
    color: '#666',
    padding: '8px 12px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px',
    display: 'inline-block',
    alignSelf: 'flex-start',
  },

  modalBuyButton: {
    marginTop: '12px',
    fontSize: '16px',
    padding: '12px 24px',
    alignSelf: 'stretch',
  },
};

export default ProductCarousel;
