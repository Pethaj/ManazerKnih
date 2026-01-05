/**
 * Vany Chat Widget Loader
 * ============================================================================
 * Embedovatelný chatbot widget pro Bewit klienty
 * 
 * Použití:
 * <script src="https://vase-domena.cz/widgets/vany-chat-widget.js" 
 *         data-chatbot-id="vany_chat"
 *         data-theme="light"
 *         data-position="bottom-right">
 * </script>
 * 
 * Parametry:
 * - data-chatbot-id: ID chatbota (default: "vany_chat")
 * - data-theme: Téma (light/dark, default: "light")
 * - data-position: Pozice widgetu (bottom-right/bottom-left/top-right/top-left)
 * - data-greeting: Vlastní uvítací zpráva
 * - data-width: Šířka widgetu v px (default: 400)
 * - data-height: Výška widgetu v px (default: 600)
 * ============================================================================
 */

(function() {
  'use strict';
  
  // Získání reference na aktuální script tag
  const script = document.currentScript || document.querySelector('script[src*="vany-chat-widget"]');
  
  if (!script) {
    console.error('Vany Chat Widget: Nelze najít script tag');
    return;
  }
  
  // Načtení konfigurace z data atributů
  const config = {
    chatbotId: script.getAttribute('data-chatbot-id') || 'vany_chat',
    theme: script.getAttribute('data-theme') || 'light',
    position: script.getAttribute('data-position') || 'bottom-right',
    greeting: script.getAttribute('data-greeting') || null,
    width: parseInt(script.getAttribute('data-width')) || 400,
    height: parseInt(script.getAttribute('data-height')) || 600,
  };
  
  // Detekce base URL (pro dev vs production)
  const scriptSrc = script.src;
  const baseUrl = scriptSrc.substring(0, scriptSrc.lastIndexOf('/widgets/'));
  
  console.log('🤖 Vany Chat Widget inicializován:', config);
  console.log('📍 Base URL:', baseUrl);
  
  // Vytvoření iframe elementu
  const iframe = document.createElement('iframe');
  iframe.id = 'vany-chat-widget-iframe';
  iframe.title = 'Vany Chat Widget';
  iframe.setAttribute('frameborder', '0');
  iframe.setAttribute('allowtransparency', 'true');
  iframe.setAttribute('allow', 'clipboard-write');
  
  // Sestavení URL s parametry
  const widgetUrl = new URL(`${baseUrl}/widgets/widget-chat.html`);
  widgetUrl.searchParams.set('chatbot', config.chatbotId);
  widgetUrl.searchParams.set('theme', config.theme);
  if (config.greeting) {
    widgetUrl.searchParams.set('greeting', config.greeting);
  }
  
  iframe.src = widgetUrl.toString();
  
  // Pozicování podle konfigurace
  const positionStyles = {
    'bottom-right': 'bottom: 20px; right: 20px;',
    'bottom-left': 'bottom: 20px; left: 20px;',
    'top-right': 'top: 20px; right: 20px;',
    'top-left': 'top: 20px; left: 20px;',
  };
  
  // Aplikace stylů - SKRYTO ve výchozím stavu
  iframe.style.cssText = `
    position: fixed;
    ${positionStyles[config.position] || positionStyles['bottom-right']}
    width: ${config.width}px;
    height: ${config.height}px;
    max-width: calc(100vw - 40px);
    max-height: calc(100vh - 40px);
    border: none;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    z-index: 999999;
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 0.3s ease, transform 0.3s ease;
    display: none;
  `;
  
  // Přidání iframe do stránky
  document.body.appendChild(iframe);
  
  // Připraven, ale nezobrazovat automaticky
  iframe.addEventListener('load', function() {
    console.log('✅ Vany Chat Widget načten a připraven (skrytý)');
  });
  
  // PostMessage komunikace mezi parent window a iframe
  window.addEventListener('message', function(event) {
    // Bezpečnostní kontrola origin (pro produkci přidat whitelist)
    if (event.source !== iframe.contentWindow) {
      return;
    }
    
    const data = event.data;
    
    // Zpracování různých typů zpráv z widgetu
    switch (data.type) {
      case 'WIDGET_READY':
        console.log('✅ Vany Chat Widget připraven');
        break;
        
      case 'WIDGET_RESIZE':
        if (data.width && data.height) {
          iframe.style.width = data.width + 'px';
          iframe.style.height = data.height + 'px';
        }
        break;
        
      case 'WIDGET_CLOSE':
        // Budoucí funkce pro minimalizaci/zavření
        iframe.style.display = 'none';
        break;
        
      case 'WIDGET_OPEN':
        iframe.style.display = 'block';
        break;
        
      default:
        console.log('📨 Zpráva z widgetu:', data);
    }
  });
  
  // Globální API pro ovládání widgetu (pro pokročilé použití)
  window.VanyChatWidget = {
    config: config,
    iframe: iframe,
    
    open: function() {
      iframe.style.display = 'block';
      // Animace zobrazení
      setTimeout(function() {
        iframe.style.opacity = '1';
        iframe.style.transform = 'translateY(0)';
      }, 10);
      iframe.contentWindow.postMessage({ type: 'PARENT_OPEN' }, '*');
    },
    
    close: function() {
      // Animace skrytí
      iframe.style.opacity = '0';
      iframe.style.transform = 'translateY(20px)';
      setTimeout(function() {
        iframe.style.display = 'none';
      }, 300);
      iframe.contentWindow.postMessage({ type: 'PARENT_CLOSE' }, '*');
    },
    
    toggle: function() {
      if (iframe.style.display === 'none' || !iframe.style.display) {
        this.open();
      } else {
        this.close();
      }
    },
    
    sendMessage: function(message) {
      iframe.contentWindow.postMessage({ 
        type: 'PARENT_SEND_MESSAGE', 
        message: message 
      }, '*');
    },
    
    setTheme: function(theme) {
      config.theme = theme;
      iframe.contentWindow.postMessage({ 
        type: 'PARENT_SET_THEME', 
        theme: theme 
      }, '*');
    }
  };
  
  console.log('🎯 Vany Chat Widget API dostupné jako window.VanyChatWidget');
  
  // Responsive handling
  function handleResize() {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      iframe.style.width = 'calc(100vw - 20px)';
      iframe.style.height = 'calc(100vh - 20px)';
      iframe.style.bottom = '10px';
      iframe.style.right = '10px';
      iframe.style.left = '10px';
      iframe.style.borderRadius = '8px';
    } else {
      iframe.style.width = config.width + 'px';
      iframe.style.height = config.height + 'px';
      iframe.style.cssText = iframe.style.cssText.replace(/left:.*?;/, '');
      const posStyle = positionStyles[config.position] || positionStyles['bottom-right'];
      iframe.style.cssText += posStyle;
    }
  }
  
  window.addEventListener('resize', handleResize);
  handleResize();
  
})();

