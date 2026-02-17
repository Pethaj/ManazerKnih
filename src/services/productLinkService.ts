/**
 * Product Link Service
 * ============================================================================
 * 🔗 Správa prokliků na Bewit e-shop s automatickým přidáním token_eshop
 * ============================================================================
 * 
 * Funkce:
 * - Přidává token_eshop do URL produktů při prokliknutí
 * - Funguje jako fallback - pokud token neexistuje, otevře se normální URL
 * - Token se předává přímo z externalUserInfo (ne ze Supabase)
 */

/**
 * Otevře URL produktu s automaticky přidaným token_eshop (pokud existuje)
 * 
 * @param productUrl - URL produktu na bewit.love
 * @param token - Token z externalUserInfo (nebo null/undefined)
 * @param target - Target window ('_blank' jako default)
 */
export function openBewitProductLink(
  productUrl: string,
  token?: string | null,
  target: string = '_blank'
): void {
  try {
    let finalUrl = productUrl;

    if (token) {
      // Přidáme token do URL
      const separator = productUrl.includes('?') ? '&' : '?';
      finalUrl = `${productUrl}${separator}t=${encodeURIComponent(token)}`;
    } else {
    }

    // Otevřeme URL
    window.open(finalUrl, target, 'noopener,noreferrer');

  } catch (err) {
    // Fallback - otevřeme původní URL
    window.open(productUrl, target, 'noopener,noreferrer');
  }
}
