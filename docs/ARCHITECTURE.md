# Architecture

Lift is a Manifest V3 Chrome extension with four parts that talk to each other by message passing:

- the **content script** draws the selection UI on the page
- the **service worker** coordinates
- the **offscreen document** does the heavy work (cropping, OCR, clipboard)
- the **popup** is a small launcher with your recent captures

## Capture flow

```
User presses Alt+Shift+S  ─or─  clicks "Select area" in the popup
        │
        ▼
┌───────────────────────────────────────────────┐
│ Background service worker                     │
│ src/background/service-worker.ts              │
│ Injects the selection overlay into the tab    │
│ (chrome.scripting.executeScript)              │
└───────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────┐
│ Content script                                │
│ src/content/selection-overlay.ts              │
│ Dims the page, user drags a rectangle.        │
│ Removes itself, waits 2 frames, then sends    │
│ { rect, devicePixelRatio }                    │
└───────────────────────────────────────────────┘
        │  lift:selection
        ▼
┌───────────────────────────────────────────────┐
│ Background service worker                     │
│ Screenshots the visible tab                   │
│ (chrome.tabs.captureVisibleTab → PNG data URL)│
│ Shows "Recognising…" toast                    │
│ Ensures the offscreen document exists         │
└───────────────────────────────────────────────┘
        │  lift:ocr { dataUrl, rect, devicePixelRatio }
        ▼
┌───────────────────────────────────────────────┐
│ Offscreen document                            │
│ src/offscreen/ocr-processor.ts                │
│                                               │
│  1. Image processing   src/lib/crop-image.ts  │
│     Crop to rect × devicePixelRatio,          │
│     upscale 2× (non-retina), grayscale        │
│                                               │
│  2. OCR                src/lib/ocr.ts         │
│     Tesseract.js worker (LSTM engine),        │
│     tidies whitespace                         │
│                                               │
│  3. Clipboard          src/lib/clipboard.ts   │
│     Copies the text                           │
└───────────────────────────────────────────────┘
        │  { ok, text } | { ok: false, error }
        ▼
┌───────────────────────────────────────────────┐
│ Background service worker                     │
│ Shows "Copied" / "No text found" toast        │
│ Saves to history (chrome.storage.local, 10)   │
└───────────────────────────────────────────────┘
```

All message shapes are defined in [`src/types/messages.ts`](../src/types/messages.ts).

| Message | From → To | Purpose |
|---|---|---|
| `lift:start` | popup → service worker | Start a capture in the active tab |
| `lift:selection` | content script → service worker | The selected rect, in CSS pixels |
| `lift:ocr` | service worker → offscreen | Screenshot + rect to crop and read |
| `lift:toast` | service worker → content script | Status shown on the page |

## Why each piece lives where it does

**Why an offscreen document?** MV3 service workers have no DOM. They also can't create Web Workers (which Tesseract needs) or write to the clipboard. A content script could, but it runs in the page's origin, so it can't start a worker from a `chrome-extension://` URL. An [offscreen document](https://developer.chrome.com/docs/extensions/reference/api/offscreen) is a hidden extension page created with the `WORKERS` and `CLIPBOARD` reasons, which covers both. It's created on first use and stays alive, so the Tesseract worker (about 1–2s to load) is reused across captures.

**Why the service worker takes the screenshot.** Only extension contexts can call `captureVisibleTab`. It relies on the `activeTab` grant that Chrome gives when you press the shortcut or open the popup, so Lift never needs access to "all sites".

**Why the overlay waits two frames before reporting.** The overlay must be gone from the screen before the screenshot is taken, or the dimmed backdrop ends up in the image. Removing the DOM nodes and then waiting two `requestAnimationFrame`s ensures a clean frame has been painted.

**Why a Shadow DOM.** The overlay and toast render inside a closed shadow root. That keeps the host page's CSS from breaking Lift's UI, and Lift's CSS from leaking into the page.

**Why it's injected on demand.** Lift injects nothing until you ask for it, so there's zero cost on every page you visit. The content script guards against double injection with `window.__lift`. Repeat captures in the same tab reuse the existing setup and its message listener.

## Coordinates and high-DPI screens

The selection rect is measured in CSS pixels relative to the viewport, which is the same area `captureVisibleTab` captures. The screenshot itself is in device pixels, so `crop-image.ts` multiplies by `devicePixelRatio` and clamps the result to the image bounds. On retina screens (DPR ≥ 2) the crop is already high-resolution and isn't upscaled further.

## Bundled OCR assets

MV3 forbids loading remote code, so Tesseract's files ship inside the extension under `tesseract/`. They're copied from `node_modules` by `scripts/copy-tesseract.mjs`:

| File | Source package |
|---|---|
| `worker.min.js` | `tesseract.js` |
| `core/tesseract-core-{,simd-,relaxedsimd-}lstm.wasm.js` | `tesseract.js-core` (Tesseract picks one based on CPU support) |
| `lang/eng.traineddata.gz` | `@tesseract.js-data/eng` (`4.0.0_best_int` model) |

The manifest's CSP adds `'wasm-unsafe-eval'` so the WebAssembly core can compile.

## Failure handling

| Situation | What happens |
|---|---|
| Restricted page (`chrome://`, Web Store) | Injection fails, and a red `!` badge shows on the icon for 3s |
| Selection under 5×5px | Ignored silently |
| No text recognised | "No text found in that area" toast |
| OCR or capture error | Error toast, and details logged to the offscreen or service-worker console |
| Tesseract worker fails to start | The cached promise is cleared, so the next capture retries |

To debug, go to `chrome://extensions` → Lift → **Inspect views** to open the service-worker or offscreen console.
