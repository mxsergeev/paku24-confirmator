/**
 * Simple error constructor for errors with custom names.
 * @param {string} name - An error name
 * @param {string} [message=undefined] - An optional error message.
 */

export default function newErrorWithCustomName(name, message = undefined) {
  const error = new Error(message)
  error.name = name

  return error
}
