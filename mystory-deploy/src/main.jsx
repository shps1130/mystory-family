import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import Interview from './Interview.jsx'
import { Analytics } from '@vercel/analytics/react'

if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual'
}

const path = window.location.pathname
const RootComponent = path.startsWith('/interview') ? Interview : App

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootComponent />
    <Analytics />
  </StrictMode>,
)
