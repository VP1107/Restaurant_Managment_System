// src/main.jsx
// ============================================================
//  Entry Point — React DOM render
//  Lenis smooth scroll is initialised inside SmoothScrollProvider
//  so this file stays intentionally minimal.
// ============================================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import App from './App';

// Global styles are imported inside App.jsx so that Vite's
// CSS code-splitting works correctly with lazy routes.

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);