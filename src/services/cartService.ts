/**
 * Služba pro správu košíku - ukládá produkty do localStorage
 * a sestavuje URL pro přidání do košíku na bewit.love
 */

const CART_STORAGE_KEY = 'bewit_cart';
const CART_CHANGE_EVENT = 'bewit-cart-change';

export interface CartItem {
    add_to_cart_id: string;
    productName: string;
    variantName?: string;
    price?: number;
    currency?: string;
    thumbnail?: string;
}

export function getCartItems(): CartItem[] {
    try {
        const raw = localStorage.getItem(CART_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveItems(items: CartItem[]) {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(CART_CHANGE_EVENT));
}

export function addToCart(item: CartItem): void {
    const items = getCartItems();
    const exists = items.findIndex(i => i.add_to_cart_id === item.add_to_cart_id);
    if (exists === -1) {
        items.push(item);
        saveItems(items);
    }
}

export function removeFromCart(add_to_cart_id: string): void {
    const items = getCartItems().filter(i => i.add_to_cart_id !== add_to_cart_id);
    saveItems(items);
}

export function isInCart(add_to_cart_id: string): boolean {
    return getCartItems().some(i => i.add_to_cart_id === add_to_cart_id);
}

export function clearCart(): void {
    localStorage.removeItem(CART_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(CART_CHANGE_EVENT));
}

export function getCartCount(): number {
    return getCartItems().length;
}

export function getCartTotal(): number {
    return getCartItems().reduce((sum, item) => sum + (item.price ?? 0), 0);
}

/** Sestaví URL ve formátu https://bewit.love/action/add-to-cart/79_141-80_143-181_337 */
export function buildCartUrl(): string {
    const ids = getCartItems().map(i => i.add_to_cart_id).join('-');
    return `https://bewit.love/action/add-to-cart/${ids}`;
}

export { CART_CHANGE_EVENT };
