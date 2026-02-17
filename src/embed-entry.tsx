import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import EmbedVanyChat from './pages/EmbedVanyChat';

/**
 * EMBED ENTRY POINT
 * 
 * Tento entry point je NEZÁVISLÝ na hlavní aplikaci.
 * Neprochází přes AppRouter ani AuthGuard.
 * Slouží POUZE pro embedding Wany Chatu do iframe.
 */

const rootElement = document.getElementById('embed-root');

if (!rootElement) {
  throw new Error('Failed to find the embed-root element');
}

const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <EmbedVanyChat />
  </StrictMode>
);


