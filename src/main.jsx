import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './AuthContext.jsx'

// Global error handler for debugging on mobile devices
window.onerror = function (msg, url, lineNo, columnNo, error) {
  const message = [
    'Message: ' + msg,
    'URL: ' + url,
    'Line: ' + lineNo,
    'Column: ' + columnNo,
    'Error object: ' + JSON.stringify(error)
  ].join('\n');
  
  // Only alert if not localhost to avoid annoying dev experience
  if (window.location.hostname !== 'localhost') {
    alert('App Error: ' + message);
  }
  return false;
};

// Check for Messenger/Facebook in-app browser
const ua = navigator.userAgent || navigator.vendor || window.opera;
if ((ua.indexOf("FBAN") > -1) || (ua.indexOf("FBAV") > -1)) {
  if (window.location.hostname !== 'localhost') {
    alert("You are using the Messenger/Facebook in-app browser. For the best experience and to avoid a blank screen, please tap the three dots (...) and choose 'Open in Safari'.");
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
