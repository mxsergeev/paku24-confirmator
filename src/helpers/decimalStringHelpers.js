// Helpers for manual decimal string sanitization and formatting

/**
 * Sanitizes a decimal string by removing invalid characters and limiting fractional digits.
 * @param {string} raw - Raw input string.
 * @param {number} decimals - Maximum number of decimal places.
 * @returns {string} - Sanitized decimal string.
 */
export function sanitizeDecimalString(raw, decimals = 2) {
  // Remove invalid characters and normalize comma to dot
  const cleaned = raw.replace(/[^0-9.,]+/g, '').replace(/,/g, '.')
  // Split into integer and fractional parts
  const [integerPart, fractionalPart = ''] = cleaned.split('.')
  // Truncate fractional part to allowed length
  const truncatedFraction = fractionalPart.slice(0, decimals)
  const hasSeparator = cleaned.includes('.')
  // Reassemble preserving separator and truncated fractional
  if (hasSeparator) {
    // Preserve trailing dot when no fractional digits yet
    if (cleaned.endsWith('.') && truncatedFraction === '') {
      return `${integerPart}.`
    }
    return truncatedFraction ? `${integerPart}.${truncatedFraction}` : integerPart
  }
  return integerPart
}

/**
 * Parses and formats a decimal string on blur: converts to number and fixes precision.
 * @param {string} value - Sanitized decimal string.
 * @returns {{ formatted: string, numeric: number|null }}
 */
export function parseAndFormatDecimalString(value) {
  const trimmed = value.trim()
  if (!trimmed) {
    return { formatted: '', numeric: null }
  }
  // Parse numeric value
  const normalized = trimmed.replace(',', '.')
  const num = parseFloat(normalized)
  if (isNaN(num)) {
    return { formatted: '', numeric: null }
  }
  // Preserve the user's input format: remove trailing dot if present
  let formatted = trimmed
  if (formatted.endsWith('.')) {
    formatted = formatted.slice(0, -1)
  }
  return { formatted, numeric: num }
}
