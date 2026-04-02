export function hexToRgba(hex = '#039be5', alpha = 0.12) {
  if (!hex) return `rgba(3,155,229,${alpha})`
  const cleaned = String(hex).replace('#', '')
  const bigint = parseInt(cleaned, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
