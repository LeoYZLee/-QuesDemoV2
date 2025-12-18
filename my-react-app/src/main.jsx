import React from 'react'
import { createRoot } from 'react-dom/client'
// temporary: import the clean App while `src/App.jsx` is being fixed
import App from './App'
import './style.css'

const rootEl = document.getElementById('app')
if (!rootEl) throw new Error('#app element not found')
const root = createRoot(rootEl)
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
