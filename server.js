import fs from 'node:fs'
import http from 'node:http'
import { createServer as createViteServer } from 'vite'

const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'custom' })
const template = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8')
const port = Number(process.env.PORT) || 5173

http.createServer((req, res) => {
  vite.middlewares(req, res, async () => {
    try {
      const { render } = await vite.ssrLoadModule('/src/entry-server.jsx')
      const serverUserAgent = req.headers['user-agent'] ?? ''
      const html = (await vite.transformIndexHtml(req.url, template))
        .replace('<!--app-->', render({ serverUserAgent }))
        .replace('<!--state-->', `<script>window.__SERVER_USER_AGENT__=${JSON.stringify(serverUserAgent)}</script>`)
      res.writeHead(200, { 'content-type': 'text/html' }).end(html)
    } catch (e) {
      vite.ssrFixStacktrace(e)
      res.writeHead(500).end(String(e.stack))
    }
  })
}).listen(port, () => console.log(`http://localhost:${port}`))
