import { hydrateRoot } from 'react-dom/client'
import { App } from './App.jsx'

hydrateRoot(document.getElementById('root'), <App serverUserAgent={window.__SERVER_USER_AGENT__} />)
