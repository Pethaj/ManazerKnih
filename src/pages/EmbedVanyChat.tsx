import { useEffect, useState } from 'react';
import FilteredSanaChat from '../components/SanaChat/SanaChat';
import { supabase } from '../lib/supabase';

/**
 * EmbedVanyChat - Dedikovaná stránka pro embedding Wany Chatu
 * 
 * Tato stránka je určena pro vložení do iframe na webech klientů.
 * Obsahuje POUZE Wany Chat bez jakéhokoliv layoutu MedBase.
 * 
 * Použití u klienta (Bewit web):
 * 
 * HTML:
 * <iframe
 *   id="wany-chat-iframe"
 *   src="https://gr8learn.eu/embed.html"
 *   style="position:fixed;right:24px;bottom:24px;width:1200px;height:700px;border:0;border-radius:16px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);z-index:999999"
 *   allow="clipboard-write"
 * ></iframe>
 * 
 * JavaScript (pošle user data do iframe):
 * <script>
 * const iframe = document.getElementById('wany-chat-iframe');
 * iframe.addEventListener('load', function() {
 *   iframe.contentWindow.postMessage({
 *     type: 'WANY_USER_DATA',
 *     user: {
 *       id: '12345',
 *       email: 'jan@bewit.cz',
 *       firstName: 'Jan',
 *       lastName: 'Novák'
 *     }
 *   }, 'https://gr8learn.eu');
 * });
 * </script>
 */
const EmbedVanyChat = () => {
  const [chatbotSettings, setChatbotSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userContext, setUserContext] = useState<{
    id?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
  }>({});

  useEffect(() => {
    console.log('🔥 EMBED VANY CHAT - Loading settings...');
    
    // 🆕 Naslouchej postMessage od rodiče (klienta) pro user data
    const handleMessage = (event: MessageEvent) => {
      // Bezpečnostní kontrola origin (volitelné)
      // if (event.origin !== 'https://bewit.cz') return;
      
      if (event.data.type === 'WANY_USER_DATA' && event.data.user) {
        console.log('👤 User data přijata z rodiče (Bewit web):', event.data.user);
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
        />
      </div>
    </div>
  );
};

export default EmbedVanyChat;
