import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

console.log('App starting...');

const container = document.getElementById('root');
if (container) {
  console.log('Container found, rendering...');
  const root = createRoot(container);
  root.render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
  console.log('Render called');
} else {
  console.error('Container not found!');
}