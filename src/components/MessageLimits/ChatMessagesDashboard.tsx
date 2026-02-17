import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

interface ChatMessage {
  id: string;
  chatbot_id: string;
  message_text: string;
  message_data: any;
  created_at: string;
  user_data?: {
    first_name?: string;
    last_name?: string;
    position?: string;
    email?: string;
    external_user_id?: string;
  };
  role: 'user' | 'bot' | 'pair';
}

interface ChatbotOption {
  chatbot_id: string;
  chatbot_name: string;
}

const ChatMessagesDashboard: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatbots, setChatbots] = useState<ChatbotOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChatbot, setSelectedChatbot] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null);
  const [expandedTextId, setExpandedTextId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Nové filtry
  const [filterName, setFilterName] = useState<string>('');
  const [filterPosition, setFilterPosition] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');

  const MESSAGES_PER_PAGE = 500;
  const MAX_TEXT_LENGTH = 150; // Maximální počet znaků pro text zprávy

  // Načti seznam chatbotů
  useEffect(() => {
    const loadChatbots = async () => {
      try {
        const { data, error } = await supabase
          .from('chatbot_settings')
          .select('chatbot_id, chatbot_name')
          .order('chatbot_name');

        if (error) throw error;
        setChatbots(data || []);
      } catch (err) {
      }
    };

    loadChatbots();
  }, []);

  // Načti zprávy s filtry
  const loadMessages = useCallback(async (pageNumber: number, reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true);
        setPage(0);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }

      let query = supabase
        .from('chat_messages')
        .select('id, chatbot_id, message_text, message_data, created_at, user_data, role')
        .order('created_at', { ascending: false })
        .range(pageNumber * MESSAGES_PER_PAGE, (pageNumber + 1) * MESSAGES_PER_PAGE - 1);

      // Filtr podle chatbota
      if (selectedChatbot !== 'all') {
        query = query.eq('chatbot_id', selectedChatbot);
      }

      // Filtr podle data (od)
      if (filterDateFrom) {
        query = query.gte('created_at', new Date(filterDateFrom).toISOString());
      }

      // Filtr podle data (do)
      if (filterDateTo) {
        // Přidáme 23:59:59 k datu "do"
        const dateTo = new Date(filterDateTo);
        dateTo.setHours(23, 59, 59, 999);
        query = query.lte('created_at', dateTo.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      // Klientská filtrace podle jména a pozice (protože filtrujeme vnořený JSON)
      let filteredData = data || [];
      
      if (filterName) {
        const nameLower = filterName.toLowerCase();
        filteredData = filteredData.filter(msg => {
          const firstName = msg.user_data?.first_name?.toLowerCase() || '';
          const lastName = msg.user_data?.last_name?.toLowerCase() || '';
          return firstName.includes(nameLower) || lastName.includes(nameLower);
        });
      }

      if (filterPosition) {
        const positionLower = filterPosition.toLowerCase();
        filteredData = filteredData.filter(msg => {
          const position = msg.user_data?.position?.toLowerCase() || '';
          return position.includes(positionLower);
        });
      }

      if (reset) {
        setMessages(filteredData);
      } else {
        setMessages(prev => [...prev, ...filteredData]);
      }

      setHasMore((data || []).length === MESSAGES_PER_PAGE);
      
    } catch (err) {
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [selectedChatbot, filterName, filterPosition, filterDateFrom, filterDateTo]);

  // První načtení - reaguj na změnu filtrů
  useEffect(() => {
    loadMessages(0, true);
  }, [selectedChatbot, filterName, filterPosition, filterDateFrom, filterDateTo, loadMessages]);

  // Lazy loading - načti další zprávy
  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadMessages(nextPage, false);
  };

  // Toggle rozbalení message_data
  const toggleExpand = (messageId: string) => {
    setExpandedMessageId(prev => prev === messageId ? null : messageId);
  };

  // Toggle rozbalení textu zprávy
  const toggleTextExpand = (messageId: string) => {
    setExpandedTextId(prev => prev === messageId ? null : messageId);
  };

  // Kopírování ID
  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000); // Zmizí po 2 sekundách
    } catch (err) {
    }
  };

  // Formátování datumu (bez sekund)
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Formátování textu zprávy s line breaks
  const formatMessageText = (text: string) => {
    if (!text) return '-';
    return text;
  };

  // Kontrola, zda je text delší než limit
  const isTextLong = (text: string) => {
    return text && text.length > MAX_TEXT_LENGTH;
  };

  // Získej jméno chatbota podle ID
  const getChatbotName = (chatbotId: string) => {
    const chatbot = chatbots.find(c => c.chatbot_id === chatbotId);
    return chatbot?.chatbot_name || chatbotId;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">Načítám zprávy...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Historie chat zpráv</h2>
        <button
          onClick={() => loadMessages(0, true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Obnovit
        </button>
      </div>

      {/* Filtry */}
      <div className="bg-white rounded-lg shadow-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Filtr podle chatbota */}
          <div>
            <label htmlFor="chatbot-filter" className="block text-xs font-medium text-gray-700 mb-1">
              Chatbot:
            </label>
            <select
              id="chatbot-filter"
              value={selectedChatbot}
              onChange={(e) => setSelectedChatbot(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Filtr podle chatbota"
            >
              <option value="all">Všechny chatboty</option>
              {chatbots.map(chatbot => (
                <option key={chatbot.chatbot_id} value={chatbot.chatbot_id}>
                  {chatbot.chatbot_name}
                </option>
              ))}
            </select>
          </div>

          {/* Filtr podle jména */}
          <div>
            <label htmlFor="name-filter" className="block text-xs font-medium text-gray-700 mb-1">
              Jméno nebo příjmení:
            </label>
            <input
              id="name-filter"
              type="text"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              placeholder="Např. Jan Novák"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filtr podle pozice */}
          <div>
            <label htmlFor="position-filter" className="block text-xs font-medium text-gray-700 mb-1">
              Pozice:
            </label>
            <input
              id="position-filter"
              type="text"
              value={filterPosition}
              onChange={(e) => setFilterPosition(e.target.value)}
              placeholder="Např. Manažer"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filtr podle data od */}
          <div>
            <label htmlFor="date-from-filter" className="block text-xs font-medium text-gray-700 mb-1">
              Datum od:
            </label>
            <input
              id="date-from-filter"
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filtr podle data do */}
          <div>
            <label htmlFor="date-to-filter" className="block text-xs font-medium text-gray-700 mb-1">
              Datum do:
            </label>
            <input
              id="date-to-filter"
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Info o počtu zpráv a tlačítko reset */}
          <div className="flex items-end space-x-2">
            <div className="flex-1">
              <span className="block text-xs font-medium text-gray-700 mb-1">
                Zobrazeno:
              </span>
              <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-900 font-semibold">
                {messages.length} zpráv
              </div>
            </div>
            {(filterName || filterPosition || filterDateFrom || filterDateTo) && (
              <button
                onClick={() => {
                  setFilterName('');
                  setFilterPosition('');
                  setFilterDateFrom('');
                  setFilterDateTo('');
                }}
                className="px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
                title="Vymazat filtry"
              >
                Vymazat
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabulka zpráv */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Chatbot
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Text zprávy
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Jméno a Příjmení
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pozice
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data zprávy
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vytvořeno
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {messages.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Žádné zprávy k zobrazení
                  </td>
                </tr>
              ) : (
                messages.map((message) => (
                  <tr key={message.id} className="hover:bg-gray-50">
                    {/* ID s ikonou kopírovat */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500 font-mono">
                          {message.id.substring(0, 8)}...
                        </span>
                        <button
                          onClick={() => copyToClipboard(message.id, message.id)}
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                          title="Kopírovat celé ID"
                        >
                          {copiedId === message.id ? (
                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Chatbot */}
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex flex-col">
                        <span className="font-medium">{getChatbotName(message.chatbot_id)}</span>
                        <span className="text-xs text-gray-500">{message.chatbot_id}</span>
                      </div>
                    </td>

                    {/* Text zprávy s možností rozbalení */}
                    <td className="px-4 py-4 text-sm text-gray-900 max-w-lg">
                      <div className="space-y-2">
                        <div className="whitespace-pre-wrap break-words">
                          {expandedTextId === message.id || !isTextLong(message.message_text) 
                            ? formatMessageText(message.message_text)
                            : formatMessageText(message.message_text).substring(0, MAX_TEXT_LENGTH) + '...'
                          }
                        </div>
                        {isTextLong(message.message_text) && (
                          <button
                            onClick={() => toggleTextExpand(message.id)}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                          >
                            {expandedTextId === message.id ? '▲ Skrýt' : '▼ Zobrazit celý text'}
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Jméno a Příjmení */}
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {message.user_data?.first_name || message.user_data?.last_name ? (
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {message.user_data.first_name || ''} {message.user_data.last_name || ''}
                          </span>
                          {message.user_data.email && (
                            <span className="text-xs text-gray-500">{message.user_data.email}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>

                    {/* Pozice */}
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {message.user_data?.position || <span className="text-gray-400">-</span>}
                    </td>

                    {/* Message Data */}
                    <td className="px-4 py-4 text-sm">
                      {message.message_data && Object.keys(message.message_data).length > 0 ? (
                        <div>
                          <button
                            onClick={() => toggleExpand(message.id)}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                          >
                            {expandedMessageId === message.id ? 'Skrýt' : 'Zobrazit'}
                          </button>
                          {expandedMessageId === message.id && (
                            <div className="mt-2 p-2 bg-gray-50 rounded text-xs font-mono max-w-md overflow-auto max-h-48">
                              <pre className="whitespace-pre-wrap break-words">
                                {JSON.stringify(message.message_data, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>

                    {/* Created At */}
                    <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-500">
                      {formatDate(message.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lazy Loading tlačítko */}
      {hasMore && messages.length > 0 && (
        <div className="flex justify-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingMore ? 'Načítám další zprávy...' : 'Načíst další zprávy (500)'}
          </button>
        </div>
      )}

      {!hasMore && messages.length > 0 && (
        <div className="text-center text-gray-500 text-sm">
          Všechny zprávy byly načteny
        </div>
      )}
    </div>
  );
};

export default ChatMessagesDashboard;
