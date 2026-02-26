/**
 * Categorized Product Table Component
 * Zobrazuje produkty rozdělené podle kategorií v tabulce
 */

import React from 'react';
import { ProductRecommendation } from '../services/productSearchService';
import { openBewitProductLink } from '../services/productLinkService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface CategorizedProductTableProps {
  products: ProductRecommendation[];
  token?: string;  // Token z externalUserInfo pro affiliate tracking
}

interface GroupedProducts {
  [category: string]: ProductRecommendation[];
}

export const CategorizedProductTable: React.FC<CategorizedProductTableProps> = ({ 
  products, 
  token 
}) => {
  if (!products || products.length === 0) {
    return null;
  }

  // Grupování produktů podle kategorií
  const groupedProducts: GroupedProducts = products.reduce((acc, product) => {
    const category = product.category || 'Ostatní';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(product);
    return acc;
  }, {} as GroupedProducts);

  // Seřazení kategorií abecedně (Ostatní na konec)
  const sortedCategories = Object.keys(groupedProducts).sort((a, b) => {
    if (a === 'Ostatní') return 1;
    if (b === 'Ostatní') return -1;
    return a.localeCompare(b, 'cs');
  });

  const formatPrice = (price: number | null, currency: string) => {
    if (!price) return 'Cena na dotaz';
    return `${price.toLocaleString('cs-CZ')} ${currency}`;
  };

  const handleProductClick = (product: ProductRecommendation) => {
    if (product.product_url) {
      openBewitProductLink(product.product_url, token, '_blank');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h4 style={styles.title}>🛍️ Súvisející produkty BEWIT</h4>
        <span style={styles.badge}>
          {products.length} {products.length === 1 ? 'produkt' : products.length < 5 ? 'produkty' : 'produktů'}
        </span>
      </div>

      <div style={styles.tableWrapper}>
        {sortedCategories.map((category, categoryIndex) => (
          <div key={category} style={styles.categorySection}>
            {/* Kategorie header */}
            <div style={styles.categoryHeader}>
              <span style={styles.categoryIcon}>📦</span>
              <span style={styles.categoryName}>{category}</span>
              <span style={styles.categoryCount}>
                ({groupedProducts[category].length})
              </span>
            </div>

            {/* Produkty v kategorii */}
            <div style={styles.productsInCategory}>
              {groupedProducts[category].map((product, productIndex) => (
                <div 
                  key={product.product_code} 
                  style={styles.productRow}
                  onClick={() => handleProductClick(product)}
                >
                  {/* Thumbnail */}
                  <div style={styles.thumbnailCell}>
                    {product.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={product.product_name}
                        style={styles.thumbnail}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div style={styles.noImage}>📦</div>
                    )}
                  </div>

                  {/* Název produktu */}
                  <div style={styles.nameCell}>
                    <span style={styles.productName}>{product.product_name}</span>
                    {product.description && (
                      <div style={styles.productDescription}>
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({node, ...props}) => <span {...props} />,
                            strong: ({node, ...props}) => <strong style={{fontWeight: 'bold'}} {...props} />,
                            em: ({node, ...props}) => <em style={{fontStyle: 'italic'}} {...props} />,
                          }}
                        >
                          {product.description.length > 100 
                            ? `${product.description.substring(0, 100)}...` 
                            : product.description}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>

                  {/* Cena */}
                  <div style={styles.priceCell}>
                    <span style={styles.price}>
                      {formatPrice(product.price, product.currency)}
                    </span>
                  </div>

                  {/* Akce tlačítko */}
                  <div style={styles.actionCell}>
                    <button
                      style={styles.buyButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProductClick(product);
                      }}
                      disabled={!product.product_url}
                      title={product.product_url ? 'Zobrazit produkt' : 'Odkaz není dostupný'}
                    >
                      Zobrazit
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Oddělovač mezi kategoriemi (kromě poslední) */}
            {categoryIndex < sortedCategories.length - 1 && (
              <div style={styles.categorySeparator} />
            )}
          </div>
        ))}
      </div>

      {/* Footer s celkovým počtem */}
      <div style={styles.footer}>
        <span style={styles.footerText}>
          Celkem {sortedCategories.length} {sortedCategories.length === 1 ? 'kategorie' : sortedCategories.length < 5 ? 'kategorie' : 'kategorií'}
        </span>
      </div>
    </div>
  );
};

// Styly
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
    marginTop: '16px',
    marginBottom: '16px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    backgroundColor: '#f8f9fa',
    borderBottom: '2px solid #e9ecef',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    color: '#2c3e50',
  },
  badge: {
    backgroundColor: '#007bff',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: 500,
  },
  tableWrapper: {
    maxHeight: '600px',
    overflowY: 'auto',
  },
  categorySection: {
    marginBottom: '0',
  },
  categoryHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 20px',
    backgroundColor: '#e3f2fd',
    borderBottom: '1px solid #bbdefb',
    position: 'sticky' as 'sticky',
    top: 0,
    zIndex: 10,
  },
  categoryIcon: {
    fontSize: '18px',
    marginRight: '8px',
  },
  categoryName: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#1976d2',
    flex: 1,
  },
  categoryCount: {
    fontSize: '13px',
    color: '#64b5f6',
    fontWeight: 500,
  },
  productsInCategory: {
    backgroundColor: '#ffffff',
  },
  productRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 20px',
    borderBottom: '1px solid #f0f0f0',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  thumbnailCell: {
    width: '60px',
    height: '60px',
    marginRight: '16px',
    flexShrink: 0,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as 'cover',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
  },
  noImage: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
    fontSize: '24px',
  },
  nameCell: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as 'column',
    gap: '4px',
    minWidth: 0,
  },
  productName: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#2c3e50',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as 'nowrap',
  },
  productDescription: {
    fontSize: '12px',
    color: '#6c757d',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as any,
  },
  priceCell: {
    width: '120px',
    textAlign: 'right' as 'right',
    marginRight: '16px',
    flexShrink: 0,
  },
  price: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#28a745',
  },
  actionCell: {
    width: '100px',
    flexShrink: 0,
  },
  buyButton: {
    width: '100%',
    padding: '8px 16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  categorySeparator: {
    height: '8px',
    backgroundColor: '#f8f9fa',
  },
  footer: {
    padding: '12px 20px',
    backgroundColor: '#f8f9fa',
    borderTop: '1px solid #e9ecef',
    textAlign: 'center' as 'center',
  },
  footerText: {
    fontSize: '13px',
    color: '#6c757d',
    fontWeight: 500,
  },
};

// Hover efekt pro produktové řádky
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    [style*="productRow"]:hover {
      background-color: #f8f9fa !important;
    }
    [style*="buyButton"]:hover:not(:disabled) {
      background-color: #0056b3 !important;
    }
    [style*="buyButton"]:disabled {
      background-color: #6c757d !important;
      cursor: not-allowed !important;
    }
  `;
  document.head.appendChild(style);
}
