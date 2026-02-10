const { chunkMessageForSending, sendSmsInChunks } = require('../modules/sms/sms.helpers')

describe('SMS chunking helpers', () => {
  test('keeps multi-part GSM message within three-part batches', () => {
    const longMessage = 'A'.repeat(500)
    const { chunks, totalSegments } = chunkMessageForSending(longMessage)

    expect(totalSegments).toBeGreaterThan(3)
    expect(chunks.length).toBe(Math.ceil(totalSegments / 3))
    expect(chunks[0].length).toBeLessThanOrEqual(3 * 153)
    expect(chunks.slice(1).join('').length).toBe(longMessage.length - chunks[0].length)
  })

  test('treats unicode-only payload as UCS-2 segments', () => {
    const unicodeMessage = '🚚'.repeat(150)
    const { chunks } = chunkMessageForSending(unicodeMessage)
    const codePointCount = [...chunks[0]].length

    expect(codePointCount).toBeLessThanOrEqual(3 * 67)
  })

  test('returns a single chunk for short payloads', () => {
    const shortMessage = 'Kiitos varauksestasi'
    const { chunks, totalSegments } = chunkMessageForSending(shortMessage)

    expect(totalSegments).toBe(1)
    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toBe(shortMessage)
  })

  test('throws when SMS exceeds default chunk limit', async () => {
    const longMessage = 'A'.repeat(1400)
    await expect(sendSmsInChunks('0412345678', longMessage)).rejects.toThrow('exceeds the limit')
  })
})
