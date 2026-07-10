import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AudioProvider } from './contexts/AudioContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AudioProvider>
      <App />
    </AudioProvider>
  </StrictMode>,
);

// Fade out the static boot splash once React has taken over.
const bootSplash = document.getElementById('boot-splash');
if (bootSplash) {
  requestAnimationFrame(() => {
    bootSplash.classList.add('boot-done');
    window.setTimeout(() => bootSplash.remove(), 450);
  });
}
