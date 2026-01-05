/**
 * Widget Entry Point
 * ============================================================================
 * Entry point pro Vany Chat Widget v iframe
 * ============================================================================
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { WidgetChatContainer } from './components/WidgetChat/WidgetChatContainer';
import './widget.css'; // Import widget styles

// Widget initialization
console.log('🚀 Widget Entry Point inicializován');

// Render widget
const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <React.StrictMode>
    <WidgetChatContainer />
  </React.StrictMode>
);

// Log widget loaded
console.log('✅ Widget React aplikace renderována');

