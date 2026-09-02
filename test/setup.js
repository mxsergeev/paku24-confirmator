function escapeCssIdentifier(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, (character) => `\\${character}`)
}

if (typeof globalThis.CSS === 'undefined') {
  globalThis.CSS = {}
}

globalThis.CSS.escape = escapeCssIdentifier
