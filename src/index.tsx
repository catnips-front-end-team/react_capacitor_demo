import React from 'react';
import ReactDOM from 'react-dom/client';
import { defineCustomElements } from '@ionic/pwa-elements/loader';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

defineCustomElements(window);

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
      {/*** 直接替换这个APP组件, 比如<Game/> ***/}
    <App />
  </React.StrictMode>
);

reportWebVitals();
