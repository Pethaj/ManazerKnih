import { useEffect, useState } from 'react';
import FilteredSanaChat from '../components/SanaChat/SanaChat';
import { supabase } from '../lib/supabase';

/**
 * EmbedUniversalChat - Dedikovaná stránka pro embedding Chatbota Universal
 * 
 * Tato stránka je určena pro vložení do iframe na webech klientů.
 * Obsahuje POUZE Universal Chat bez jakéhokoliv layoutu MedBase.
 * 
 * ========================================
 * POUŽITÍ U KLIENTA (2 ZPŮSOBY):
 * ========================================
 * 
 * ZPŮSOB 1 - Data-* atributy (DOPORUČENO - jednodušší):
 * 
 * <iframe
 *   id="universal-chat-iframe"
 *   src="https://gr8learn.eu/embed-universal.html"
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
 *   id="universal-chat-iframe"
 *   src="https://gr8learn.eu/embed-universal.html"
 *   style="width:100%;height:100%;border:0;"
 * ></iframe>
 * 
 * <script>
 *   const iframe = document.getElementById('universal-chat-iframe');
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
 */
const EmbedUniversalChat = () => {
  const [chatbotSettings, setChatbotSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userContext, setUserContext] = useState<{
    id?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    position?: string;
    tokenEshop?: string;
  }>({});

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
      window.__PENDING_USER_DATA__ = null;
    }

    const loadChatbotSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('chatbot_settings')
          .select('*')
          .eq('chatbot_id', 'universal_chat')
          .single();

        if (error || !data) {
          setChatbotSettings({
            chatbot_id: 'universal_chat',
            webhook_url: 'https://n8n.srv980546.hstgr.cloud/webhook/ca8f84c6-f3af-4a98-ae34-f8b1e031a481/chat',
            book_database: true,
            system_prompt: 'Jsi univerzální AI asistent. Pomáháš uživatelům s jejich dotazy.',
            name: 'Chatbot Universal',
            description: 'Univerzální AI chatbot'
          });
        } else {
          const modifiedSettings = {
            ...data,
            allowed_labels: []
          };
          setChatbotSettings(modifiedSettings);
        }
      } catch (err) {
        setChatbotSettings({
          chatbot_id: 'universal_chat',
          webhook_url: 'https://n8n.srv980546.hstgr.cloud/webhook/ca8f84c6-f3af-4a98-ae34-f8b1e031a481/chat',
          book_database: true,
          system_prompt: 'Jsi univerzální AI asistent. Pomáháš uživatelům s jejich dotazy.',
          name: 'Chatbot Universal',
          description: 'Univerzální AI chatbot'
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadChatbotSettings();
  }, []);

  // Samostatný useEffect pro listener - běží pořád, ne jen při mount
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'USER_DATA' && event.data.user) {
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

    window.addEventListener('message', handleMessage);

    // Načti data přímo z data-* atributů iframe (pokud existují)
    const iframe = window.frameElement as HTMLIFrameElement | null;
    if (iframe) {
      const userData = {
        id: iframe.dataset.userId || '',
        email: iframe.dataset.email || '',
        firstName: iframe.dataset.firstname || '',
        lastName: iframe.dataset.lastname || '',
        position: iframe.dataset.position || '',
        tokenEshop: iframe.dataset.tokenEshop || ''
      };

      if (userData.id || userData.email) {
        setUserContext(userData);
      }
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-bewit-gray">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bewit-blue mx-auto mb-4"></div>
          <p className="text-gray-600">Načítám Chatbot Universal...</p>
        </div>
      </div>
    );
  }

  const externalUserInfo = userContext.id || userContext.email ? {
    external_user_id: userContext.id,
    first_name: userContext.firstName,
    last_name: userContext.lastName,
    email: userContext.email,
    position: userContext.position,
    token_eshop: userContext.tokenEshop
  } : undefined;

  return (
    <div className="w-full h-screen overflow-hidden">
      <div className="w-full h-full">
        <FilteredSanaChat
          key={userContext.id || userContext.email || 'anonymous'}
          chatbotId="universal_chat"
          chatbotSettings={chatbotSettings}
          onClose={undefined}
          currentUser={undefined}
          externalUserInfo={externalUserInfo}
        />
      </div>
    </div>
  );
};

export default EmbedUniversalChat;
