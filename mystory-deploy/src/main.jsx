import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import Interview from './Interview.jsx'

// Prevent browser from restoring scroll position on navigation
// React handles scroll itself — without this the page loads mid-scroll
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual'
}

// Choose which component to render based on the URL path
const path = window.location.pathname
const RootComponent = path.startsWith('/interview') ? Interview : App

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootComponent />
  </StrictMode>,
)
