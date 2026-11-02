/**
 * Copies text from the offscreen document. `navigator.clipboard` needs a
 * focused document, which an offscreen page never is, so use execCommand.
 */
export function copyText(text: string): void {
  const textarea = document.createElement('textarea')
  textarea.value = text
  document.body.append(textarea)
  textarea.select()
  try {
    if (!document.execCommand('copy')) throw new Error('Copy command was rejected')
  } finally {
    textarea.remove()
  }
}
