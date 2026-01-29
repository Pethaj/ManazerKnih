import { useEffect, useState } from 'react';
import FilteredSanaChat from '../components/SanaChat/SanaChat';
import { supabase } from '../lib/supabase';

/**
 * EmbedVanyChat - Dedikovaná stránka pro embedding Wany Chatu
 * 
 * Tato stránka je určena pro vložení do iframe na webech klientů.
 * Obsahuje POUZE Wany Chat bez jakéhokoliv layoutu MedBase.
 * 
 * ========================================
 * POUŽITÍ U KLIENTA (2 ZPŮSOBY):
 * ========================================
 * 
 * ZPŮSOB 1 - Data-* atributy (DOPORUČENO - jednodušší):
 * 
 * <iframe
 *   id="wany-chat-iframe"
 *   src="https://gr8learn.eu/embed.html"
 *   data-user-id="123"
 *   data-firstname="Jan"
 *   data-lastname="Novák"
 *   data-email="jan@firma.cz"
 *   data-position="Manager"
 *   style="width:100%;height:100%;border:0;"
 * ></iframe>
 * 
 * ✅ Výhody: Jednoduchý, žádný JavaScript, funguje okamžitě
 * ⚠️  Nevýhody: Data viditelná v HTML source
 * 
 * ---
 * 
 * ZPŮSOB 2 - PostMessage (bezpečnější):
 * 
 * <iframe
 *   id="wany-chat-iframe"
 *   src="https://gr8learn.eu/embed.html"
 *   style="width:100%;height:100%;border:0;"
 * ></iframe>
 * 
 * <script>
 *   const iframe = document.getElementById('wany-chat-iframe');
 *   iframe.addEventListener('load', function() {
 *     iframe.contentWindow.postMessage({
 *       type: 'USER_DATA',
 *       user: {
 *         id: '123',
 *         firstName: 'Jan',
 *         lastName: 'Novák',
 *         email: 'jan@firma.cz',
 *         position: 'Manager'
 *       }
 *     }, 'https://gr8learn.eu');
 *   });
 * </script>
 * 
 * ✅ Výhody: Bezpečnější, data nejsou v HTML
 * ⚠️  Nevýhody: Vyžaduje JavaScript
 * 
 * ---
 * 
 * KOMBINACE OBOU ZPŮSOBŮ:
 * - Můžete použít data-* atributy jako výchozí hodnoty
 * - A postMessage je může přepsat/aktualizovat později
 * 
 * ========================================
 * CO SE DĚJE S DATY:
 * ========================================
 * 
 * - Data se ukládají do Supabase: chat_messages.message_data.user_info
 * - Jsou dostupná v N8N webhooku
 * - Filtrovatelná v SQL queries
 * - NEJSOU šifrovaná - neposílejte citlivá data!
 * 
 * Více info: EMBED_KLIENT_JEDNODUCHY.md
 */
