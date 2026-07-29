import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { RouterProvider } from 'react-router-dom'
import { router } from './routes/Route.tsx'
import { AuthProvider } from './context/AuthContext.tsx'
import { ToastProvider } from './components/Toast.tsx'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient.ts'
import { initServerTime } from './utils/serverTime.ts'

import { GoogleOAuthProvider } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// Sync frontend clock with server clock (California time) BEFORE rendering.
// This ensures all date calculations use the server's clock, not the browser's.
initServerTime().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <AuthProvider>
            <ToastProvider>
              <RouterProvider router={router} />
            </ToastProvider>
          </AuthProvider>
        </GoogleOAuthProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
});

