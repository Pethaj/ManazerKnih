import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

/**
 * LoadingPhrases - Animované loading fráze s Split Text efektem
 * 
 * @param changeInterval - Interval v milisekundách pro změnu fráze (výchozí 7000ms)
 */

interface LoadingPhrasesProps {
  changeInterval?: number;
}

const loadingPhrases = [
  "Generuji odpověď ...",
  "Hledám tu nejlepší informaci...",
  "Hledám a hledám...",
  "Zpracovávám váš dotaz...",
  "Prosím o chvilku strpení...",
  "Analyzuji vaši otázku...",
  "Hledám relevantní výsledky...",
  "Připravuji odpověď...",
  "Skoro hotovo...",
  "Načítám data...",
  "Sestavuji doporučení...",
  
  "Vyhledávám v katalogu...",
  "Zpracovávám informace...",
  "Optimalizuji výsledky...",
  "Chvilku strpení prosím...",
  "Moment, už to mám...",
  "Doplňuji detaily...",
  "Ověřuji informace...",
  "Finalizuji odpověď...",
  
  "Kontroluji všechny možnosti...",
  "Zpracovávám váš požadavek...",
  "Připravuji výsledky...",
  "Sbírám relevantní data...",
  "Analyzuji možnosti...",
  "Vybírám nejlepší řešení...",
  "Sestavuji informace...",
 
  "Téměř připraveno..."
];

// Split Text komponenta - animuje každé písmeno samostatně
const SplitText: React.FC<{ text: string; key: string }> = ({ text }) => {
  const letters = text.split('');

  const container = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: { 
        staggerChildren: 0.03, 
        delayChildren: 0.04 * i 
      },
    }),
  };

  const child = {
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 200,
      },
    },
    hidden: {
      opacity: 0,
      y: 20,
      scale: 0.8,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 200,
      },
    },
  };

  return (
    <motion.div
      style={{ display: "flex", overflow: "hidden" }}
      variants={container}
      initial="hidden"
      animate="visible"
      key={text} // Force re-mount when text changes
    >
      {letters.map((letter, index) => (
        <motion.span
          key={index}
          variants={child}
          style={{ display: "inline-block" }}
        >
          {letter === " " ? "\u00A0" : letter}
        </motion.span>
      ))}
    </motion.div>
  );
};

const LoadingPhrases: React.FC<LoadingPhrasesProps> = ({ changeInterval = 7000 }) => {
  // Random initial phrase
  const getRandomIndex = () => {
    return Math.floor(Math.random() * loadingPhrases.length);
  };

  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(getRandomIndex());
  const [usedIndices, setUsedIndices] = useState<Set<number>>(new Set([currentPhraseIndex]));

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPhraseIndex((prevIndex) => {
        // Get available indices (those not used yet)
        const availableIndices = loadingPhrases
          .map((_, index) => index)
          .filter(index => !usedIndices.has(index));

        let newIndex: number;
        let newUsedIndices = new Set(usedIndices);

        if (availableIndices.length === 0) {
          // All phrases used, reset the tracker
          newUsedIndices = new Set();
          newIndex = getRandomIndex();
        } else if (availableIndices.length === 1) {
          // Only one left, use it and reset
          newIndex = availableIndices[0];
          newUsedIndices = new Set();
        } else {
          // Multiple available, pick random
          newIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
        }

        newUsedIndices.add(newIndex);
        setUsedIndices(newUsedIndices);
        return newIndex;
      });
    }, changeInterval);

    return () => clearInterval(interval);
  }, [changeInterval, usedIndices]);

  return (
    <div className="text-slate-600 text-sm">
      <SplitText 
        key={currentPhraseIndex} 
        text={loadingPhrases[currentPhraseIndex]} 
      />
    </div>
  );
};

export default LoadingPhrases;














