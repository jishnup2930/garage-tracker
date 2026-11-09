import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { ToastProvider } from './components/ui/Toast'
import { AppStoreProvider } from './store/AppStore'
import { UIProvider } from './store/ui'
import { ErrorBoundary } from './components/ErrorBoundary'
import { initApp } from './lib/install'

initApp()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <AppStoreProvider>
          <UIProvider>
            <App />
          </UIProvider>
        </AppStoreProvider>
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>,
)
