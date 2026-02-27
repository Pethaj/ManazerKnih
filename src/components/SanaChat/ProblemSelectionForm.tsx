/**
 * ProblemSelectionForm - Moderní a inteligentní formulář pro výběr problému
 * 
 * Zobrazí se když agent potřebuje upřesnit kontext analýzy.
 * Design: Moderní "Smart" UI s interaktivními kartami a čistou typografií.
 */

import React, { useState } from 'react';

// --- Icons ---
const SparklesIcon = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m12 3 1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3Z" />
    <path d="M5 3v4" />
    <path d="M19 17v4" />
    <path d="M3 5h4" />
    <path d="M17 19h4" />
  </svg>
);

const CheckIcon = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

interface ProblemSelectionFormProps {
  problems: string[];
  onSelect: (selectedProblem: string) => void;
  disabled?: boolean;
}

export function ProblemSelectionForm({ 
  problems, 
  onSelect,
  disabled = false
}: ProblemSelectionFormProps) {
  const [selected, setSelected] = useState<string>('');
  const [submitted, setSubmitted] = useState(false);

  const isLocked = submitted || disabled;

  const handleConfirm = () => {
    if (selected && !isLocked) {
      setSubmitted(true);
      onSelect(selected);
    }
  };

  return (
    <div className="my-6 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 border border-blue-100 rounded-2xl p-6 shadow-sm backdrop-blur-sm">
      {/* Heading - stejný styl jako v callout */}
      <h4 className="text-sm font-semibold text-bewit-blue mb-5 flex items-center gap-2">
        <SparklesIcon className="w-4 h-4" />
        Upřesněte prosím váš problém
      </h4>

      {/* Interactive Selection Cards */}
      <div className="grid gap-3 mb-6">
        {problems.map((problem) => (
          <button
            key={problem}
            onClick={() => !isLocked && setSelected(problem)}
            disabled={isLocked}
            className={`group relative flex items-center justify-between p-4 rounded-xl transition-all duration-200 text-left border ${
              selected === problem
                ? 'bg-white border-blue-500 shadow-md scale-[1.02] ring-1 ring-blue-500/20'
                : isLocked
                  ? 'bg-white/40 border-gray-100 opacity-50 cursor-not-allowed'
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
          disabled={!selected || isLocked}
          className={`w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl text-sm font-bold transition-all duration-300 shadow-lg border border-blue-400/20 group relative overflow-hidden ${
            isLocked
              ? 'bg-green-600 text-white cursor-not-allowed shadow-green-200/50'
              : selected
                ? 'bg-gradient-to-r from-bewit-blue to-blue-600 text-white hover:from-blue-700 hover:to-blue-500 hover:shadow-blue-200/50 transform active:scale-[0.98]'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200 shadow-none opacity-60'
          }`}
        >
          {isLocked ? (
            <>
              <CheckIcon className="w-5 h-5" />
              <span>Odesláno</span>
            </>
          ) : (
            <>
              <SparklesIcon className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
              <span>Potvrdit</span>
            </>
          )}
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
