/**
 * ProductPill Component
 * Inline produktové tlačítko, které se zobrazuje přímo v textu chatbota
 */

import React from 'react';
import { openBewitProductLink } from '../services/productLinkService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export interface ProductPillProps {
    productName: string;
    pinyinName: string;
    url: string;
    token?: string;  // 🆕 Token z externalUserInfo
}

export const ProductPill: React.FC<ProductPillProps> = ({ 
    productName, 
    pinyinName, 
    url,
    token
}) => {
    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        
        // 🔗 Otevřeme URL s tokenem (pokud existuje)
        openBewitProductLink(url, token, '_blank');
    };

    return (
        <button
            onClick={handleClick}
            className="inline-flex items-center gap-1.5 px-3 py-1 mx-1 bg-gradient-to-r from-bewit-blue to-blue-600 text-white text-sm font-medium rounded-full hover:from-blue-600 hover:to-bewit-blue transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105 whitespace-nowrap align-middle"
            style={{
                verticalAlign: 'middle',
                lineHeight: 'inherit'
            }}
        >
            {/* Ikona košíku */}
            <svg 
                width="14" 
                height="14" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                className="flex-shrink-0"
            >
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            
            {/* Název produktu */}
            <span className="font-semibold">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({node, ...props}) => <span {...props} />,
                    strong: ({node, ...props}) => <strong style={{fontWeight: 'bold'}} {...props} />,
                    em: ({node, ...props}) => <em style={{fontStyle: 'italic'}} {...props} />,
                  }}
                >
                  {productName}
                </ReactMarkdown>
            </span>
            
            {/* Pinyin název (menší) */}
            {pinyinName && pinyinName !== productName && (
                <span className="text-xs opacity-90 font-normal" style={{display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                    (
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({node, ...props}) => <span {...props} />,
                        strong: ({node, ...props}) => <strong style={{fontWeight: 'bold'}} {...props} />,
                        em: ({node, ...props}) => <em style={{fontStyle: 'italic'}} {...props} />,
                      }}
                    >
                      {pinyinName}
                    </ReactMarkdown>
                    )
                </span>
            )}
        </button>
    );
};



