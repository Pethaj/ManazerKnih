/**
 * Univerzální komponenta hlavičky chatu
 * Používána ve všech chatech (Sana Chat, Wany Chat, Product Chat, atd.)
 */

import React from 'react';

// Logo SANA AI - obrázek z Supabase storage
const SanaAILogo: React.FC<React.ImgHTMLAttributes<HTMLImageElement>> = (props) => (
  <img
    src="https://modopafybeslbcqjxsve.supabase.co/storage/v1/object/public/web/Generated_Image_September_08__2025_-_3_09PM-removebg-preview.png"
    alt="Sana AI Logo"
    style={{ objectFit: 'contain' }}
    {...props}
  />
);

// Ikony pro akční tlačítka
const CloseIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const ProductIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="9" cy="21" r="1"/>
    <circle cx="20" cy="21" r="1"/>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
  </svg>
);

const DownloadIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);

const PlusIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

export interface ChatHeaderButton {
  icon: 'close' | 'product' | 'download' | 'plus' | 'custom';
  onClick: () => void;
  label: string;
  tooltip: string;
  isActive?: boolean;
  customIcon?: React.ReactNode;
}

export interface Language {
  code: string;
  label: string;
}

export interface ChatHeaderProps {
  /** Název chatbota (zobrazí se pod logem) */
  chatbotName?: string;
  /** Pole akčních tlačítek na pravé straně */
  buttons?: ChatHeaderButton[];
  /** Volitelný obsah pro levou část (nahradí logo) */
  leftContent?: React.ReactNode;
  /** Callback pro zavření chatu (pokud je zadán, přidá se tlačítko pro zavření) */
  onClose?: () => void;
  /** Jazyky pro přepínač jazyka */
  languages?: Language[];
  /** Aktuálně vybraný jazyk */
  selectedLanguage?: string;
  /** Callback při změně jazyka */
  onLanguageChange?: (lang: string) => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  chatbotName,
  buttons = [],
  leftContent,
  onClose,
  languages,
  selectedLanguage,
  onLanguageChange
}) => {
  
  const renderIcon = (button: ChatHeaderButton) => {
    if (button.icon === 'custom' && button.customIcon) {
      return button.customIcon;
    }
    
    switch (button.icon) {
      case 'close':
        return <CloseIcon className="h-5 w-5" />;
      case 'product':
        return <ProductIcon className="h-5 w-5" />;
      case 'download':
        return <DownloadIcon className="h-5 w-5" />;
      case 'plus':
        return <PlusIcon className="h-5 w-5" />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-bewit-blue text-white shadow-md w-full">
      <div className="w-full">
        <div className="flex items-center justify-between h-16 pl-4 pr-4">
          {/* Levá část - Logo nebo custom obsah */}
          <div className="flex items-center space-x-4">
            {leftContent || (
              <SanaAILogo className="h-10 w-auto object-contain" />
            )}
          </div>
          
          {/* Pravá část - Jazyky a akční tlačítka */}
          <div className="flex items-center space-x-3">
            {/* Jazykové tlačítka */}
            {languages && languages.length > 0 && onLanguageChange && (
              <>
                <div className="flex items-center space-x-2">
                  {languages.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => onLanguageChange(lang.code)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                        selectedLanguage === lang.code
                          ? 'bg-white text-bewit-blue ring-2 ring-offset-2 ring-offset-bewit-blue ring-white'
                          : 'bg-white/20 hover:bg-white/30 text-white'
                      }`}
                      aria-label={`Změnit jazyk na ${lang.label}`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
                <div className="h-6 w-px bg-white/20"></div>
              </>
            )}
            
            {/* Akční tlačítka */}
            <div className="flex items-center space-x-2">
              {buttons.map((button, index) => (
                <button 
                  key={index}
                  onClick={button.onClick} 
                  className={`flex items-center justify-center h-9 w-9 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white ${
                    button.isActive 
                      ? 'bg-white/20 text-white' 
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                  aria-label={button.label}
                  title={button.tooltip}
                >
                  {renderIcon(button)}
                </button>
              ))}
              
              {/* Tlačítko pro zavření chatu - vždy poslední */}
              {onClose && (
                <button
                  onClick={onClose}
                  className="flex items-center justify-center h-9 w-9 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white bg-white/10 hover:bg-white/20 text-white"
                  aria-label="Zavřít chat"
                  title="Zavřít chat"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;

