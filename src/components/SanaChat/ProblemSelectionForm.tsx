/**
 * ProblemSelectionForm - Moderní a inteligentní formulář pro výběr problému
 * 
 * Zobrazí se když agent potřebuje upřesnit kontext analýzy.
 * Design: Moderní "Smart" UI s interaktivními kartami a čistou typografií.
 */

import React, { useState } from 'react';

interface ProblemSelectionFormProps {
  problems: string[];
  onSelect: (selectedProblem: string) => void;
}

export function ProblemSelectionForm({ 
  problems, 
  onSelect 
}: ProblemSelectionFormProps) {
  const [selected, setSelected] = useState<string>('');

  const handleConfirm = () => {
    if (selected) {
      onSelect(selected);
    }
  };

  return (
    <div className="my-6 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 border border-blue-100 rounded-2xl p-6 shadow-sm backdrop-blur-sm">
      {/* Heading - stejný styl jako v callout */}
      <h4 className="text-sm font-semibold text-bewit-blue mb-5 flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
        Upřesněte prosím váš problém
      </h4>

      {/* Interactive Selection Cards */}
      <div className="grid gap-3 mb-6">
        {problems.map((problem) => (
          <button
            key={problem}
            onClick={() => setSelected(problem)}
            className={`group relative flex items-center justify-between p-4 rounded-xl transition-all duration-200 text-left border ${
              selected === problem
                ? 'bg-white border-blue-500 shadow-md scale-[1.02] ring-1 ring-blue-500/20'
                : 'bg-white/60 border-gray-100 hover:border-blue-200 hover:bg-white hover:shadow-sm'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                selected === problem 
                  ? 'border-blue-500 bg-blue-500 shadow-sm' 
                  : 'border-gray-300 bg-transparent group-hover:border-blue-300'
              }`}>
                {selected === problem && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                )}
              </div>
              <span className={`text-sm font-semibold transition-colors ${
                selected === problem ? 'text-gray-900' : 'text-gray-700 group-hover:text-gray-900'
              }`}>
                {problem}
              </span>
            </div>
            
            {selected === problem && (
              <span className="text-[10px] font-bold text-blue-500 uppercase tracking-tighter bg-blue-50 px-2 py-0.5 rounded">Vybráno</span>
            )}
          </button>
        ))}
      </div>

      {/* Confirm Action */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleConfirm}
          disabled={!selected}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl text-sm font-bold transition-all duration-300 ${
            selected
              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200 hover:shadow-blue-300 transform active:scale-[0.98]'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
          }`}
        >
          <span>Potvrdit</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={selected ? 'animate-pulse' : ''}>
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
      
      {!selected && (
        <p className="text-center text-[11px] text-gray-400 mt-3 font-medium">
          Prosím vyberte jednu z možností pro pokračování
        </p>
      )}
    </div>
  );
}
