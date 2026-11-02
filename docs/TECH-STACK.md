# Tech stack

| Component | Technology | Notes |
|---|---|---|
| Extension platform | Chrome Extension **Manifest V3** | Required for new Chrome Web Store submissions |
| Language | **TypeScript** (strict) | Shared message types across all extension contexts |
| Build | **Vite** + **@crxjs/vite-plugin** | CRXJS generates the manifest, bundles each entry point, and builds the content script as an IIFE |
| Popup UI | **Plain TypeScript + CSS** | Two buttons and a list don't need a framework. Keeps the popup small and fast to open |
| Trigger | `chrome.commands` (Alt+Shift+S) and popup button | Both grant `activeTab`, so no broad host permissions are needed |
| Page injection | `chrome.scripting.executeScript` | Injected only when you start a capture, so nothing runs on pages otherwise |
| Region selection | DOM overlay + mouse events in a **Shadow DOM** | Isolated from page CSS. The dimming uses a CSS `box-shadow` "cutout" |
| Screen capture | `chrome.tabs.captureVisibleTab()` | PNG of the visible viewport |
| Image cropping & prep | **OffscreenCanvas** + `createImageBitmap` | Crops by device pixels, upscales 2× on non-retina screens, applies a grayscale filter |
| Background work host | `chrome.offscreen` document | Gives a DOM, Web Workers and clipboard access that the service worker lacks |
| OCR | **Tesseract.js 7** (LSTM engine, `eng` best_int model) | Runs on-device in WebAssembly. All assets are bundled because MV3 bans remote code |
| Clipboard (capture) | `document.execCommand('copy')` in the offscreen document | `navigator.clipboard` requires a focused page, and offscreen documents never have focus |
| Clipboard (popup re-copy) | `navigator.clipboard.writeText` | The popup is focused, so the modern API works |
| History | `chrome.storage.local` | Last 10 captures, kept on the device |

## Decisions and alternatives

| Decision | Chosen | Considered | Why |
|---|---|---|---|
| OCR engine | Tesseract.js (local) | Cloud vision APIs (e.g. Claude, Google Vision) | Free, offline and private. A cloud API would be more accurate on handwriting and tables, and could be added later as an optional mode |
| Capture scope | Browser tabs only | Whole screen via `desktopCapture` | Whole-screen capture shows Chrome's screen-share picker on every use |
| UI framework | None | React | Not worth the bundle size or setup for a popup this small |
| Selection rendering | DOM overlay | Drawing on a full-page `<canvas>` | DOM elements are simpler, and a CSS shadow gives the dimmed cutout for free |
| Bundling Tesseract assets | Copy from npm packages at build time | Committing vendored files | Keeps the repo small, and versions track `package.json` |
