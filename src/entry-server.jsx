import { renderToString } from 'react-dom/server'
import { App } from './App.jsx'

export function render({ serverUserAgent }) {
  return renderToString(<App serverUserAgent={serverUserAgent} />)
}
