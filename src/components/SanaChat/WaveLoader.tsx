import React from 'react';

/**
 * WaveLoader - Poskakující kroužky s stíny
 * Inspirováno: https://uiverse.io/mobinkakei/grumpy-turtle-41
 */

const WaveLoader: React.FC = () => {
  return (
    <div className="bouncing-loader-wrapper">
      <style>
        {`
          .bouncing-loader-wrapper {
            width: 100px;
            height: 30px;
            position: relative;
            z-index: 1;
          }

          .bouncing-circle {
            width: 10px;
            height: 10px;
            position: absolute;
            border-radius: 50%;
            background-color: #007bff;
            left: 15%;
            transform-origin: 50%;
            animation: circle7124 0.5s alternate infinite ease;
          }

          @keyframes circle7124 {
            0% {
              top: 30px;
              height: 5px;
              border-radius: 50px 50px 25px 25px;
              transform: scaleX(1.7);
            }
            40% {
              height: 10px;
              border-radius: 50%;
              transform: scaleX(1);
            }
            100% {
              top: 0%;
            }
          }

          .bouncing-circle:nth-child(2) {
            left: 45%;
            animation-delay: 0.2s;
          }

          .bouncing-circle:nth-child(3) {
            left: auto;
            right: 15%;
            animation-delay: 0.3s;
          }

          .bouncing-shadow {
            width: 10px;
            height: 4px;
            border-radius: 50%;
            background-color: rgba(0, 0, 0, 0.5);
            position: absolute;
            top: 30px;
            transform-origin: 50%;
            z-index: -1;
            left: 15%;
            filter: blur(1px);
            animation: shadow046 0.5s alternate infinite ease;
          }

          @keyframes shadow046 {
            0% {
              transform: scaleX(1.5);
            }
            40% {
              transform: scaleX(1);
              opacity: 0.7;
            }
            100% {
              transform: scaleX(0.2);
              opacity: 0.4;
            }
          }

          .bouncing-shadow:nth-child(4) {
            left: 45%;
            animation-delay: 0.2s;
          }

          .bouncing-shadow:nth-child(5) {
            left: auto;
            right: 15%;
            animation-delay: 0.3s;
          }
        `}
      </style>
      <div className="bouncing-circle" />
      <div className="bouncing-circle" />
      <div className="bouncing-circle" />
      <div className="bouncing-shadow" />
      <div className="bouncing-shadow" />
      <div className="bouncing-shadow" />
    </div>
  );
};

export default WaveLoader;











