import React from 'react';
import { createRoot } from 'react-dom/client';
import BallApp from './windows/BallApp';
import PanelApp from './windows/PanelApp';
import ReaderApp from './windows/ReaderApp';
import './app.css';

const mode = new URLSearchParams(location.search).get('win') || 'panel';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {mode === 'ball' ? <BallApp /> : mode === 'reader' ? <ReaderApp /> : <PanelApp />}
  </React.StrictMode>
);
