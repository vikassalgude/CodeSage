import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Dynamically override global fetch to prepend VITE_API_URL in production
const originalFetch = window.fetch;
window.fetch = (input, init) => {
  if (typeof input === 'string' && input.startsWith('/api/')) {
    const apiBase = import.meta.env.VITE_API_URL || '';
    // Normalize trailing slash / double slashes
    const baseUrl = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
    input = `${baseUrl}${input}`;
  }
  return originalFetch(input, init);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