const EmbedVanyChat = () => {
  const [chatbotSettings, setChatbotSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userContext, setUserContext] = useState<{
    id?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    position?: string;
    tokenEshop?: string;  // 🆕 E-shop token z Bewit webu
  }>({});

  useEffect(() => {
    console.log('🔥 EMBED VANY CHAT - Loading settings...');
    
    // 🆕 Načti data přímo z data-* atributů iframe (pokud existují)
    const iframe = window.frameElement as HTMLIFrameElement | null;
    if (iframe) {
      const userData = {
        id: iframe.dataset.userId || '',
        email: iframe.dataset.email || '',
        firstName: iframe.dataset.firstname || '',
        lastName: iframe.dataset.lastname || '',
        position: iframe.dataset.position || '',
        tokenEshop: iframe.dataset.tokenEshop || ''  // 🆕 E-shop token
      };
      
      // Pokud nějaké data existují, nastav je okamžitě
      if (userData.id || userData.email) {
        console.log('📋 User data načtena z data-* atributů iframe:', userData);
        setUserContext(userData);
      } else {
        console.log('⚠️ Žádná user data v data-* atributech nenalezena');
      }
    } else {
      console.log('⚠️ window.frameElement není dostupný (možná není v iframe)');
    }
    
    // 🚀 READY SIGNÁL: Pošli rodičovskému oknu, že iframe je připraven
    const sendReadySignal = () => {
      if (window.parent !== window) {
        console.log('📤 Odesílám IFRAME_READY signál rodičovskému oknu...');
        window.parent.postMessage({ type: 'IFRAME_READY' }, '*');
        console.log('✅ IFRAME_READY signál odeslán');
      }
    };
    
    // 🆕 Naslouchej postMessage od rodiče (fallback nebo override pro data-* atributy)
    const handleMessage = (event: MessageEvent) => {
      // 🔍 DEBUG: Loguj VŠECHNY příchozí postMessage
      console.log('📨 PostMessage přijata:', {
        origin: event.origin,
        type: event.data?.type,
        hasUser: !!event.data?.user
      });
      
      // 🔒 Bezpečnostní kontrola originu - přijímej jen z důvěryhodných domén
      const allowedOrigins = [
        'https://www.bewit.cz',
        'https://bewit.cz',
        'https://mybewit.com',  // Bewit intelligence
        'https://www.mybewit.com',
        // Pro testování (odstraň v produkci):
        'http://localhost:3000',
        'http://localhost:5173',  // Vite default
        'http://localhost:5174',  // Tvůj custom
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
      ];
      
      // Pokud origin není v allowlistu, ignoruj zprávu
      if (!allowedOrigins.includes(event.origin)) {
        console.warn('⚠️ PostMessage ODMÍTNUTA - nepovolený origin:', event.origin);
        console.warn('   Data zprávy:', event.data);
        console.warn('   Povolené originy:', allowedOrigins);
        return;
      }
      
      // Validace struktury dat
      if (event.data.type === 'USER_DATA' && event.data.user) {
        console.log('✅ PostMessage PŘIJATA z důvěryhodného originu:', event.origin);
        console.log('👤 User data:', event.data.user);
        setUserContext(event.data.user);
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    const loadChatbotSettings = async () => {
      try {
        // Načteme nastavení Wany Chatu z databáze (BEZ autentizace - public access)
        const { data, error } = await supabase
          .from('chatbot_settings')
          .select('*')
          .eq('chatbot_id', 'vany_chat')
          .single();

        if (error || !data) {
          console.warn('⚠️ Nelze načíst nastavení z DB, používám fallback:', error?.message);
          // Použijeme fallback nastavení - VŽDY musí fungovat
          setChatbotSettings({
            chatbot_id: 'vany_chat',
            n8n_webhook_url: 'https://n8n.sanaai.cz/webhook/chat-vany',
            system_prompt: 'Jsi AI asistent Sana AI. Pomáháš uživatelům s informacemi o léčbě a produktech BEWIT.',
            name: 'Wany Chat',
            description: 'AI chatbot pro podporu a informace'
          });
        } else {
          console.log('✅ Chatbot settings loaded from DB:', data);
          // 🔒 Pro embed verzi vynucujeme prázdné štítky (skrytí sekce Štítky)
          const modifiedSettings = {
            ...data,
            allowed_labels: [] // Vždy prázdné - štítky nebudou viditelné u klienta
          };
          console.log('🔒 EMBED: Vynucuji prázdné allowed_labels:', modifiedSettings.allowed_labels);
          console.log('🔒 EMBED: Celé nastavení:', modifiedSettings);
          setChatbotSettings(modifiedSettings);
        }
      } catch (err) {
        console.warn('⚠️ Exception při načítání nastavení, používám fallback:', err);
        // Fallback nastavení - zajistí že chat VŽDY funguje
        setChatbotSettings({
          chatbot_id: 'vany_chat',
          n8n_webhook_url: 'https://n8n.sanaai.cz/webhook/chat-vany',
          system_prompt: 'Jsi AI asistent Sana AI. Pomáháš uživatelům s informacemi o léčbě a produktech BEWIT.',
          name: 'Wany Chat',
          description: 'AI chatbot pro podporu a informace'
        });
      } finally {
        setIsLoading(false);
        // 🚀 Pošli READY signál AŽ PO dokončení načítání
        setTimeout(() => {
          sendReadySignal();
        }, 500); // Malý delay pro jistotu, že React dokončil render
      }
    };

    loadChatbotSettings();
    
    // Cleanup
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-bewit-gray">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bewit-blue mx-auto mb-4"></div>
          <p className="text-gray-600">Načítám Wany Chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen overflow-hidden">
      {/* 
        Modální wrapper - stejný jako v ChatWidget.tsx 
        Ale místo fixed inset-0 používáme celou obrazovku (w-full h-screen)
      */}
      <div className="w-full h-full">
        <FilteredSanaChat 
          chatbotId="vany_chat"
          chatbotSettings={chatbotSettings}
          onClose={undefined}
          currentUser={userContext.id ? {
            id: userContext.id,
            email: userContext.email || '',
            firstName: userContext.firstName || '',
            lastName: userContext.lastName || '',
            role: 'spravce' as any,
            createdAt: new Date().toISOString()
          } : undefined}
          externalUserInfo={
            userContext.id || userContext.email ? {
              external_user_id: userContext.id,
              first_name: userContext.firstName,
              last_name: userContext.lastName,
              email: userContext.email,
              position: userContext.position,
              token_eshop: userContext.tokenEshop  // 🆕 E-shop token
            } : undefined
          }
        />
      </div>
    </div>
  );
};

export default EmbedVanyChat;
