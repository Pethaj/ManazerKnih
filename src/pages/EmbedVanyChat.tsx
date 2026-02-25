import { useEffect, useState, useRef } from 'react';
import FilteredSanaChat from '../components/SanaChat/SanaChat';
import { supabase } from '../lib/supabase';
import ChatFeedback, { ChatFeedbackData } from '../components/ui/ChatFeedback';
import { saveChatFeedback } from '../services/chatHistoryService';

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
  const [showFeedback, setShowFeedback] = useState(false);
  const sessionIdRef = useRef<string>('');

  useEffect(() => {
    
    // ✅ PRVNÍ: Zkontroluj jestli už data čekají v globální cache (z early listeneru v HTML)
    if (window.__PENDING_USER_DATA__) {
      setUserContext({
        id: String(window.__PENDING_USER_DATA__.id || ''),
        email: window.__PENDING_USER_DATA__.email || '',
        firstName: window.__PENDING_USER_DATA__.firstName || '',
        lastName: window.__PENDING_USER_DATA__.lastName || '',
        position: window.__PENDING_USER_DATA__.position || '',
        tokenEshop: window.__PENDING_USER_DATA__.tokenEshop || ''
      });
      window.__PENDING_USER_DATA__ = null; // Vyčisti cache
    } else {
    }
    
    const loadChatbotSettings = async () => {
      try {
        // Načteme nastavení Wany Chatu z databáze (BEZ autentizace - public access)
        const { data, error } = await supabase
          .from('chatbot_settings')
          .select('*')
          .eq('chatbot_id', 'vany_chat')
          .single();

        if (error || !data) {
          // Použijeme fallback nastavení - VŽDY musí fungovat
          setChatbotSettings({
            chatbot_id: 'vany_chat',
            n8n_webhook_url: 'https://n8n.sanaai.cz/webhook/chat-vany',
            system_prompt: 'Jsi AI asistent Sana AI. Pomáháš uživatelům s informacemi o léčbě a produktech BEWIT.',
            name: 'Wany Chat',
            description: 'AI chatbot pro podporu a informace'
          });
        } else {
          // 🔒 Pro embed verzi vynucujeme prázdné štítky (skrytí sekce Štítky)
          const modifiedSettings = {
            ...data,
            allowed_labels: [] // Vždy prázdné - štítky nebudou viditelné u klienta
          };
          setChatbotSettings(modifiedSettings);
        }
      } catch (err) {
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
      }
    };

    loadChatbotSettings();
  }, []);

  // 🔥 SAMOSTATNÝ useEffect PRO LISTENER - běží pořád, ne jen při mount
  useEffect(() => {
    // 🆕 Listener pro postMessage - přijímá USER_DATA kdykoliv
    const handleMessage = (event: MessageEvent) => {
      // Validace struktury dat
      if (event.data.type === 'USER_DATA' && event.data.user) {
        
        // 💾 NOVÉ: Uložit do localStorage pro pozdější použití
        try {
          localStorage.setItem('BEWIT_USER_DATA', JSON.stringify(event.data.user));
        } catch (e) {
        }
        
        setUserContext({
          id: String(event.data.user.id || ''),
          email: event.data.user.email || '',
          firstName: event.data.user.firstName || '',
          lastName: event.data.user.lastName || '',
          position: event.data.user.position || '',
          tokenEshop: event.data.user.tokenEshop || ''
        });
      }
    };
    
    // 🔥 Zaregistruj listener
    window.addEventListener('message', handleMessage);
    
    // ℹ️ IFRAME_READY se posílá pouze z early scriptu v embed.html (ne zde z Reactu)
    // Tím se zabrání duplicitnímu posílání READY signálu
    
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
        setUserContext(userData);
      } else {
      }
    } else {
    }
    
    // Cleanup - odregistruj listener při unmount
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // 🎯 DEBUG: Zobraz user data vždy když se změní userContext
  useEffect(() => {
    // Vytvoř externalUserInfo objekt
    const externalUserInfo = userContext.id || userContext.email ? {
      external_user_id: userContext.id,
      first_name: userContext.firstName,
      last_name: userContext.lastName,
      email: userContext.email,
      position: userContext.position,
      token_eshop: userContext.tokenEshop
    } : undefined;

    // Zobraz POUZE pokud jsou nějaká data
    if (externalUserInfo) {
    }
  }, [userContext]); // Spustí se POUZE když se userContext změní

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

  // 🔍 DIAGNOSTIKA userContext před renderem
  const externalUserInfo = userContext.id || userContext.email ? {
    external_user_id: userContext.id,
    first_name: userContext.firstName,
    last_name: userContext.lastName,
    email: userContext.email,
    position: userContext.position,
    token_eshop: userContext.tokenEshop  // 🆕 E-shop token
  } : undefined;


  const handleClose = () => setShowFeedback(true);

  const handleFeedbackClose = async (feedback: ChatFeedbackData) => {
    const sid = sessionIdRef.current;
    if (sid) {
      await saveChatFeedback(sid, feedback.smiley, feedback.feedbackText);
    }
    setShowFeedback(false);
    // Informuj parenta o zavření (parent může, ale nemusí naslouchat)
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'WIDGET_CLOSE' }, '*');
    }
  };

  return (
    <div className="w-full h-screen overflow-hidden relative">
      <div className="w-full h-full">
        <FilteredSanaChat 
          key={userContext.id || userContext.email || 'anonymous'}
          chatbotId="vany_chat"
          chatbotSettings={chatbotSettings}
          onClose={handleClose}
          onSessionReady={(sid) => { sessionIdRef.current = sid; }}
          currentUser={undefined}
          externalUserInfo={externalUserInfo}
        />
      </div>
      {showFeedback && (
        <ChatFeedback onClose={handleFeedbackClose} />
      )}
    </div>
  );
};

export default EmbedVanyChat;
