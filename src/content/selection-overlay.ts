import styles from './selection.css?inline'
import type { Rect, SelectionMessage, ToastKind, ToastMessage } from '../types/messages'

/**
 * Injected on demand by the service worker. Injection can happen many times in
 * the same tab, so the one-time setup is guarded and each injection just calls
 * startSelection().
 */

const MIN_SIZE = 5

interface LiftGlobal {
  startSelection: () => void
}

declare global {
  interface Window {
    __lift?: LiftGlobal
  }
}

window.__lift ??= init()
window.__lift.startSelection()

function init(): LiftGlobal {
  // A shadow root keeps page CSS out of our UI and our CSS out of the page.
  const host = document.createElement('lift-root')
  const shadow = host.attachShadow({ mode: 'closed' })
  const style = document.createElement('style')
  style.textContent = styles
  shadow.append(style)

  let overlay: HTMLElement | undefined
  let toastTimer: number | undefined

  function mountHost(): void {
    if (!host.isConnected) document.documentElement.append(host)
  }

  function startSelection(): void {
    if (overlay) return // already selecting
    mountHost()

    const backdrop = document.createElement('div')
    backdrop.className = 'backdrop'
    const box = document.createElement('div')
    box.className = 'selection'
    const hint = document.createElement('div')
    hint.className = 'hint'
    hint.textContent = 'Drag to select text · Esc to cancel'
    backdrop.append(box, hint)
    shadow.append(backdrop)
    overlay = backdrop

    let start: { x: number; y: number } | undefined
    let rect: Rect | undefined

    const onMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) return
      event.preventDefault()
      start = { x: event.clientX, y: event.clientY }
      backdrop.classList.add('selecting')
      hint.remove()
    }

    const onMouseMove = (event: MouseEvent) => {
      if (!start) return
      rect = {
        x: Math.min(start.x, event.clientX),
        y: Math.min(start.y, event.clientY),
        width: Math.abs(event.clientX - start.x),
        height: Math.abs(event.clientY - start.y),
      }
      Object.assign(box.style, {
        display: 'block',
        left: `${rect.x}px`,
        top: `${rect.y}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
      })
    }

    const onMouseUp = () => {
      if (!start) return
      const selected = rect
      cleanup()
      if (!selected || selected.width < MIN_SIZE || selected.height < MIN_SIZE) return
      // Wait for the overlay to be painted away so it isn't in the screenshot.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const message: SelectionMessage = {
            type: 'lift:selection',
            rect: selected,
            devicePixelRatio: window.devicePixelRatio,
          }
          chrome.runtime.sendMessage(message)
        }),
      )
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      cleanup()
    }

    function cleanup(): void {
      backdrop.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove, true)
      window.removeEventListener('mouseup', onMouseUp, true)
      window.removeEventListener('keydown', onKeyDown, true)
      backdrop.remove()
      overlay = undefined
    }

    backdrop.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove, true)
    window.addEventListener('mouseup', onMouseUp, true)
    window.addEventListener('keydown', onKeyDown, true)
  }

  function showToast(kind: ToastKind, text: string): void {
    mountHost()
    shadow.querySelector('.toast')?.remove()
    window.clearTimeout(toastTimer)

    const toast = document.createElement('div')
    toast.className = `toast ${kind}`
    toast.textContent = text
    shadow.append(toast)

    // "Recognising…" stays until the result replaces it.
    if (kind !== 'info') toastTimer = window.setTimeout(() => toast.remove(), 3000)
  }

  chrome.runtime.onMessage.addListener((message: ToastMessage) => {
    if (message.type === 'lift:toast') showToast(message.kind, message.text)
  })

  return { startSelection }
}
