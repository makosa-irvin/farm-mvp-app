import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Everything the app needs already lives in localStorage, so the only
// thing worth caching for offline use is the app shell itself
// (HTML/JS/CSS/fonts). No sync queue, no toggle to gate this behind —
// it's just always on.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
