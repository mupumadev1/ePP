import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import RootRouter from './Router.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootRouter />
  </StrictMode>,
)
