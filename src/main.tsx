import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './styles/globals.css';

console.log('Spacely Booting...');
if (typeof window !== 'undefined') {
  // Alert simple para confirmar ejecución en APK
  // alert('Spacely: Sistemas de navegación activos');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
