import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const GlobalLimitSettings: React.FC = () => {
  const [globalLimit, setGlobalLimit] = useState<{
    limit: number | null;
    current: number;
    reset_at: string | null;
    loading: boolean;
    saving: boolean;
  }>({
    limit: null,
    current: 0,
    reset_at: null,
    loading: true,
    saving: false
  });

  const [inputValue, setInputValue] = useState<string>('');

  useEffect(() => {
    loadGlobalLimit();
  }, []);

  const loadGlobalLimit = async () => {
    setGlobalLimit(prev => ({ ...prev, loading: true }));
    
    try {
      const { data, error } = await supabase
        .from('message_limits')
        .select('*')
        .is('chatbot_id', null)
        .single();

      if (error) throw error;

      if (data) {
        setGlobalLimit({
          limit: data.daily_limit,
          current: data.current_count,
          reset_at: data.reset_at,
          loading: false,
          saving: false
        });
        setInputValue(data.daily_limit?.toString() || '');
      }
    } catch (err) {
      setGlobalLimit(prev => ({ ...prev, loading: false }));
    }
  };

  const handleSaveGlobalLimit = async () => {
    setGlobalLimit(prev => ({ ...prev, saving: true }));
    
    try {
      const limitValue = inputValue ? parseInt(inputValue) : null;

      // 1️⃣ NEJDŘÍV SMAZAT VŠECHNY GLOBÁLNÍ LIMITY (prevence duplikátů)
      const { error: deleteError } = await supabase
        .from('message_limits')
        .delete()
        .is('chatbot_id', null);

      if (deleteError) {
        // Pokračujeme dál - možná žádný limit neexistoval
      }

      // 2️⃣ VYTVOŘ NOVÝ GLOBÁLNÍ LIMIT
      const { error: insertError } = await supabase
        .from('message_limits')
        .insert({
          chatbot_id: null,
          daily_limit: limitValue,
          current_count: 0, // Reset počítadla při uložení nového limitu
          updated_at: new Date().toISOString()
        });

      if (insertError) throw insertError;

      alert('✅ Globální limit byl úspěšně uložen');
      await loadGlobalLimit();
      
    } catch (err) {
      alert('❌ Nepodařilo se uložit globální limit');
    } finally {
      setGlobalLimit(prev => ({ ...prev, saving: false }));
    }
  };

  if (globalLimit.loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Globální denní limit</h3>
        <div className="text-sm text-gray-600">Načítám...</div>
      </div>
    );
  }

  const percentage = globalLimit.limit 
    ? Math.round((globalLimit.current / globalLimit.limit) * 100)
    : 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Globální denní limit</h3>
        <span className="text-xs text-gray-500">
          Platí pro všechny chatboty
        </span>
      </div>

      {/* Nastavení limitu - kompaktní */}
      <div className="mb-4">
        <div className="flex items-center space-x-2">
          <input
            type="number"
            min="0"
            placeholder="Např. 5000"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={handleSaveGlobalLimit}
            disabled={globalLimit.saving}
            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          >
            {globalLimit.saving ? 'Ukládám...' : 'Uložit'}
          </button>
        </div>
      </div>

      {/* Aktuální stav - minimalistický */}
      {globalLimit.limit !== null ? (
        <div className="space-y-3">
          {/* Progress bar - užší */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-600">
                {globalLimit.current.toLocaleString('cs-CZ')} / {globalLimit.limit.toLocaleString('cs-CZ')}
              </span>
              <span className="text-xs text-gray-500">
                {percentage}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  percentage >= 95 ? 'bg-red-500' :
                  percentage >= 80 ? 'bg-orange-500' :
                  percentage >= 60 ? 'bg-yellow-500' :
                  'bg-green-500'
                }`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Varování - kompaktní */}
          {percentage >= 80 && (
            <div className={`px-3 py-2 rounded text-xs ${
              percentage >= 95 ? 'bg-red-50 text-red-700 border border-red-200' :
              'bg-orange-50 text-orange-700 border border-orange-200'
            }`}>
              {percentage >= 95 ? 'Limit téměř vyčerpán' : 'Vysoké využití'}
            </div>
          )}
        </div>
      ) : (
        <div className="text-xs text-gray-500 italic">
          Žádný limit není nastaven
        </div>
      )}
    </div>
  );
};

export default GlobalLimitSettings;
