// Usage: npm run emulate -- desktop | android | iphone   (server must be running on PORT, default 5173)
// Drives a headless Chrome over the DevTools Protocol with a browser-level user agent
// override (the same mechanism DevTools uses), plus navigator.platform for the iPhone case,
// and prints React's hydration diff from the console.
import { spawn } from 'node:child_process'

const mode = process.argv[2] ?? 'desktop'
const url = `http://localhost:${process.env.PORT || 5173}/`
const overrides = {
  android: {
    userAgent: 'Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
    userAgentMetadata: { brands: [{ brand: 'Chromium', version: '140' }, { brand: 'Google Chrome', version: '140' }], fullVersionList: [], fullVersion: '140.0.0.0', platform: 'Android', platformVersion: '16', architecture: '', model: 'Pixel 10', mobile: true }
  },
  iphone: {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    platform: 'iPhone'
  }
}
const chromePath = process.env.CHROME || {
  darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  linux: 'google-chrome',
  win32: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
}[process.platform]
const port = 9400 + Math.floor(Math.random() * 400)
const chrome = spawn(chromePath, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${process.env.TMPDIR || '/tmp'}/rac-repro-${process.pid}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' })

for (let i = 0; i < 60; i++) {
  try { await fetch(`http://127.0.0.1:${port}/json/version`); break } catch { await new Promise(r => setTimeout(r, 500)) }
}
const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json()
const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl)
let id = 0
const pending = new Map()
const logs = []
ws.onmessage = ({ data }) => {
  const m = JSON.parse(data)
  if (m.id) pending.get(m.id)?.(m.result)
  else if (m.method === 'Runtime.consoleAPICalled') logs.push(m.params.args.map(a => a.value ?? a.description).join(' '))
}
const send = (method, params = {}) => new Promise(res => { pending.set(++id, res); ws.send(JSON.stringify({ id, method, params })) })
await new Promise(r => { ws.onopen = r })
await send('Runtime.enable')
await send('Page.enable')
if (overrides[mode]) await send('Emulation.setUserAgentOverride', overrides[mode])
await send('Page.navigate', { url })
await new Promise(r => setTimeout(r, 4000))
const state = await send('Runtime.evaluate', { returnByValue: true, expression: `JSON.stringify({
  userAgent: navigator.userAgent,
  platform: navigator.userAgentData?.platform || navigator.platform,
  ariaSort: [...document.querySelectorAll('[role=columnheader]')].map(e => e.getAttribute('aria-sort')),
  inputMode: document.querySelector('input').getAttribute('inputmode')
})` })
console.log(`mode: ${mode}`)
console.log(`client: ${state.result.value}`)
const warning = logs.find(l => l.includes('hydrated'))
console.log(warning ? warning.split('\n').filter(l => /^\s*[+-] /.test(l) || l.startsWith('A tree')).join('\n') : 'no hydration warning')
chrome.kill('SIGKILL')
await new Promise(r => chrome.on('exit', r))
