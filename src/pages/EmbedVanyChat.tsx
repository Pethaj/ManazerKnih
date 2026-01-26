import { useEffect, useState } from 'react';
import FilteredSanaChat from '../components/SanaChat/SanaChat';
import { supabase } from '../lib/supabase';

/**
 * EmbedVanyChat - Dedikovaná stránka pro embedding Wany Chatu
 * 
 * Tato stránka je určena pro vložení do iframe na webech klientů.
 * Obsahuje POUZE Wany Chat bez jakéhokoliv layoutu MedBase.
 * 
 * Použití u klienta:
 * <iframe
 *   src="https://gr8learn.eu/embed.html?userId=123&userName=Jan%20Novak&userEmail=jan@example.com"
 *   style="position:fixed;right:24px;bottom:24px;width:1200px;height:700px;border:0;border-radius:16px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);z-index:999999"
 *   allow="clipboard-write"
 * ></iframe>
 * 
 * URL parametry:
 * - userId: ID uživatele z webu klienta (povinný)
 * - userName: Jméno uživatele (nepovinný)
 * - userEmail: Email uživatele (nepovinný)
 */
const EmbedVanyChat = () => {
  const [chatbotSettings, setChatbotSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userContext, setUserContext] = useState<{
    userId?: string;
    userName?: string;
    userEmail?: string;
  }>({});

  useEffect(() => {
    console.log('🔥 EMBED VANY CHAT - Loading settings...');
    
    // 🆕 Načteme user context z URL parametrů
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');
    const userName = urlParams.get('userName');
    const userEmail = urlParams.get('userEmail');
    
    if (userId) {
      console.log('👤 User context from URL:', { userId, userName, userEmail });
      setUserContext({ userId, userName, userEmail });
    } else {
      console.warn('⚠️ No userId in URL - user tracking will not work');
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
          currentUser={userContext.userId ? {
            id: userContext.userId,
            email: userContext.userEmail || 'unknown@gr8learn.eu',
            firstName: userContext.userName?.split(' ')[0] || 'Unknown',
            lastName: userContext.userName?.split(' ').slice(1).join(' ') || '',
            role: 'spravce' as any, // External user - role není důležitá pro embed
            createdAt: new Date().toISOString()
          } : undefined}
        />
      </div>
    </div>
  );
};

export default EmbedVanyChat;

