import React, { useState } from 'react';
import LoadingPhrases from '../components/SanaChat/LoadingPhrases';
import WaveLoader from '../components/SanaChat/WaveLoader';

/**
 * Demo stránka pro testování LoadingPhrases komponenty
 * Simuluje loading stav chatbotu s animovanými frázemi
 */
const LoadingPhrasesDemo: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [changeInterval, setChangeInterval] = useState(7000);

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Loading Phrases Demo
                </h1>
                <p className="text-gray-600 mb-8">
                    Testovací stránka pro animované loading fráze s Split Text efektem
                </p>

                {/* Ovládací panel */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                    <h2 className="text-xl font-semibold mb-4">Nastavení</h2>
                    
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={isLoading}
                                    onChange={(e) => setIsLoading(e.target.checked)}
                                    className="w-5 h-5"
                                />
                                <span className="text-gray-700">Zobrazit loading stav</span>
                            </label>
                        </div>

                        <div>
                            <label className="block text-gray-700 mb-2">
                                Interval změny fráze: <strong>{changeInterval / 1000}s</strong>
                            </label>
                            <input
                                type="range"
                                min="3000"
                                max="15000"
                                step="1000"
                                value={changeInterval}
                                onChange={(e) => setChangeInterval(Number(e.target.value))}
                                className="w-full"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>3s</span>
                                <span>15s</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Simulace chatu */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4">Preview Chatbotu</h2>
                    
                    <div className="space-y-4">
                        {/* Uživatelská zpráva */}
                        <div className="flex items-start gap-3 max-w-4xl mx-auto justify-end">
                            <div className="px-4 py-3 rounded-2xl bg-bewit-blue text-white rounded-br-none shadow-sm max-w-[80%]">
                                Hledám knihu o umělé inteligenci
                            </div>
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                            </div>
                        </div>

                        {/* Loading indicator s animovanými frázemi */}
                        {isLoading && (
                            <div className="flex items-start gap-3 max-w-4xl mx-auto justify-start">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-bewit-blue flex items-center justify-center text-white">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"></path>
                                    </svg>
                                </div>
                                <div className="px-4 py-3 rounded-2xl bg-white border border-slate-200 rounded-bl-none shadow-sm">
                                    <div className="flex items-center gap-3">
                                        {/* Animovaný wave loader */}
                                        <WaveLoader />
                                        {/* Animované loading fráze */}
                                        <LoadingPhrases changeInterval={changeInterval} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Informace */}
                <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-blue-900 mb-2">
                        ℹ️ Jak to funguje
                    </h3>
                    <ul className="text-blue-800 space-y-2">
                        <li>✅ <strong>30 unikátních frází</strong> - zajímavé a motivující texty</li>
                        <li>✅ <strong>Split Text animace</strong> - každé písmeno se animuje s spring efektem</li>
                        <li>✅ <strong>Náhodná rotace</strong> - nikdy se neopakuje stejná fráze po sobě</li>
                        <li>✅ <strong>Framer Motion</strong> - plynulé a výkonné animace</li>
                        <li>✅ <strong>Nastavitelný interval</strong> - změna každých 7 sekund (nebo dle nastavení)</li>
                    </ul>
                </div>

                {/* Technické detaily */}
                <div className="mt-4 bg-gray-100 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">
                        🔧 Technické informace
                    </h3>
                    <div className="text-xs text-gray-600 space-y-1 font-mono">
                        <div>Komponenta: <code className="bg-white px-1 py-0.5 rounded">LoadingPhrases.tsx</code></div>
                        <div>Animace: <code className="bg-white px-1 py-0.5 rounded">Framer Motion</code></div>
                        <div>Interval: <code className="bg-white px-1 py-0.5 rounded">{changeInterval}ms</code></div>
                        <div>Stav: <code className="bg-white px-1 py-0.5 rounded">{isLoading ? 'Loading' : 'Idle'}</code></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoadingPhrasesDemo;













