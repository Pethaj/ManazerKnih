import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import GlobalLimitSettings from './GlobalLimitSettings';
import ChatMessagesDashboard from './ChatMessagesDashboard';

interface ChatbotLimitInfo {
  chatbot_id: string;
  chatbot_name: string;
  daily_limit: number | null;
  current_count: number;
  reset_at: string;
  percentage: number;
  status: 'ok' | 'moderate' | 'warning' | 'exceeded' | 'unlimited';
}

const MessageLimitsDashboard: React.FC = () => {
  const [chatbotLimits, setChatbotLimits] = useState<ChatbotLimitInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'warning' | 'exceeded'>('all');

  useEffect(() => {
    loadAllLimits();
  }, []);

  const loadAllLimits = async () => {
    setLoading(true);
    
    try {
      // Načti všechny limity kromě globálního
      const { data: limits, error: limitsError } = await supabase
        .from('message_limits')
        .select('*')
        .not('chatbot_id', 'is', null);

      if (limitsError) throw limitsError;

      // Načti informace o chatbotech
      const { data: chatbots, error: chatbotsError } = await supabase
        .from('chatbot_settings')
        .select('chatbot_id, chatbot_name');

      if (chatbotsError) throw chatbotsError;

      // Spojit data
      const combined: ChatbotLimitInfo[] = (limits || []).map(limit => {
        const chatbot = chatbots?.find(c => c.chatbot_id === limit.chatbot_id);
        const percentage = limit.daily_limit 
          ? Math.round((limit.current_count / limit.daily_limit) * 100)
          : 0;

        let status: ChatbotLimitInfo['status'] = 'unlimited';
        if (limit.daily_limit !== null) {
          if (percentage >= 100) status = 'exceeded';
          else if (percentage >= 80) status = 'warning';
          else if (percentage >= 50) status = 'moderate';
          else status = 'ok';
        }

        return {
          chatbot_id: limit.chatbot_id,
          chatbot_name: chatbot?.chatbot_name || limit.chatbot_id,
          daily_limit: limit.daily_limit,
          current_count: limit.current_count,
          reset_at: limit.reset_at,
          percentage,
          status
        };
      });

      // Seřaď podle procenta využití (nejvyšší první)
      combined.sort((a, b) => b.percentage - a.percentage);

      setChatbotLimits(combined);
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: ChatbotLimitInfo['status']) => {
    switch (status) {
      case 'exceeded': return 'bg-red-100 border-red-300 text-red-800';
      case 'warning': return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'moderate': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'ok': return 'bg-green-100 border-green-300 text-green-800';
      case 'unlimited': return 'bg-gray-100 border-gray-300 text-gray-600';
    }
  };

  const getStatusIcon = (status: ChatbotLimitInfo['status']) => {
    switch (status) {
      case 'exceeded': return '!';
      case 'warning': return '!';
      case 'moderate': return '·';
      case 'ok': return '✓';
      case 'unlimited': return '∞';
    }
  };

  const filteredChatbots = chatbotLimits.filter(chatbot => {
    if (filter === 'all') return true;
    if (filter === 'warning') return chatbot.status === 'warning' || chatbot.status === 'moderate';
    if (filter === 'exceeded') return chatbot.status === 'exceeded';
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">Načítám limity...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <button
          onClick={loadAllLimits}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Obnovit
        </button>
      </div>

      {/* Sekce: Denní limity zpráv - kompaktní grid */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Denní limity zpráv</h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Globální limit - 1/3 šířky */}
          <div>
            <GlobalLimitSettings />
          </div>

          {/* Filtry - 2/3 šířky */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="mb-3">
                <span className="text-sm font-semibold text-gray-700">Limity jednotlivých chatbotů</span>
              </div>
              <div className="flex items-center space-x-2 mb-4">
                <span className="text-xs text-gray-600">Filtr:</span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setFilter('all')}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      filter === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Všechny ({chatbotLimits.length})
                  </button>
                  <button
                    onClick={() => setFilter('warning')}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      filter === 'warning'
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Varování ({chatbotLimits.filter(c => c.status === 'warning' || c.status === 'moderate').length})
                  </button>
                  <button
                    onClick={() => setFilter('exceeded')}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      filter === 'exceeded'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Překročeno ({chatbotLimits.filter(c => c.status === 'exceeded').length})
                  </button>
                </div>
              </div>

              {/* Seznam chatbotů - kompaktní */}
              <div className="space-y-2">
                {filteredChatbots.length === 0 ? (
                  <div className="text-center py-4 text-xs text-gray-500">
                    {filter === 'all' 
                      ? 'Žádné chatboty s nastaveným limitem'
                      : `Žádné chatboty v kategorii "${filter}"`
                    }
                  </div>
                ) : (
                  filteredChatbots.map(chatbot => (
                    <div
                      key={chatbot.chatbot_id}
                      className={`bg-gray-50 rounded p-3 border transition-all ${
                        chatbot.status === 'exceeded' ? 'border-red-300' :
                        chatbot.status === 'warning' ? 'border-orange-300' :
                        'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">
                            {chatbot.chatbot_name}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            chatbot.status === 'exceeded' ? 'bg-red-100 text-red-700' :
                            chatbot.status === 'warning' ? 'bg-orange-100 text-orange-700' :
                            chatbot.status === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                            chatbot.status === 'ok' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {getStatusIcon(chatbot.status)}
                          </span>
                        </div>
                        
                        <span className="text-sm font-semibold text-gray-900">
                          {chatbot.current_count.toLocaleString('cs-CZ')}
                          <span className="text-xs text-gray-500"> / </span>
                          {chatbot.daily_limit !== null 
                            ? chatbot.daily_limit.toLocaleString('cs-CZ')
                            : '∞'}
                        </span>
                      </div>

                      {chatbot.daily_limit !== null && (
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all ${
                              chatbot.percentage >= 100 ? 'bg-red-500' :
                              chatbot.percentage >= 80 ? 'bg-orange-500' :
                              chatbot.percentage >= 50 ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(chatbot.percentage, 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sekce: Historie chat zpráv */}
      <div className="mt-6">
        <ChatMessagesDashboard />
      </div>
    </div>
  );
};

export default MessageLimitsDashboard;
