import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { MathJaxContext } from 'better-react-mathjax'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MathJaxContext config={{
      loader: {load: ["[tex]/ams", "[tex]/physics"]},
      tex: {packages: {"[+]": ["ams", "physics"]}}
    }}>
      <App />
    </MathJaxContext>
  </React.StrictMode>,
)
