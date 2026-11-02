# Lift

**Copy text from any part of a web page.** Lift is a Chrome extension: press a shortcut, drag a box over anything in a tab (an image, a screenshot in a doc, a video frame, a canvas chart), and the text inside it is recognised and copied to your clipboard.

OCR runs entirely on your machine with [Tesseract.js](https://github.com/naptha/tesseract.js). No image or text ever leaves the browser.

## Usage

1. Press **Alt+Shift+S**, or click the Lift icon and choose **Select area**.
2. Drag over the text you want. Press **Esc** to cancel.
3. A toast confirms the copy. Paste anywhere.

The popup lists your last 10 captures. Click one to copy it again. You can change the shortcut at `chrome://extensions/shortcuts`.

## Getting started

Requires Node 20+.

```sh
npm install
npm run build        # outputs dist/
```

Then in Chrome:
1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and pick `dist/`.

For development, `npm run dev` rebuilds on change (reload the extension in `chrome://extensions` after service-worker changes).

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev build with watch |
| `npm run build` | Type-check and production build to `dist/` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run assets` | Copy Tesseract worker/wasm/language data into `public/tesseract/` (runs automatically before dev/build) |
| `npm run icons` | Regenerate the toolbar icons in `public/icons/` |

## Limitations

- Works on web pages inside Chrome only, not other desktop apps.
- Chrome blocks extensions on `chrome://` pages and the Chrome Web Store. Lift shows a red `!` badge there.
- English only for now. Accuracy is best on clear printed text. Handwriting and stylised fonts are hit-and-miss.

## Docs

- [Architecture](docs/ARCHITECTURE.md): how a capture flows through the extension
- [Tech stack](docs/TECH-STACK.md): what each piece uses and why
