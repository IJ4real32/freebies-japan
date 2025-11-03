// ✅ FILE: src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App'; // ✅ Default export confirmed
import reportWebVitals from './reportWebVitals';

// Create root and render App
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Optional: measure app performance
// Pass a function like reportWebVitals(console.log)
// or connect to an analytics endpoint.
// Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
