/**
 * Inline Product Link Component
 * 
 * Malá ikona/badge pro produktový link přímo v textu (ChatGPT styl)
 * - Design: Shopping bag icon v kruhu s gradient barvami
 * - Hover: Tooltip s názvem produktu + miniaturním obrázkem
 * - Click: Otevře URL produktu v novém tabu
 */

import React, { useState } from 'react';

// ============================================================================
// INTERFACES
// ============================================================================

export interface InlineProductLinkProps {
  product_code: string;
  product_name: string;
  url: string;
  thumbnail?: string;
}

// ============================================================================
// KOMPONENTA
// ============================================================================

export const InlineProductLink: React.FC<InlineProductLinkProps> = ({
  product_code,
  product_name,
  url,
  thumbnail
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.open(url, '_blank', 'noopener,noreferrer');
  };
  
  return (
    <span 
      style={styles.container}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <a
        href={url}
        onClick={handleClick}
        style={styles.link}
        aria-label={`Zobrazit produkt: ${product_name}`}
      >
        {/* Ikona shopping bag */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={styles.icon}
        >
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 0 1-8 0"/>
        </svg>
      </a>
      
      {/* Tooltip */}
      {showTooltip && (
        <div style={styles.tooltip}>
          <div style={styles.tooltipContent}>
            {thumbnail && (
              <img 
                src={thumbnail} 
                alt={product_name}
                style={styles.tooltipImage}
              />
            )}
            <div style={styles.tooltipText}>
              <div style={styles.tooltipTitle}>{product_name}</div>
              <div style={styles.tooltipCode}>Kód: {product_code}</div>
              <div style={styles.tooltipLink}>Kliknutím zobrazíte →</div>
            </div>
          </div>
        </div>
      )}
    </span>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'inline-block',
    position: 'relative',
    marginLeft: '4px',
    marginRight: '2px',
    verticalAlign: 'middle',
  },
  
  link: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #00d084 0%, #4079ff 100%)',
    color: 'white',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  
  icon: {
    width: '14px',
    height: '14px',
    strokeWidth: '2.5',
  },
  
  tooltip: {
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginBottom: '8px',
    zIndex: 1000,
    pointerEvents: 'none',
    animation: 'fadeIn 0.2s ease',
  },
  
  tooltipContent: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: 'white',
    padding: '12px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    minWidth: '200px',
    maxWidth: '300px',
    border: '1px solid #e2e8f0',
  },
  
  tooltipImage: {
    width: '60px',
    height: '60px',
    objectFit: 'cover',
    borderRadius: '6px',
    flexShrink: 0,
  },
  
  tooltipText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
  },
  
  tooltipTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
    lineHeight: '1.3',
  },
  
  tooltipCode: {
    fontSize: '11px',
    color: '#64748b',
  },
  
  tooltipLink: {
    fontSize: '11px',
    color: '#4079ff',
    fontWeight: '500',
    marginTop: '2px',
  },
};

// ============================================================================
// CSS ANIMATIONS (inject do head)
// ============================================================================

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateX(-50%) translateY(4px);
      }
      to {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
    }
    
    /* Hover efekt pro link */
    a[aria-label*="Zobrazit produkt"]:hover {
      transform: scale(1.1);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15) !important;
    }
    
    a[aria-label*="Zobrazit produkt"]:active {
      transform: scale(0.95);
    }
  `;
  
  // Přidáme pouze pokud už není přidáno
  if (!document.getElementById('inline-product-link-styles')) {
    styleSheet.id = 'inline-product-link-styles';
    document.head.appendChild(styleSheet);
  }
}

export default InlineProductLink;




