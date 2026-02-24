import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './profile-v2.css'
import App from './App.jsx'
import { loadSavedTheme } from './hooks/useTheme'

// --- PWA Initialization ---
// The vite-plugin-pwa will inject the registration logic automatically
// since injectRegister: 'auto' is set in vite.config.js
// --------------------------


loadSavedTheme(); // apply saved theme before first render (no flash)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

