# react-aria SSR hydration mismatch (adobe/react-spectrum#8503)

`react-aria`'s platform checks (`isAndroid()`, `isIPhone()`) read `window.navigator`
and return `false` on the server. Two hooks branch on them during render, so the
server HTML and the first client render disagree on Android and iPhone:

- `useTableColumnHeader`: server emits `aria-sort`, Android client emits none.
- `useNumberField`: server emits `inputMode="numeric"`, iPhone client emits `text`
  (and `aria-roledescription` goes from "Number field" to null).

This app is one page with exactly those two components, rendered with
`renderToString` and hydrated with `hydrateRoot`. It prints the user agent the
server rendered with and the one the client hydrated with.

Versions: react 19.3.0, react-dom 19.3.0, react-aria-components 1.21.1, vite 7.3.6.

## Run

One click: https://stackblitz.com/github/muhemzen/react-aria-ssr-hydration-repro?startScript=dev
(Chrome or another Chromium browser; open the preview in its own tab with the
"Open in new tab" button so DevTools applies to it.)

Locally:

```
npm install
npm run dev        # http://localhost:5173
```

## 1. Desktop (control): no warning

Open the page, open the console. Nothing is logged.

## 2. Android: aria-sort mismatch

1. DevTools > Network > "More network conditions" (or Cmd/Ctrl+Shift+P, "Show Network conditions").
2. User agent: untick "Use browser default", pick the Chrome Android Mobile preset.
3. Reload. The console shows:

```
A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. ...
  <th ... role="columnheader"
+   aria-sort={undefined}
-   aria-sort="descending"
```

and the same pair for the second column (`- aria-sort="none"`). The DOM keeps the
server value: `aria-sort` stays on both headers.

## 3. iPhone: inputMode mismatch

`isIPhone()` reads `navigator.userAgentData.platform || navigator.platform`. The
DevTools user agent presets do not change `navigator.platform`, so this case does
not fire from desktop DevTools. Use one of:

- Safari on an iPhone, or the Xcode iOS Simulator, pointed at the local server.
- Open the StackBlitz link on an iPhone (WebContainers on iOS Safari is beta).
- Desktop with Chrome installed: `npm run emulate -- iphone` (headless Chrome with a
  browser-level `platform: "iPhone"` override; `-- android` and `-- desktop` also work).

Expected console:

```
+   inputMode="text"
-   inputMode="numeric"
+   aria-roledescription={null}
-   aria-roledescription="Number field"
```

## TalkBack

Not tested. We have no Android device, so whether TalkBack still needs the
`aria-sort` exclusion is unverified. This page can be used for that test on a device.
