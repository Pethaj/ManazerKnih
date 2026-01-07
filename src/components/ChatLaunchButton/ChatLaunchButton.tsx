import React from 'react';
import styled from 'styled-components';

interface ChatLaunchButtonProps {
  onClick?: () => void;
}

const ChatLaunchButton: React.FC<ChatLaunchButtonProps> = ({ onClick }) => {
  return (
    <StyledWrapper>
      <div 
        aria-label="Spustit Chat" 
        tabIndex={0} 
        role="button" 
        className="chat-button"
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            onClick?.();
          }
        }}
      >
        <div className="chat-button-inner">
          <p>Spustit Chat</p>
        </div>
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  .chat-button {
    width: 180px;
    height: 51px;
    border-radius: 15px;
    cursor: pointer;
    transition: 0.3s ease;
    background: linear-gradient(
      to bottom right,
      #2e8eff 0%,
      rgba(46, 142, 255, 0) 30%
    );
    background-color: rgba(46, 142, 255, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .chat-button:hover,
  .chat-button:focus {
    background-color: rgba(46, 142, 255, 0.7);
    box-shadow: 0 0 10px rgba(46, 142, 255, 0.5);
    outline: none;
  }

  .chat-button-inner {
    width: 176px;
    height: 47px;
    border-radius: 13px;
    background-color: #079854;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-weight: 600;
    font-size: 16px;
    transition: background-color 0.3s ease;
  }

  .chat-button:hover .chat-button-inner {
    background-color: #067d44;
  }

  .chat-button-inner p {
    margin: 0;
  }
`;

export default ChatLaunchButton;

