import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

function BootError({ message }) {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui', color: '#f4ebe0' }}>
      <h1 style={{ marginTop: 0 }}>F&amp;B HQ failed to start</h1>
      <p>{message}</p>
      <p style={{ opacity: 0.8 }}>
        Start the API with <code>cd backend && npm run dev</code>, then refresh.
      </p>
    </div>
  );
}

const el = document.getElementById('root');

try {
  createRoot(el).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (err) {
  createRoot(el).render(<BootError message={err.message} />);
}
