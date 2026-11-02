import type { HistoryEntry, StartCaptureMessage } from '../types/messages'

const captureButton = document.querySelector<HTMLButtonElement>('#capture')!
const clearButton = document.querySelector<HTMLButtonElement>('#clear')!
const historyList = document.querySelector<HTMLUListElement>('#history')!
const emptyState = document.querySelector<HTMLParagraphElement>('#empty')!
const shortcutLabel = document.querySelector<HTMLElement>('#shortcut')!

captureButton.addEventListener('click', async () => {
  const message: StartCaptureMessage = { type: 'lift:start' }
  await chrome.runtime.sendMessage(message)
  window.close() // get out of the way so the page can be selected
})

clearButton.addEventListener('click', async () => {
  await chrome.storage.local.remove('history')
  renderHistory([])
})

// Show the shortcut the user actually has, since it can be changed in chrome://extensions/shortcuts.
chrome.commands.getAll().then((commands) => {
  const shortcut = commands.find((command) => command.name === 'start-capture')?.shortcut
  shortcutLabel.textContent = shortcut || 'not set'
})

chrome.storage.local.get('history').then(({ history }) => renderHistory((history as HistoryEntry[]) ?? []))

function renderHistory(history: HistoryEntry[]): void {
  historyList.replaceChildren(...history.map(renderEntry))
  emptyState.hidden = history.length > 0
  clearButton.hidden = history.length === 0
}

function renderEntry(entry: HistoryEntry): HTMLLIElement {
  const item = document.createElement('li')
  const button = document.createElement('button')
  button.className = 'entry'
  button.title = 'Click to copy again'

  const text = document.createElement('span')
  text.className = 'text'
  text.textContent = entry.text

  const meta = document.createElement('span')
  meta.className = 'meta'
  meta.textContent = `${hostname(entry.url)} · ${new Date(entry.at).toLocaleString()}`

  button.append(text, meta)
  button.addEventListener('click', async () => {
    await navigator.clipboard.writeText(entry.text)
    meta.textContent = 'Copied!'
  })

  item.append(button)
  return item
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return 'unknown page'
  }
}
