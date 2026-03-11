/**
 * CartDropdown - košík v hlavičce chatbotu
 * Zobrazuje počet položek + celkovou cenu, po rozkliku seznam produktů
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    getCartItems,
    getCartCount,
    getCartTotal,
    removeFromCart,
    buildCartUrl,
    CART_CHANGE_EVENT,
    CartItem,
} from '../../services/cartService';

const CartIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <circle cx="9" cy="21" r="1"/>
        <circle cx="20" cy="21" r="1"/>
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
    </svg>
);

const TrashIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
        <path d="M10 11v6M14 11v6"/>
        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
);

const CartDropdown: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [items, setItems] = useState<CartItem[]>([]);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const refresh = () => {
        setItems(getCartItems());
    };

    useEffect(() => {
        refresh();
        window.addEventListener(CART_CHANGE_EVENT, refresh);
        return () => window.removeEventListener(CART_CHANGE_EVENT, refresh);
    }, []);

    // Zavřít dropdown při kliknutí mimo
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const count = items.length;
    const total = items.reduce((s, i) => s + (i.price ?? 0), 0);
    const currency = items[0]?.currency ?? 'Kč';

    const handleGoToCart = () => {
        window.open(buildCartUrl(), '_blank', 'noopener,noreferrer');
        setIsOpen(false);
    };

    return (
        <div ref={dropdownRef} className="relative">
            {/* Tlačítko košíku */}
            <button
                onClick={() => setIsOpen(o => !o)}
                className={`relative flex items-center gap-1.5 h-9 px-3 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white ${
                    isOpen ? 'bg-white/20 text-white' : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
                aria-label="Košík"
                title="Košík"
            >
                <CartIcon className="h-5 w-5" />
                <span className="text-xs font-medium hidden sm:inline">Košík</span>
                {count > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold leading-none">
                        {count}
                    </span>
                )}
            </button>

            {/* Dropdown panel */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
                    {/* Hlavička */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                        <span className="text-sm font-semibold text-slate-700">
                            Košík {count > 0 && <span className="text-slate-400 font-normal">({count} položek)</span>}
                        </span>
                        {count > 0 && (
                            <span className="text-sm font-bold text-green-700">
                                {total.toLocaleString('cs-CZ')} {currency}
                            </span>
                        )}
                    </div>

                    {/* Prázdný košík */}
                    {count === 0 && (
                        <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                            <CartIcon className="w-10 h-10 mb-3 opacity-30" />
                            <p className="text-sm">Košík je prázdný</p>
                        </div>
                    )}

                    {/* Seznam položek */}
                    {count > 0 && (
                        <>
                            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                                {items.map((item) => (
                                    <div key={item.add_to_cart_id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                                        {/* Thumbnail */}
                                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100 flex items-center justify-center">
                                            {item.thumbnail ? (
                                                <img src={item.thumbnail} alt={item.productName} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-lg">🌿</span>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-800 truncate">{item.productName}</p>
                                            {item.variantName && (
                                                <p className="text-xs text-slate-400 truncate">{item.variantName}</p>
                                            )}
                                            {item.price != null && item.price > 0 && (
                                                <p className="text-xs font-semibold text-green-700">
                                                    {item.price.toLocaleString('cs-CZ')} {item.currency ?? 'Kč'}
                                                </p>
                                            )}
                                        </div>

                                        {/* Odstranit */}
                                        <button
                                            onClick={() => removeFromCart(item.add_to_cart_id)}
                                            className="flex-shrink-0 p-1.5 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                                            title="Odebrat z košíku"
                                        >
                                            <TrashIcon />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Tlačítko přejít do košíku */}
                            <div className="px-4 py-3 bg-slate-50 border-t border-slate-100">
                                <button
                                    onClick={handleGoToCart}
                                    className="w-full flex items-center justify-center gap-2 bg-bewit-blue hover:bg-blue-800 text-white text-sm font-semibold py-2.5 px-4 rounded-xl transition-colors duration-200"
                                >
                                    <CartIcon className="w-4 h-4" />
                                    Přejít do košíku
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default CartDropdown;
