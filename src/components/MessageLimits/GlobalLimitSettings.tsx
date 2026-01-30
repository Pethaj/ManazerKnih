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
      console.error('Chyba při načítání globálního limitu:', err);
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
        console.error('⚠️ Chyba při mazání starých globálních limitů:', deleteError);
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
      console.error('Chyba při ukládání globálního limitu:', err);
      alert('❌ Nepodařilo se uložit globální limit');
    } finally {
      setGlobalLimit(prev => ({ ...prev, saving: false }));
    }
  };

  if (globalLimit.loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">🌍 Globální denní limit zpráv</h2>
        <div className="text-gray-600">Načítám...</div>
      </div>
    );
  }

  const percentage = globalLimit.limit 
    ? Math.round((globalLimit.current / globalLimit.limit) * 100)
    : 0;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-2">🌍 Globální denní limit zpráv</h2>
      <p className="text-sm text-gray-600 mb-6">
        Limit platí napříč všemi chatboty. Pokud je dosažen, žádný chatbot nemůže přijímat zprávy.
      </p>

      <div className="space-y-6">
        {/* Nastavení limitu */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Maximální počet zpráv za den (globálně)
          </label>
          <div className="flex items-center space-x-3">
            <input
              type="number"
              min="0"
              placeholder="Např. 100000 (prázdné = bez limitu)"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSaveGlobalLimit}
              disabled={globalLimit.saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {globalLimit.saving ? 'Ukládám...' : 'Uložit'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Ponechte prázdné pro neomezený počet zpráv
          </p>
        </div>

        {/* Aktuální stav */}
        {globalLimit.limit !== null ? (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-medium text-gray-700">Aktuální globální využití:</span>
              <span className="text-2xl font-bold text-gray-900">
                {globalLimit.current.toLocaleString('cs-CZ')} / {globalLimit.limit.toLocaleString('cs-CZ')}
              </span>
            </div>
            
            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-4 mb-3">
              <div
                className={`h-4 rounded-full transition-all ${
                  percentage >= 95 ? 'bg-red-500' :
                  percentage >= 80 ? 'bg-orange-500' :
                  percentage >= 60 ? 'bg-yellow-500' :
                  'bg-green-500'
                }`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
            
            <div className="flex justify-between items-center">
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                percentage >= 95 ? 'bg-red-100 text-red-800' :
                percentage >= 80 ? 'bg-orange-100 text-orange-800' :
                percentage >= 60 ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {percentage}% využito
              </span>
              {globalLimit.reset_at && (
                <span className="text-xs text-gray-600">
                  Reset: {new Date(globalLimit.reset_at).toLocaleString('cs-CZ', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              )}
            </div>

            {/* Varování */}
            {percentage >= 80 && (
              <div className={`mt-4 p-3 rounded-lg ${
                percentage >= 95 ? 'bg-red-100 border border-red-300' :
                'bg-orange-100 border border-orange-300'
              }`}>
                <p className={`text-sm font-medium ${
                  percentage >= 95 ? 'text-red-800' : 'text-orange-800'
                }`}>
                  {percentage >= 95 ? '🔴 Kritické! ' : '⚠️ Varování! '}
                  Globální limit je téměř vyčerpán. Zvažte zvýšení limitu nebo kontaktujte správce.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <p className="text-sm text-gray-600 text-center">
              ℹ️ Není nastaven žádný globální limit. Všechny chatboty mohou přijímat neomezené množství zpráv.
            </p>
          </div>
        )}

        {/* Statistiky */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-xs text-gray-600 mb-1">Zbývá dnes</p>
            <p className="text-lg font-bold text-gray-900">
              {globalLimit.limit !== null 
                ? (globalLimit.limit - globalLimit.current).toLocaleString('cs-CZ')
                : '∞'}
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-xs text-gray-600 mb-1">Využito dnes</p>
            <p className="text-lg font-bold text-gray-900">
              {globalLimit.current.toLocaleString('cs-CZ')}
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-xs text-gray-600 mb-1">Celkový limit</p>
            <p className="text-lg font-bold text-gray-900">
              {globalLimit.limit !== null 
                ? globalLimit.limit.toLocaleString('cs-CZ')
                : '∞'}
            </p>
          </div>
        </div>

        {/* Info box */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">ℹ️ Jak to funguje?</h3>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Globální limit má přednost před individuálními limity chatbotů</li>
            <li>• Pokud je globální limit dosažen, všechny chatboty přestanou přijímat zprávy</li>
            <li>• Limit se automaticky resetuje každý den o půlnoci (CET)</li>
            <li>• 1 konverzační dvojice (user + AI) = 1 započtená zpráva</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default GlobalLimitSettings;
