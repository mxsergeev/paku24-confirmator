export const isNode = () =>
  typeof process !== 'undefined' &&
  typeof process.versions === 'object' &&
  typeof process.versions.node !== 'undefined'
