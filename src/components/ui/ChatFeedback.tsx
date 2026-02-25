/**
 * ChatFeedback komponenta
 * Zobrazuje se při zavírání chatu - sbírá hodnocení (smiley 1-5) a volitelný text
 */

import React, { useState } from 'react';

export interface ChatFeedbackData {
  smiley: number | null;
  feedbackText: string;
}

interface ChatFeedbackProps {
  onClose: (feedback: ChatFeedbackData) => void;
  sessionId?: string;
}

// Definice smajlíků - barvy jsou pouze jako stroke (line style)
const SMILEYS = [
  {
    value: 1,
    label: 'Velmi nespokojený',
    color: '#ef4444',
    icon: (active: boolean, color: string) => (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <circle cx="20" cy="20" r="18" stroke={color} strokeWidth="2" />
        {/* Oči - křížek */}
        <line x1="13" y1="13" x2="17" y2="17" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <line x1="17" y1="13" x2="13" y2="17" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <line x1="23" y1="13" x2="27" y2="17" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <line x1="27" y1="13" x2="23" y2="17" stroke={color} strokeWidth="2" strokeLinecap="round" />
        {/* Ústa - silně smutná */}
        <path d="M12 28 Q20 20 28 28" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    value: 2,
    label: 'Nespokojený',
    color: '#f97316',
    icon: (active: boolean, color: string) => (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <circle cx="20" cy="20" r="18" stroke={color} strokeWidth="2" />
        {/* Oči */}
        <circle cx="14" cy="16" r="2" stroke={color} strokeWidth="2" />
        <circle cx="26" cy="16" r="2" stroke={color} strokeWidth="2" />
        {/* Ústa - mírně smutná */}
        <path d="M13 27 Q20 23 27 27" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    value: 3,
    label: 'Neutrální',
    color: '#eab308',
    icon: (active: boolean, color: string) => (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <circle cx="20" cy="20" r="18" stroke={color} strokeWidth="2" />
        {/* Oči */}
        <circle cx="14" cy="16" r="2" stroke={color} strokeWidth="2" />
        <circle cx="26" cy="16" r="2" stroke={color} strokeWidth="2" />
        {/* Ústa - rovná čára */}
        <line x1="13" y1="26" x2="27" y2="26" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    value: 4,
    label: 'Spokojený',
    color: '#84cc16',
    icon: (active: boolean, color: string) => (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <circle cx="20" cy="20" r="18" stroke={color} strokeWidth="2" />
        {/* Oči */}
        <circle cx="14" cy="16" r="2" stroke={color} strokeWidth="2" />
        <circle cx="26" cy="16" r="2" stroke={color} strokeWidth="2" />
        {/* Ústa - mírně šťastná */}
        <path d="M13 24 Q20 29 27 24" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    value: 5,
    label: 'Velmi spokojený',
    color: '#22c55e',
    icon: (active: boolean, color: string) => (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <circle cx="20" cy="20" r="18" stroke={color} strokeWidth="2" />
        {/* Oči - šťastné */}
        <path d="M12 15 Q14 13 16 15" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M24 15 Q26 13 28 15" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
        {/* Ústa - velký úsměv */}
        <path d="M12 23 Q20 31 28 23" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
];

const ChatFeedback: React.FC<ChatFeedbackProps> = ({ onClose }) => {
  const [selectedSmiley, setSelectedSmiley] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [hoveredSmiley, setHoveredSmiley] = useState<number | null>(null);

  const handleClose = () => {
    onClose({ smiley: selectedSmiley, feedbackText });
  };

  const activeSmiley = hoveredSmiley ?? selectedSmiley;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-xl">
      <div className="bg-white rounded-2xl shadow-2xl p-8 mx-4 w-full max-w-md animate-fade-in">
        {/* Nadpis */}
        <h2 className="text-xl font-semibold text-gray-800 text-center mb-2">
          Jak hodnotíte tuto konverzaci?
        </h2>
        <p className="text-sm text-gray-500 text-center mb-6">
          Vaše hodnocení nám pomáhá se zlepšovat. Je zcela dobrovolné.
        </p>

        {/* Smajlíky */}
        <div className="flex justify-center gap-4 mb-3">
          {SMILEYS.map((smiley) => {
            const isActive = activeSmiley === smiley.value;
            const isSelected = selectedSmiley === smiley.value;
            return (
              <button
                key={smiley.value}
                onClick={() =>
                  setSelectedSmiley(isSelected ? null : smiley.value)
                }
                onMouseEnter={() => setHoveredSmiley(smiley.value)}
                onMouseLeave={() => setHoveredSmiley(null)}
                className={`w-12 h-12 rounded-full transition-all duration-200 focus:outline-none ${
                  isSelected
                    ? 'scale-125 drop-shadow-md'
                    : 'opacity-60 hover:opacity-100 hover:scale-110'
                }`}
                title={smiley.label}
                aria-label={smiley.label}
              >
                {smiley.icon(isActive, isActive ? smiley.color : '#9ca3af')}
              </button>
            );
          })}
        </div>

        {/* Popisek vybraného smajlíku */}
        <div className="text-center h-5 mb-5">
          {activeSmiley && (
            <span
              className="text-sm font-medium transition-all duration-150"
              style={{
                color: SMILEYS.find((s) => s.value === activeSmiley)?.color,
              }}
            >
              {SMILEYS.find((s) => s.value === activeSmiley)?.label}
            </span>
          )}
        </div>

        {/* Textové pole */}
        <textarea
          value={feedbackText}
          onChange={(e) => setFeedbackText(e.target.value)}
          placeholder="Napište nám cokoliv... (nepovinné)"
          className="w-full border border-gray-200 rounded-lg p-3 text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-bewit-blue/40 focus:border-bewit-blue transition-colors"
          rows={3}
          maxLength={500}
        />
        <div className="text-right text-xs text-gray-400 mb-5">
          {feedbackText.length}/500
        </div>

        {/* Tlačítko zavřít */}
        <button
          onClick={handleClose}
          className="w-full py-2.5 rounded-lg bg-bewit-blue text-white font-medium hover:bg-blue-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-bewit-blue/50"
        >
          Zavřít chat
        </button>
      </div>
    </div>
  );
};

export default ChatFeedback;
