/**
 * Product Link Service
 * ============================================================================
 * 🔗 Správa prokliků na Bewit e-shop s automatickým přidáním token_eshop
 * ============================================================================
 * 
 * Funkce:
 * - Přidává token_eshop do URL produktů při prokliknutí
 * - Funguje jako fallback - pokud token neexistuje, otevře se normální URL
 * - Token se načítá z user_data v chat_messages tabulce
 */

import { supabase } from '../lib/supabase';

/**
 * Otevře URL produktu s automaticky přidaným token_eshop (pokud existuje)
 * 
 * @param productUrl - URL produktu na bewit.love
 * @param sessionId - ID chat session pro načtení user_data
 * @param target - Target window ('_blank' jako default)
 */
export async function openBewitProductLink(
  productUrl: string,
  sessionId?: string,
  target: string = '_blank'
): Promise<void> {
  try {
    // 1. Zkusíme načíst token z user_data
    let token: string | null = null;

    if (sessionId) {
      console.log('🔍 [ProductLink] Načítám token_eshop pro session:', sessionId);

      const { data, error } = await supabase
        .from('chat_messages')
        .select('user_data')
        .eq('session_id', sessionId)
        .not('user_data', 'is', null)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (!error && data?.user_data) {
        // user_data je JSONB, může obsahovat token_eshop
        const userData = data.user_data as { token_eshop?: string };
        token = userData.token_eshop || null;

        if (token) {
          console.log('✅ [ProductLink] Token nalezen:', token.substring(0, 10) + '...');
        } else {
          console.log('⚠️ [ProductLink] Token v user_data neexistuje');
        }
      } else {
        console.log('⚠️ [ProductLink] Žádné user_data pro session');
      }
    }

    // 2. Sestavíme finální URL
    let finalUrl = productUrl;

    if (token) {
      // Přidáme token do URL
      const separator = productUrl.includes('?') ? '&' : '?';
      finalUrl = `${productUrl}${separator}t=${encodeURIComponent(token)}`;
      console.log('🔗 [ProductLink] URL s tokenem:', finalUrl);
    } else {
      console.log('🔗 [ProductLink] URL bez tokenu:', finalUrl);
    }

    // 3. Otevřeme URL
    window.open(finalUrl, target, 'noopener,noreferrer');

  } catch (err) {
    console.error('❌ [ProductLink] Chyba při otevírání odkazu:', err);
    // Fallback - otevřeme původní URL
    window.open(productUrl, target, 'noopener,noreferrer');
  }
}

/**
 * Synchronní verze - pro případy, kdy už máme token k dispozici
 * 
 * @param productUrl - URL produktu
 * @param token - Token z user_data (nebo null)
 * @param target - Target window
 */
export function openBewitProductLinkSync(
  productUrl: string,
  token: string | null = null,
  target: string = '_blank'
): void {
  try {
    let finalUrl = productUrl;

    if (token) {
      const separator = productUrl.includes('?') ? '&' : '?';
      finalUrl = `${productUrl}${separator}t=${encodeURIComponent(token)}`;
      console.log('🔗 [ProductLink] URL s tokenem:', finalUrl);
    } else {
      console.log('🔗 [ProductLink] URL bez tokenu:', finalUrl);
    }

    window.open(finalUrl, target, 'noopener,noreferrer');

  } catch (err) {
    console.error('❌ [ProductLink] Chyba při otevírání odkazu:', err);
    window.open(productUrl, target, 'noopener,noreferrer');
  }
}
