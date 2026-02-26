import { useEffect, useState, useRef } from 'react';
import FilteredSanaChat from '../components/SanaChat/SanaChat';
import { supabase } from '../lib/supabase';
import ChatFeedback, { ChatFeedbackData } from '../components/ui/ChatFeedback';
import { saveChatFeedback } from '../services/chatHistoryService';

/**
 * EmbedEOSmesi - Dedikovaná stránka pro embedding EO Směsi Chatu
 * 
 * Tato stránka je určena pro vložení do iframe na webech klientů.
 * Obsahuje POUZE EO Směsi Chat bez jakéhokoliv layoutu MedBase.
 * 
 * ========================================
 * POUŽITÍ U KLIENTA (2 ZPŮSOBY):
 * ========================================
 * 
 * ZPŮSOB 1 - Data-* atributy (DOPORUČENO - jednodušší):
 * 
 * <iframe
 *   id="eo-smesi-chat-iframe"
 *   src="https://gr8learn.eu/embed-eo-smesi.html"
 *   data-user-id="123"
 *   data-firstname="Jan"
 *   data-lastname="Novák"
 *   data-email="jan@firma.cz"
 *   data-position="Manager"
 *   data-token-eshop="abc123xyz"
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
 *   id="eo-smesi-chat-iframe"
 *   src="https://gr8learn.eu/embed-eo-smesi.html"
 *   style="width:100%;height:100%;border:0;"
 * ></iframe>
 * 
 * <script>
 *   const iframe = document.getElementById('eo-smesi-chat-iframe');
 *   iframe.addEventListener('load', function() {
 *     iframe.contentWindow.postMessage({
 *       type: 'USER_DATA',
 *       user: {
 *         id: '123',
 *         firstName: 'Jan',
 *         lastName: 'Novák',
 *         email: 'jan@firma.cz',
 *         position: 'Manager',
 *         tokenEshop: 'abc123xyz'
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
 * Více info: EMBED_EO_SMESI_DEPLOYMENT_GUIDE.md
 */
const EmbedEOSmesi = () => {
  const [chatbotSettings, setChatbotSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [showFeedback, setShowFeedback] = useState(false);
  const sessionIdRef = useRef<string>('');
  const [userContext, setUserContext] = useState<{
    id?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    position?: string;
    tokenEshop?: string;  // 🆕 E-shop token z Bewit webu
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
      window.__PENDING_USER_DATA__ = null; // Vyčisti cache
    } else {
    }
    
    const loadChatbotSettings = async () => {
      try {
        // Načteme nastavení EO Směsi Chatu z databáze (BEZ autentizace - public access)
        const { data, error } = await supabase
          .from('chatbot_settings')
          .select('*')
          .eq('chatbot_id', 'eo_smesi')
          .single();

        if (error || !data) {
          // Použijeme fallback nastavení - VŽDY musí fungovat
          setChatbotSettings({
            chatbot_id: 'eo_smesi',
            webhook_url: 'https://n8n.srv980546.hstgr.cloud/webhook/20826009-b007-46b2-8d90-0c461113d263/chat',
            system_prompt: 'Jsi AI asistent specializující se na esenciální oleje a směsi BEWIT. Pomáháš uživatelům s informacemi o produktech a jejich použití.',
            name: 'EO Směsi Chat',
            description: 'AI chatbot pro podporu a informace o esenciálních olejích'
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
          chatbot_id: 'eo_smesi',
          webhook_url: 'https://n8n.srv980546.hstgr.cloud/webhook/20826009-b007-46b2-8d90-0c461113d263/chat',
          system_prompt: 'Jsi AI asistent specializující se na esenciální oleje a směsi BEWIT. Pomáháš uživatelům s informacemi o produktech a jejich použití.',
          name: 'EO Směsi Chat',
          description: 'AI chatbot pro podporu a informace o esenciálních olejích'
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadChatbotSettings();
  }, []);

  // 🔥 SAMOSTATNÝ useEffect PRO LISTENER - běží pořád, ne jen při mount
  useEffect(() => {
    // 🆕 Listener pro postMessage - přijímá USER_DATA a REQUEST_CLOSE
    const handleMessage = (event: MessageEvent) => {
      // Otevři feedback při REQUEST_CLOSE (klik na černý křížek mimo iframe)
      if (event.data?.type === 'REQUEST_CLOSE') {
        setShowFeedback(true);
        // Potvrd parentovi že zpráva dorazila - zruší 6s fallback timeout
        if (window.parent !== window) {
          window.parent.postMessage({ type: 'CLOSE_ACKNOWLEDGED' }, '*');
        }
        return;
      }
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
    
    // ℹ️ IFRAME_READY se posílá pouze z early scriptu v embed-eo-smesi.html (ne zde z Reactu)
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
          <p className="text-gray-600">Načítám EO Směsi Chat...</p>
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


  const handleAcceptDisclaimer = () => {
    setShowDisclaimer(false);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Disclaimer popup - zobrazí se při prvním spuštění chatu */}
      {showDisclaimer && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.55)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '40px 36px 32px',
            maxWidth: '520px',
            width: '100%',
            boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
            fontFamily: 'Inter, sans-serif'
          }}>
            <div style={{
              width: '72px',
              height: '72px',
              background: 'linear-gradient(135deg, #5d7fa3 0%, #3b5f85 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px'
            }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>

            <h2 style={{
              margin: '0 0 24px',
              fontSize: '22px',
              fontWeight: '700',
              color: '#1a1a1a',
              textAlign: 'center'
            }}>
              Upozornění
            </h2>

            <div style={{
              background: '#f8f9fb',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '28px',
              fontSize: '14px',
              color: '#333',
              lineHeight: '1.7'
            }}>
              <p style={{ margin: 0 }}>
                Tento nástroj slouží výhradně k vzdělávacím a orientačním účelům a nenahrazuje odborné lékařské doporučení ani individuální posouzení. V případě obtíží se vždy obraťte na kvalifikovaného odborníka. Chatbot je v testovací verzi a může obsahovat nepřesnosti.
              </p>
            </div>

            <button
              type="button"
              onClick={handleAcceptDisclaimer}
              style={{
                width: '100%',
                padding: '14px 24px',
                fontSize: '16px',
                fontWeight: '700',
                color: 'white',
                background: 'linear-gradient(135deg, #5d7fa3 0%, #3b5f85 100%)',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
                transition: 'opacity 0.2s',
                boxShadow: '0 4px 16px rgba(93,127,163,0.4)'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              Rozumím a pokračuji
            </button>
          </div>
        </div>
      )}


      <div className="w-full h-full">
        <FilteredSanaChat 
          key={userContext.id || userContext.email || 'anonymous'}
          chatbotId="eo_smesi"
          chatbotSettings={chatbotSettings}
          onClose={() => {
            if (window.parent !== window) {
              window.parent.postMessage({ type: 'WIDGET_CLOSE' }, '*');
            }
          }}
          onSessionReady={(sid) => { sessionIdRef.current = sid; }}
          currentUser={undefined}
          externalUserInfo={externalUserInfo}
        />
      </div>
      {showFeedback && (
        <ChatFeedback
          onClose={async (feedback: ChatFeedbackData) => {
            const sid = sessionIdRef.current;
            if (sid) {
              await saveChatFeedback(sid, feedback.smiley, feedback.feedbackText);
            }
            setShowFeedback(false);
            if (window.parent !== window) {
              window.parent.postMessage({ type: 'WIDGET_CLOSE' }, '*');
            }
          }}
        />
      )}
    </div>
  );
};

export default EmbedEOSmesi;
