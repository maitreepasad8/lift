import { defineManifest } from '@crxjs/vite-plugin'
import pkg from '../package.json' with { type: 'json' }

export default defineManifest({
  manifest_version: 3,
  name: 'Lift – Copy text from any image',
  short_name: 'Lift',
  description: 'Select part of a web page and copy the text in it, recognised on-device.',
  version: pkg.version,
  icons: {
    16: 'icons/icon-16.png',
    48: 'icons/icon-48.png',
    128: 'icons/icon-128.png',
  },
  action: {
    default_title: 'Lift (Alt+Shift+S)',
    default_popup: 'src/popup/popup.html',
  },
  background: {
    service_worker: 'src/background/service-worker.ts',
    type: 'module',
  },
  commands: {
    'start-capture': {
      suggested_key: { default: 'Alt+Shift+S', mac: 'Alt+Shift+S' },
      description: 'Select an area and copy its text',
    },
  },
  permissions: ['activeTab', 'scripting', 'offscreen', 'clipboardWrite', 'storage'],
  content_security_policy: {
    extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'",
  },
})
