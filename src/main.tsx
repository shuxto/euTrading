import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { SocketProvider } from './context/SocketContext'; // 👈 NEW
import { supabase } from './lib/supabase' 

// ✅ PRO FIX: Only expose Supabase globally in Development Mode
if (import.meta.env.DEV) {
  (window as any).supabase = supabase;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SocketProvider>
      <App />
    </SocketProvider>
  </StrictMode>,
)