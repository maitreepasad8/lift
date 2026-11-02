import overlayScript from '../content/selection-overlay.ts?iife'
import type {
  HistoryEntry,
  OcrRequestMessage,
  OcrResponse,
  RuntimeMessage,
  SelectionMessage,
  ToastKind,
  ToastMessage,
} from '../types/messages'

const OFFSCREEN_PATH = 'src/offscreen/offscreen.html'
const HISTORY_LIMIT = 10

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command === 'start-capture') await startCapture(tab)
})

chrome.runtime.onMessage.addListener((message: RuntimeMessage, sender) => {
  if (message.type === 'lift:start') {
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => startCapture(tab))
  } else if (message.type === 'lift:selection' && sender.tab) {
    handleSelection(sender.tab, message)
  }
  return false
})

async function startCapture(tab: chrome.tabs.Tab | undefined): Promise<void> {
  if (tab?.id === undefined) return
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: [overlayScript] })
  } catch (error) {
    // chrome://, the Web Store and similar pages can't be scripted.
    console.warn('Lift cannot run on this page', error)
    await flashBadge(tab.id)
  }
}

async function handleSelection(tab: chrome.tabs.Tab, selection: SelectionMessage): Promise<void> {
  const tabId = tab.id!
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' })
    await toast(tabId, 'info', 'Recognising text…')

    await ensureOffscreenDocument()
    const request: OcrRequestMessage = {
      type: 'lift:ocr',
      target: 'offscreen',
      dataUrl,
      rect: selection.rect,
      devicePixelRatio: selection.devicePixelRatio,
    }
    const result: OcrResponse = await chrome.runtime.sendMessage(request)

    if (!result.ok) {
      await toast(tabId, 'error', `Couldn't read text: ${result.error}`)
    } else if (!result.text) {
      await toast(tabId, 'error', 'No text found in that area')
    } else {
      await toast(tabId, 'success', `Copied: ${result.text}`)
      await saveHistory({ text: result.text, url: tab.url ?? '', at: Date.now() })
    }
  } catch (error) {
    console.error('Lift capture failed', error)
    await toast(tabId, 'error', 'Capture failed – try again')
  }
}

let creatingOffscreen: Promise<void> | undefined

async function ensureOffscreenDocument(): Promise<void> {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
  })
  if (contexts.length > 0) return

  creatingOffscreen ??= chrome.offscreen
    .createDocument({
      url: OFFSCREEN_PATH,
      reasons: [chrome.offscreen.Reason.WORKERS, chrome.offscreen.Reason.CLIPBOARD],
      justification: 'Run Tesseract OCR in a web worker and copy the result to the clipboard',
    })
    .finally(() => {
      creatingOffscreen = undefined
    })
  await creatingOffscreen
}

async function toast(tabId: number, kind: ToastKind, text: string): Promise<void> {
  const message: ToastMessage = { type: 'lift:toast', kind, text }
  await chrome.tabs.sendMessage(tabId, message).catch(() => {
    // Tab navigated away or closed; nothing to show.
  })
}

async function saveHistory(entry: HistoryEntry): Promise<void> {
  const { history = [] } = (await chrome.storage.local.get('history')) as { history?: HistoryEntry[] }
  await chrome.storage.local.set({ history: [entry, ...history].slice(0, HISTORY_LIMIT) })
}

async function flashBadge(tabId: number): Promise<void> {
  await chrome.action.setBadgeBackgroundColor({ tabId, color: '#ef4444' })
  await chrome.action.setBadgeText({ tabId, text: '!' })
  await chrome.action.setTitle({ tabId, title: "Lift can't run on this page" })
  setTimeout(() => {
    chrome.action.setBadgeText({ tabId, text: '' }).catch(() => {})
  }, 3000)
}
