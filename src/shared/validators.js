export function isObjectId(str) {
  return /^[a-fA-F0-9]{24}$/.test(str)
}
