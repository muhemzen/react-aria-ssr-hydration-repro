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

## TalkBack result (2026-09-16)

Tested on the Android Emulator (Google Play image, Android 17 / API 37, the first
API level where `CollectionItemInfo.setSortDirection` exists), Chrome 145.0.7632.218,
TalkBack 17.0.0.889642762, with "Display speech output" on so every announcement
could be captured as a screenshot. Page: [`public/talkback.html`](public/talkback.html),
static markup, three variants of the same sorted "Name" column, headers reached with
Tab. Screenshots in [`docs/talkback/`](docs/talkback/).

| Header | Markup | TalkBack said |
|---|---|---|
| A. Name | `aria-sort="descending"` only | "Name. Column heading. Row 1. In grid. 2 rows. 2 columns" |
| A. Age | `aria-sort="none"` only | "Age. Column heading. Row 1. In grid. 2 rows. 2 columns" |
| B. Name | `aria-describedby` -> "sortable, descending" (what react-aria emits on Android today) | "sortable, descending. Name. Column heading. Row 1. In grid. 2 rows. 2 columns" |
| B. Age | `aria-describedby` -> "sortable" | "sortable. Age. Column heading. Row 1. In grid. 2 rows. 2 columns" |
| C. Name | both | "sortable, descending. Name. Column heading. Row 1. In grid. 2 rows. 2 columns" |
| C. Age | both | "sortable. Age. Column heading. Row 1. In grid. 2 rows. 2 columns" |
| react-aria `/` Name | real `Column allowsSorting` on Android | "sortable column, descending. Name. Column heading. Row 1. In grid Sortable table. 2 rows. 2 columns" |
| react-aria `/` Age | | "sortable column. Age. Column heading. Row 1. In grid Sortable table. 2 rows. 2 columns" |

So on this stack `aria-sort` alone is silent, the `aria-describedby` text is what gets
spoken, and having both does not produce a double announcement. Emitting `aria-sort`
on Android would be harmless for TalkBack users as long as the description stays.

Not tested: a physical device, other TalkBack versions, other browsers on Android.

Repro of the setup without Android Studio (macOS, Apple Silicon):

```
brew install openjdk && brew install --cask android-commandlinetools
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
yes | sdkmanager --licenses
sdkmanager "platform-tools" "emulator" "platforms;android-37.0" "system-images;android-37.0;google_apis_playstore;arm64-v8a"
avdmanager create avd -n a11y_api37 -d pixel_8 -k "system-images;android-37.0;google_apis_playstore;arm64-v8a"
emulator -avd a11y_api37 -memory 4096
adb shell settings put secure enabled_accessibility_services com.google.android.marvin.talkback/com.google.android.marvin.talkback.TalkBackService
adb shell settings put secure accessibility_enabled 1
adb shell am start -a android.intent.action.VIEW -d "http://10.0.2.2:5173/talkback.html" com.android.chrome
adb shell input keyevent KEYCODE_TAB   # repeat; TalkBack announces each focused header
```
