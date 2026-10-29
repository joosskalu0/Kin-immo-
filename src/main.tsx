import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Google Maps Platform Two-Tier Quota Defense
(window as any).gm_authFailure = () => {
  window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
};
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const msg = reason?.message || String(reason || '');
  if (
    msg.includes('_openDb') ||
    msg.includes('indexedDB') ||
    msg.includes('@vite/client') ||
    msg.includes('WebSocket') ||
    msg.includes('database connection') ||
    msg.includes('offline mode') ||
    msg.includes('backend didn\'t respond')
  ) {
    event.preventDefault();
  }
});

const origError = console.error;
console.error = (...args: unknown[]) => {
  const msg = args.map((a) => String(a)).join(' ');
  if (
    msg.includes('@vite/client') ||
    msg.includes('WebSocket closed') ||
    msg.includes('[vite]') ||
    msg.includes('_openDb') ||
    msg.includes('indexedDB') ||
    msg.includes('Backend didn\'t respond within 10 seconds') ||
    msg.includes('client will operate in offline mode')
  ) {
    return;
  }
  origError.apply(console, args);
  if (msg.includes('OverQuotaMapError') || msg.includes('QuotaExceededError')) {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
  }
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
