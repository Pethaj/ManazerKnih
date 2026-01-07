/**
 * Widget Configuration Service
 * ============================================================================
 * Služba pro správu konfigurace embedovatelného chatbot widgetu
 * ============================================================================
 */

export interface WidgetConfig {
  chatbotId: string;
  theme: 'light' | 'dark';
  greeting?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  width?: number;
  height?: number;
}

/**
 * Načte konfiguraci z URL parametrů
 */
export function getWidgetConfigFromURL(): WidgetConfig {
  const params = new URLSearchParams(window.location.search);
  
  return {
    chatbotId: params.get('chatbot') || 'vany_chat',
    theme: (params.get('theme') as 'light' | 'dark') || 'light',
    greeting: params.get('greeting') || undefined,
    position: (params.get('position') as any) || 'bottom-right',
    width: params.get('width') ? parseInt(params.get('width')!) : 400,
    height: params.get('height') ? parseInt(params.get('height')!) : 600,
  };
}

/**
 * Validuje konfiguraci widgetu
 */
export function validateWidgetConfig(config: Partial<WidgetConfig>): boolean {
  if (!config.chatbotId) {
    console.error('Widget Config: chatbotId je povinný');
    return false;
  }
  
  if (config.theme && !['light', 'dark'].includes(config.theme)) {
    console.error('Widget Config: neplatné theme (musí být light nebo dark)');
    return false;
  }
  
  return true;
}

/**
 * Pošle zprávu do parent window
 */
export function sendMessageToParent(type: string, data?: any) {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type, ...data }, '*');
  }
}

/**
 * Nastaví listener pro zprávy z parent window
 */
export function setupParentListener(handlers: {
  onOpen?: () => void;
  onClose?: () => void;
  onSendMessage?: (message: string) => void;
  onSetTheme?: (theme: 'light' | 'dark') => void;
}) {
  window.addEventListener('message', (event) => {
    // Bezpečnostní kontrola - pouze od parent window
    if (event.source !== window.parent) {
      return;
    }
    
    const data = event.data;
    
    switch (data.type) {
      case 'PARENT_OPEN':
        handlers.onOpen?.();
        break;
        
      case 'PARENT_CLOSE':
        handlers.onClose?.();
        break;
        
      case 'PARENT_SEND_MESSAGE':
        handlers.onSendMessage?.(data.message);
        break;
        
      case 'PARENT_SET_THEME':
        handlers.onSetTheme?.(data.theme);
        break;
        
      default:
        console.log('📨 Neznámá zpráva z parent:', data);
    }
  });
}

/**
 * Oznámí parent window, že widget je připraven
 */
export function notifyWidgetReady() {
  sendMessageToParent('WIDGET_READY');
  console.log('✅ Widget oznámil parent window, že je připraven');
}

/**
 * Získá chatbot settings z databáze podle chatbot ID
 */
export async function getChatbotSettings(chatbotId: string) {
  try {
    const { supabase } = await import('../lib/supabase');
    
    const { data, error } = await supabase
      .from('chatbot_settings')
      .select('*')
      .eq('chatbot_id', chatbotId)
      .single();
    
    if (error) {
      console.error('Error loading chatbot settings:', error);
      // Return default settings for vany_chat
      return {
        chatbot_id: chatbotId,
        chatbot_name: 'Vany Chat',
        product_recommendations: true,
        product_button_recommendations: true,
        book_database: false,
        use_feed_1: true,
        use_feed_2: true,
        inline_product_links: false,
        enable_product_router: true,
        enable_manual_funnel: false,
        webhook_url: 'https://n8n.srv980546.hstgr.cloud/webhook/97dc857e-352b-47b4-91cb-bc134afc764c/chat',
      };
    }
    
    return data;
  } catch (error) {
    console.error('Failed to load chatbot settings:', error);
    return null;
  }
}

/**
 * Aplikuje téma na widget
 */
export function applyTheme(theme: 'light' | 'dark') {
  const root = document.documentElement;
  
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  
  console.log(`🎨 Téma nastaveno na: ${theme}`);
}

/**
 * Detekuje, zda je widget v iframe
 */
export function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
}

/**
 * Získá origin parent window (pro CORS kontrolu)
 */
export function getParentOrigin(): string | null {
  if (!isInIframe()) {
    return null;
  }
  
  try {
    return document.referrer ? new URL(document.referrer).origin : null;
  } catch (e) {
    return null;
  }
}

/**
 * Logování pro widget (s prefikem)
 */
export function widgetLog(message: string, ...args: any[]) {
  console.log(`[Vany Widget] ${message}`, ...args);
}

export function widgetError(message: string, ...args: any[]) {
  console.error(`[Vany Widget] ${message}`, ...args);
}

export function widgetWarn(message: string, ...args: any[]) {
  console.warn(`[Vany Widget] ${message}`, ...args);
}







