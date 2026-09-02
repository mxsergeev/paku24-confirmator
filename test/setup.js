function escapeCssIdentifier(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, (character) => `\\${character}`)
}

if (typeof globalThis.CSS === 'undefined') {
  globalThis.CSS = {}
}

globalThis.CSS.escape = escapeCssIdentifier

if (typeof window !== 'undefined') {
  let hasUsableLocalStorage = false
  try {
    hasUsableLocalStorage = Boolean(window.localStorage)
  } catch {
    hasUsableLocalStorage = false
  }

  if (!hasUsableLocalStorage) {
    const values = new Map()
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        clear: () => values.clear(),
        getItem: (key) => (values.has(String(key)) ? values.get(String(key)) : null),
        key: (index) => Array.from(values.keys())[index] || null,
        removeItem: (key) => values.delete(String(key)),
        setItem: (key, value) => values.set(String(key), String(value)),
        get length() {
          return values.size
        },
      },
    })
  }
}
