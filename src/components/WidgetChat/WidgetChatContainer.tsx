/**
 * Widget Chat Container
 * ============================================================================
 * Container komponenta pro načtení konfigurace a zobrazení Wany Chat
 * Používá PŘESNĚ STEJNÝ modální wrapper jako ChatWidget z MedBase
 * ============================================================================
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { FilteredSanaChat } from '../SanaChat/SanaChat';
import {
  getWidgetConfigFromURL,
  getChatbotSettings,
  applyTheme,
  isInIframe,
  widgetLog,
  widgetError,
  WidgetConfig,
} from '../../services/widgetConfigService';
import { getCurrentUser } from '../../services/customAuthService';
import type { User } from '../../services/customAuthService';
import ChatFeedback, { ChatFeedbackData } from '../ui/ChatFeedback';
import { saveChatFeedback } from '../../services/chatHistoryService';

export const WidgetChatContainer: React.FC = () => {
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [chatbotSettings, setChatbotSettings] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const sessionIdRef = useRef<string>('');

  // Funkce pro skutečné zavření - pošle WIDGET_CLOSE do parenta
  const confirmClose = useCallback(() => {
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'WIDGET_CLOSE' }, '*');
    }
  }, []);

  // Nasloucháme na REQUEST_CLOSE od parenta (když klikne na černý křížek)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'REQUEST_CLOSE') {
        widgetLog('📨 REQUEST_CLOSE přijat od parenta');
        setShowFeedback(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    initializeWidget();
  }, []);

  const initializeWidget = async () => {
    try {
      widgetLog('🚀 Inicializace Wany Chat widgetu...');

      // Check if we're in an iframe
      if (!isInIframe()) {
        widgetLog('⚠️ Widget není v iframe - běží standalone');
      }

      // Load config from URL
      const widgetConfig = getWidgetConfigFromURL();
      setConfig(widgetConfig);
      widgetLog('✅ Config načten:', widgetConfig);

      // Apply theme
      applyTheme(widgetConfig.theme);

      // Check if user is logged in
      const { user } = await getCurrentUser();
      if (user) {
        setCurrentUser(user);
        widgetLog('✅ Přihlášený uživatel:', user.email);
      } else {
        widgetLog('ℹ️ Žádný přihlášený uživatel (anonymní chat)');
      }

      // Load chatbot settings from database for vany_chat
      const settings = await getChatbotSettings('vany_chat');
      if (!settings) {
        throw new Error('Nepodařilo se načíst nastavení chatbota vany_chat');
      }

      setChatbotSettings(settings);
      widgetLog('✅ Chatbot settings načteny:', settings);
      widgetLog('🎯 Chatbot ID:', 'vany_chat');

      setIsLoading(false);
    } catch (err) {
      widgetError('❌ Chyba při inicializaci widgetu:', err);
      setError(err instanceof Error ? err.message : 'Neznámá chyba');
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Načítám Wany Chat...</p>
        </div>
      </div>
    );
  }

  if (error || !config || !chatbotSettings) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center p-8">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Chyba při načítání</h2>
          <p className="text-gray-600">{error || 'Nepodařilo se načíst konfiguraci'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="relative w-[1200px] h-[700px] max-w-[95vw] max-h-[90vh] rounded-xl shadow-2xl transition-all duration-300 ease-in-out overflow-hidden">
        <FilteredSanaChat 
          currentUser={currentUser}
          chatbotId="vany_chat"
          chatbotSettings={chatbotSettings}
          onClose={() => setShowFeedback(true)}
          onSessionReady={(sid) => { sessionIdRef.current = sid; }}
        />
        {showFeedback && (
          <ChatFeedback
            onClose={async (feedback: ChatFeedbackData) => {
              const sid = sessionIdRef.current;
              widgetLog('📝 Feedback odesílán, sessionId:', sid, 'smiley:', feedback.smiley);
              if (sid) {
                const result = await saveChatFeedback(sid, feedback.smiley, feedback.feedbackText);
                if (result.error) {
                  widgetError('❌ Chyba při ukládání feedbacku:', result.error);
                } else {
                  widgetLog('✅ Feedback uložen');
                }
              }
              setShowFeedback(false);
              confirmClose();
            }}
          />
        )}
      </div>
    </div>
  );
};
