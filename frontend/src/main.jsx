import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import { registerServiceWorker } from './registerServiceWorker';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        gutter={10}
        toastOptions={{
          duration: 3500,
          style: {
            background: 'rgba(7, 9, 18, 0.95)',
            color: '#e2e8f0',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: '14px',
            backdropFilter: 'blur(16px)',
            fontSize: '13px',
            padding: '10px 14px',
            boxShadow:
              '0 10px 30px -10px rgba(0,0,0,0.6), 0 0 24px -10px rgba(34,211,238,0.35)',
          },
          success: {
            iconTheme: { primary: '#4ade80', secondary: '#0a0c14' },
          },
          error: {
            iconTheme: { primary: '#f87171', secondary: '#0a0c14' },
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>,
);

registerServiceWorker();
