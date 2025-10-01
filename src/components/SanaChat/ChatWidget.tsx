
import React, { useState } from 'react';
import { FilteredSanaChat } from './SanaChat';

const ChatBubbleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
);

const CloseIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);


interface ChatWidgetProps {
    chatbotSettings?: {
        product_recommendations: boolean;
        book_database: boolean;
    };
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ 
    chatbotSettings = { product_recommendations: false, book_database: true } 
}) => {
    const [isOpen, setIsOpen] = useState(false);

    const toggleChat = () => {
        setIsOpen(!isOpen);
    };

    return (
        <>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="w-[1200px] h-[700px] max-w-[95vw] max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col transition-all duration-300 ease-in-out">
                        <FilteredSanaChat chatbotSettings={chatbotSettings} />
                    </div>
                </div>
            )}
            <div className="fixed bottom-5 right-5 z-50">
                <button
                    onClick={toggleChat}
                    className="w-16 h-16 bg-bewit-blue rounded-full text-white flex items-center justify-center shadow-lg hover:bg-blue-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bewit-blue"
                    aria-label={isOpen ? 'Zavřít chat' : 'Otevřít chat'}
                >
                    {isOpen ? <CloseIcon className="w-8 h-8" /> : <ChatBubbleIcon className="w-8 h-8" />}
                </button>
            </div>
        </>
    );
};

export default ChatWidget;
