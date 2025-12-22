const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined'

module.exports = { isBrowser }
