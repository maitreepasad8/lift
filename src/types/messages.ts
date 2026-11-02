export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export type ToastKind = 'info' | 'success' | 'error'

export interface HistoryEntry {
  text: string
  url: string
  at: number
}

/** Popup → service worker */
export interface StartCaptureMessage {
  type: 'lift:start'
}

/** Content script → service worker */
export interface SelectionMessage {
  type: 'lift:selection'
  rect: Rect
  devicePixelRatio: number
}

/** Service worker → offscreen document */
export interface OcrRequestMessage {
  type: 'lift:ocr'
  target: 'offscreen'
  dataUrl: string
  rect: Rect
  devicePixelRatio: number
}

export type OcrResponse = { ok: true; text: string } | { ok: false; error: string }

/** Service worker → content script */
export interface ToastMessage {
  type: 'lift:toast'
  kind: ToastKind
  text: string
}

export type RuntimeMessage = StartCaptureMessage | SelectionMessage | OcrRequestMessage
