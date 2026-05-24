import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// TypeScript may complain about side-effect CSS imports when no declaration is present.
// Suppress the type error for this import since it's a global CSS file.
// @ts-ignore
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);